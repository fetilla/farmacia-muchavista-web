/**
 * Motor del vídeo de fondo por secciones (adaptado del motor del skill scroll-world).
 *
 * - Cada sección ([data-chapter]) declara su tramo con data-video-start / data-video-end.
 *   El tramo de una sección es el vuelo de cámara desde su escena hasta la siguiente,
 *   así que el fotograma de reposo de cada sección es su data-video-start.
 * - Sección activa: la última cuyo borde superior ha pasado la mitad de la pantalla
 *   (el mismo criterio que marca la sección en el menú). En escritorio paso a paso se
 *   usa la posición de destino del deslizamiento, para que vídeo y página vayan a la vez.
 * - Al entrar en otra sección hacia delante, el vídeo se reproduce en ~0,85 s, lo que tarda la página en deslizarse (~0,6 s en móvil; play nativo, lo
 *   más fluido en todos los navegadores) hasta su fotograma, rápido al principio y
 *   frenando al llegar. Hacia atrás no se puede reproducir: se recorre fijando
 *   currentTime. Si el navegador bloquea play() (iOS en ahorro de energía), también
 *   hacia delante se recorre fijando currentTime.
 * - La última sección no tiene siguiente: su tramo avanza con el scroll (en escritorio
 *   paso a paso, al pasar al final de la página, con el vídeo sobre el pie).
 * - Carga el vídeo como Blob (siempre se puede saltar a cualquier punto aunque
 *   el servidor no admita peticiones por rangos).
 * - Móvil en vertical: recorte vertical del máster (608×1080) con todos los
 *   fotogramas clave. Móvil/tablet en horizontal (≤ 1024 px o táctil): 540p con todos
 *   los fotogramas clave. Escritorio: 1080p con un fotograma clave cada 6.
 * - Coalesce de seeks: nunca pide un nuevo currentTime mientras el decodificador
 *   sigue buscando (evita congelaciones en móviles al hacer scroll rápido).
 * - iOS: mantiene el póster hasta que el vídeo pinta un fotograma y "ceba" el
 *   vídeo con play→pause en el primer toque.
 * - prefers-reduced-motion o error de carga: se queda el póster fijo.
 */

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));

const FPS = 24;
/**
 * Ritmo de las transiciones:
 * - rateMax / rateMin: velocidad máxima y mínima (segundos de vídeo por segundo).
 * - rateK: cuánto frena al acercarse (velocidad = segundos que faltan × rateK).
 * - longJump: a partir de cuántos segundos de distancia se corta en vez de recorrerlo entero.
 * - longJumpTail: segundos que se animan al final de ese corte.
 * Escritorio: ~0,85 s por tramo, a la vez que el deslizamiento de section-pager.ts.
 * Móvil: ~0,6 s por tramo y, si el scroll rápido deja al vídeo más de un tramo atrás, corta
 * hasta cerca del destino (su vídeo tiene todos los fotogramas clave: saltar es barato).
 */
const PACE = {
	desktop: { rateMax: 8, rateMin: 3, rateK: 5, longJump: 7.5, longJumpTail: 3 },
	mobile: { rateMax: 10, rateMin: 4, rateK: 9, longJump: 5.5, longJumpTail: 1.5 },
};

export function mountScrollWorld(root: HTMLElement) {
	const video = root.querySelector<HTMLVideoElement>('[data-world-video]');
	if (!video) return;

	const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
	const coarse = window.matchMedia('(hover: none) and (pointer: coarse)').matches;
	const small = window.matchMedia('(max-width: 1024px)');
	const isMobile = () => coarse || small.matches;

	type Stop = { el: HTMLElement; t0: number; t1: number };
	let stops: Stop[] = [];
	let target = 0;
	let cur = 0;
	let ready = false;
	let canPlay = true;
	let playing = false;
	let laidOutW = window.innerWidth;

	function layout() {
		laidOutW = window.innerWidth;
		stops = Array.from(root.querySelectorAll<HTMLElement>('[data-chapter]'))
			.filter((el) => el.dataset.videoStart !== undefined && el.dataset.videoEnd !== undefined)
			.map((el) => ({ el, t0: Number(el.dataset.videoStart), t1: Number(el.dataset.videoEnd) }));
		read();
	}

	/** Destino del deslizamiento en curso del paso a paso (section-pager.ts), o null. */
	let pagerY: number | null = null;
	window.addEventListener('section-pager:go', (e) => {
		pagerY = (e as CustomEvent<{ y: number | null }>).detail.y;
		read();
	});

	/** Posición de scroll (o la de destino, si la página se está deslizando) → segundo del vídeo. */
	function read() {
		if (!stops.length) return;
		const vh = window.innerHeight;
		// Desplazamiento entre la posición actual y la de destino
		const shift = pagerY === null ? 0 : pagerY - window.scrollY;
		const top = (el: HTMLElement) => el.getBoundingClientRect().top - shift;
		let i = 0;
		stops.forEach((s, k) => {
			if (top(s.el) <= vh * 0.5) i = k;
		});
		const s = stops[i];
		if (i < stops.length - 1) {
			target = s.t0;
			return;
		}
		// Última sección: su tramo avanza con el scroll. En escritorio paso a paso, mientras
		// se pasa al final de la página; si no, desde la mitad de la pantalla hasta su final
		const r = { top: top(s.el), height: s.el.getBoundingClientRect().height };
		const p = document.documentElement.classList.contains('is-paged')
			? clamp(-r.top / Math.max(r.height - vh * 0.5, 1)) // termina al llegar al final de la página
			: clamp((vh * 0.5 - r.top) / Math.max(r.height - vh * 0.5, 1));
		target = s.t0 + p * (s.t1 - s.t0);
	}

	function seek(t: number) {
		try {
			video!.currentTime = t;
		} catch {}
	}

	function stopPlaying() {
		if (!playing) return;
		playing = false;
		video!.pause();
	}

	let last = 0;
	let dt = 0;
	function tick(ms: number) {
		// Segundos desde el fotograma anterior (acotado: tras una pestaña en segundo plano no hay salto)
		dt = last ? Math.min((ms - last) / 1000, 0.1) : 1 / 60;
		last = ms;
		if (ready) step();
		requestAnimationFrame(tick);
	}

	function step() {
		const v = video!;
		const dur = v.duration || 1;
		const goal = clamp(target, 0, dur - 0.05);
		let now = v.currentTime;
		let diff = goal - now;
		const mobile = isMobile();
		const pace = mobile ? PACE.mobile : PACE.desktop;

		// Salto largo (Inicio/Fin, menú, scroll rápido en móvil): corta hasta cerca del destino y anima solo el final
		if (Math.abs(diff) > pace.longJump && !v.seeking) {
			stopPlaying();
			now = cur = goal - Math.sign(diff) * pace.longJumpTail;
			diff = goal - now;
			seek(now);
			return;
		}

		// Hacia delante: reproducción nativa
		if (canPlay && diff > 1 / FPS) {
			if (v.seeking) return;
			const rate = Math.round(clamp(diff * pace.rateK, pace.rateMin, pace.rateMax) * 4) / 4;
			if (v.playbackRate !== rate) v.playbackRate = rate;
			if (!playing) {
				playing = true;
				const p = v.play();
				p?.catch(() => {
					// Reproducción bloqueada: se recorre fijando currentTime
					playing = false;
					canPlay = false;
				});
			}
			cur = now;
			return;
		}

		if (playing) {
			// Ha llegado (o se ha pasado por poco): se para y se ajusta al fotograma exacto.
			// Si el usuario ha vuelto hacia atrás, sigue el recorrido de abajo.
			stopPlaying();
			cur = v.currentTime;
			if (Math.abs(goal - cur) < 3 / FPS) {
				cur = goal;
				seek(goal);
			}
			return;
		}

		// Hacia atrás (o sin play): se recorre fijando currentTime, con la misma curva de
		// velocidad que hacia delante para que dure lo mismo en todos los navegadores
		// (el tiempo virtual avanza aunque el decodificador siga buscando; el salto se pide al terminar)
		const gap = goal - cur;
		const speed = clamp(Math.abs(gap) * pace.rateK, pace.rateMin, pace.rateMax);
		cur += Math.sign(gap) * Math.min(Math.abs(gap), speed * dt);
		if (Math.abs(goal - cur) < 0.5 / FPS) cur = goal;
		if (v.seeking) return;
		let t = cur;
		// En móvil: solo fotogramas exactos, para no pedir saltos que no cambian la imagen
		if (mobile) t = Math.round(t * FPS) / FPS + 0.001;
		if (Math.abs(now - t) > (mobile ? 0.5 / FPS : 0.012)) seek(t);
	}

	let userReady = false;
	function prime() {
		if (!isMobile() || !ready || playing) return;
		try {
			const p = video!.play();
			p?.then(() => {
				if (!playing) video!.pause();
				canPlay = true;
			}).catch(() => {});
		} catch {}
	}

	/** Móvil en vertical: recorte vertical a resolución completa; móvil/tablet en horizontal: 540p; escritorio: 1080p. */
	const portrait = window.matchMedia('(orientation: portrait)');
	function pickSrc() {
		if (isMobile() && portrait.matches) return video!.dataset.srcPortrait || video!.dataset.srcMobile;
		return isMobile() ? video!.dataset.srcMobile : video!.dataset.srcDesktop;
	}

	let loadedSrc = '';
	let blobUrl = '';
	video.muted = true;
	video.playsInline = true;
	video.addEventListener('loadedmetadata', () => {
		ready = true;
		playing = false;
		read();
		// Al cargar se coloca directamente en su sitio, sin animar desde el principio
		cur = clamp(target, 0, (video!.duration || 1) - 0.05);
		seek(cur);
		if (userReady) prime();
	});
	// Solo se oculta el póster cuando ya hay un fotograma pintado
	video.addEventListener('seeked', () => root.classList.add('has-video'));
	video.addEventListener('playing', () => root.classList.add('has-video'));
	video.addEventListener('error', () => root.classList.remove('has-video'));
	// Si el navegador pausa el vídeo por su cuenta (pestaña en segundo plano), se retoma en el siguiente fotograma
	video.addEventListener('pause', () => {
		playing = false;
	});

	function load() {
		const src = pickSrc();
		if (!src || src === loadedSrc) return;
		loadedSrc = src;
		const attach = (url: string) => {
			if (loadedSrc !== src) return; // se pidió otro vídeo mientras se descargaba este
			ready = false;
			stopPlaying();
			if (blobUrl) URL.revokeObjectURL(blobUrl);
			blobUrl = url.startsWith('blob:') ? url : '';
			// Firefox respeta preload="none" y no llegaría a cargar ni los metadatos
			video!.preload = 'auto';
			video!.src = url;
		};
		fetch(src)
			.then((r) => (r.ok ? r.blob() : Promise.reject(new Error(String(r.status)))))
			.then((blob) => attach(URL.createObjectURL(blob)))
			.catch(() => attach(src));
	}

	window.addEventListener('scroll', read, { passive: true });
	window.addEventListener('resize', () => {
		// En móviles la barra de direcciones cambia el alto al hacer scroll: se ignora
		if (coarse && window.innerWidth === laidOutW) return;
		layout();
		if (!reduce && loadedSrc) load(); // al girar el móvil puede tocar otra versión del vídeo
	});
	window.addEventListener('orientationchange', layout);
	window.addEventListener('load', layout);
	new ResizeObserver(() => read()).observe(root);
	layout();

	if (reduce) return;

	const onFirstGesture = () => {
		if (userReady) return;
		userReady = true;
		prime();
	};
	window.addEventListener('pointerdown', onFirstGesture, { once: true, passive: true });
	window.addEventListener('touchstart', onFirstGesture, { once: true, passive: true });

	// El póster es lo primero que se pinta; el vídeo se pide justo después
	const start = () => {
		load();
		requestAnimationFrame(tick);
	};
	if (document.readyState === 'complete') start();
	else window.addEventListener('load', start, { once: true });
}
