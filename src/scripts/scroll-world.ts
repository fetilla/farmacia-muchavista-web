/**
 * Motor de scroll-scrub para un único vídeo (adaptado del motor del skill scroll-world).
 *
 * - El scroll no reproduce el vídeo: fija video.currentTime. Cada sección
 *   ([data-chapter]) indica su tramo con data-video-start / data-video-end.
 * - Carga el vídeo como Blob (siempre se puede saltar a cualquier punto aunque
 *   el servidor no admita peticiones por rangos).
 * - Móvil/tablet (≤ 1024 px o táctil): 540p con todos los fotogramas clave
 *   (cada salto decodifica un solo fotograma) y saltos ajustados a fotograma exacto.
 *   Escritorio: 1080p.
 * - Coalesce de seeks: nunca pide un nuevo currentTime mientras el decodificador
 *   sigue buscando (evita congelaciones en móviles al hacer scroll rápido).
 * - iOS: mantiene el póster hasta que el vídeo pinta un fotograma y "ceba" el
 *   vídeo con play→pause en el primer toque.
 * - prefers-reduced-motion o error de carga: se queda el póster fijo.
 */

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));

export function mountScrollWorld(root: HTMLElement) {
	const video = root.querySelector<HTMLVideoElement>('[data-world-video]');
	if (!video) return;

	const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
	const coarse = window.matchMedia('(hover: none) and (pointer: coarse)').matches;
	const small = window.matchMedia('(max-width: 1024px)');
	const isMobile = () => coarse || small.matches;

	type Band = { start: number; end: number; t0: number; t1: number };
	let bands: Band[] = [];
	let target = 0;
	let cur = 0;
	let ready = false;
	let laidOutW = window.innerWidth;

	function layout() {
		laidOutW = window.innerWidth;
		const vh = window.innerHeight;
		const chapters = Array.from(root.querySelectorAll<HTMLElement>('[data-chapter]'));
		bands = chapters
			.filter((el) => el.dataset.videoStart !== undefined && el.dataset.videoEnd !== undefined)
			.map((el) => {
				const top = el.getBoundingClientRect().top + window.scrollY;
				const height = el.offsetHeight;
				return {
					start: top,
					end: top + Math.max(height - vh * 0.6, vh * 0.4),
					t0: Number(el.dataset.videoStart),
					t1: Number(el.dataset.videoEnd),
				};
			});
		read();
	}

	/** Posición de scroll → segundo del vídeo (lineal dentro de cada sección). */
	function read() {
		const y = window.scrollY;
		if (!bands.length) return;
		let t = bands[0].t0;
		for (const b of bands) {
			if (y >= b.start) t = b.t0 + clamp((y - b.start) / (b.end - b.start)) * (b.t1 - b.t0);
		}
		target = t;
	}

	const FPS = 24;
	function tick() {
		if (ready && !video!.seeking) {
			const mobile = isMobile();
			cur += (target - cur) * (mobile ? 0.3 : 0.18);
			const dur = video!.duration || 1;
			let t = clamp(cur, 0, dur - 0.05);
			// En móvil: solo fotogramas exactos, para no pedir saltos que no cambian la imagen
			if (mobile) t = Math.round(t * FPS) / FPS + 0.001;
			const eps = mobile ? 0.5 / FPS : 0.012;
			if (Math.abs(video!.currentTime - t) > eps) {
				try {
					video!.currentTime = t;
				} catch {}
			}
		}
		requestAnimationFrame(tick);
	}

	let userReady = false;
	function prime() {
		if (!isMobile() || !ready) return;
		try {
			const p = video!.play();
			p?.then(() => video!.pause()).catch(() => {});
		} catch {}
	}

	function load() {
		const src = isMobile() ? video!.dataset.srcMobile : video!.dataset.srcDesktop;
		if (!src) return;
		const attach = (url: string) => {
			video!.muted = true;
			video!.playsInline = true;
			video!.src = url;
			video!.addEventListener('loadedmetadata', () => {
				ready = true;
				cur = target;
				try {
					video!.currentTime = target;
				} catch {}
				if (userReady) prime();
			});
			// Solo se oculta el póster cuando ya hay un fotograma pintado
			video!.addEventListener('seeked', () => root.classList.add('has-video'), { once: true });
			video!.addEventListener('error', () => root.classList.remove('has-video'));
		};
		fetch(src)
			.then((r) => (r.ok ? r.blob() : Promise.reject(new Error(String(r.status)))))
			.then((blob) => attach(URL.createObjectURL(blob)))
			.catch(() => attach(src));
	}

	window.addEventListener(
		'scroll',
		() => {
			read();
		},
		{ passive: true },
	);
	window.addEventListener('resize', () => {
		// En móviles la barra de direcciones cambia el alto al hacer scroll: se ignora
		if (coarse && window.innerWidth === laidOutW) return;
		layout();
	});
	window.addEventListener('orientationchange', layout);
	window.addEventListener('load', layout);
	new ResizeObserver(() => layout()).observe(root);
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
