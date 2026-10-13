/**
 * Paso a paso por secciones en escritorio (ratón o trackpad, pantalla > 1024 px).
 *
 * - Cada gesto de rueda/trackpad o tecla (flechas, AvPág/RePág, espacio, Inicio/Fin)
 *   lleva a la sección siguiente o anterior con un deslizamiento de ~0,9 s. Avisa al
 *   vídeo de fondo (scroll-world.ts, evento section-pager:go) del destino, para que
 *   ambos arranquen y lleguen a la vez.
 * - Nada se bloquea: un gesto durante un deslizamiento cuenta desde el destino de ese
 *   deslizamiento, en cualquier sentido (dos gestos hacia abajo avanzan dos secciones;
 *   uno hacia arriba vuelve).
 * - Secciones más altas que la pantalla: dentro de ellas el scroll es el normal hasta
 *   llegar a su final (o a su principio, subiendo); el siguiente gesto salta.
 * - Después de la última sección hay un paso más: el final de la página, con el último
 *   tramo del vídeo en al menos 2/3 de la pantalla y el pie entero debajo.
 * - Trackpad: tras soltar los dedos el sistema sigue mandando eventos de inercia durante
 *   casi un segundo. No son gestos del usuario y se ignoran (si no, un gesto saltaría
 *   varias secciones). Cuenta como gesto nuevo: una pausa, un empujón más fuerte que la
 *   inercia, un cambio de sentido o un golpe de rueda de ratón.
 * - Móvil, tablet, pantallas táctiles y prefers-reduced-motion: scroll normal.
 *   Con el paso a paso activo, <html> lleva la clase is-paged (ver global.css).
 */

const DURATION = 900;
/** Desplazamiento acumulado (px) para que un gesto cuente como cambio de sección. */
const THRESHOLD = 50;
/** Pausa (ms) sin eventos de rueda que da por terminado un gesto. */
const GESTURE_GAP = 220;
/** Golpe de rueda de ratón: desplazamiento grande y separado del anterior al menos esto (ms). */
const NOTCH_PX = 50;
const NOTCH_GAP = 90;
/** Margen (px) para considerar que se está en el borde de una sección. */
const EDGE = 4;
/** Aire (px) que se deja bajo el contenido al llegar al final de una sección alta. */
const CONTENT_GAP = 16;

const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
/** Al encadenar un deslizamiento con otro en marcha no se frena a cero: solo sale frenando. */
const easeOut = (t: number) => 1 - (1 - t) ** 3;

export function mountSectionPager() {
	const query = window.matchMedia(
		'(hover: hover) and (pointer: fine) and (min-width: 1025px) and (prefers-reduced-motion: no-preference)',
	);
	const root = document.documentElement;

	let animating = false;
	/** Destino del deslizamiento en curso. */
	let animTo = 0;
	let animId = 0;

	/**
	 * Estado del gesto de rueda en curso:
	 * - collecting: gesto nuevo, se acumula desplazamiento hasta THRESHOLD para saltar.
	 * - inside: gesto recorriendo una sección alta con scroll normal.
	 * - spent: el gesto ya ha hecho su salto (o ha llegado al borde); lo que llegue de él
	 *   es inercia y se ignora.
	 */
	let mode: 'collecting' | 'inside' | 'spent' = 'collecting';
	let lastWheel = 0;
	let lastAbs = 0;
	let lastDir: 1 | -1 = 1;
	let acc = 0;

	const enabled = () => query.matches;
	const apply = () => root.classList.toggle('is-paged', enabled());
	apply();
	query.addEventListener('change', apply);

	type Page = { top: number; end: number };

	/** Tramos de scroll de cada página: [principio, último punto antes de saltar]. */
	function pages(): Page[] {
		const vh = window.innerHeight;
		const max = document.documentElement.scrollHeight - vh;
		const sections = Array.from(document.querySelectorAll<HTMLElement>('[data-chapter]'));
		const list = sections.map((el) => {
			const r = el.getBoundingClientRect();
			const top = Math.round(r.top + window.scrollY);
			// Lo que cuenta es el contenido, no el margen inferior de la sección
			const content = el.querySelector(':scope > .container')?.getBoundingClientRect();
			const bottom = content ? content.bottom + CONTENT_GAP : r.bottom;
			const overflow = Math.round(bottom - r.top - vh);
			return { top, end: overflow > CONTENT_GAP ? top + overflow : top };
		});
		// Último paso: el pie de página (lo que queda por debajo de la última sección)
		const last = list[list.length - 1];
		if (last && max > last.end + EDGE) list.push({ top: max, end: max });
		return list.map((p) => ({ top: Math.min(p.top, max), end: Math.min(p.end, max) }));
	}

	function current(list: Page[], y: number) {
		let i = 0;
		list.forEach((p, k) => {
			if (p.top <= y + EDGE) i = k;
		});
		return i;
	}

	type Move = { inside: true; bound: number } | { inside: false; to: number | null };

	/**
	 * Desde la posición y (la actual, o el destino del deslizamiento en curso): dentro de
	 * una sección alta, scroll normal hasta su borde; si no, destino del salto (o null).
	 */
	function decide(dir: 1 | -1, y: number): Move | null {
		const list = pages();
		if (!list.length) return null;
		const i = current(list, y);
		const p = list[i];
		if (dir > 0) {
			if (y < p.end - EDGE) return { inside: true, bound: p.end };
			const next = list[i + 1];
			return { inside: false, to: next ? next.top : null };
		}
		if (y > p.top + EDGE) return { inside: true, bound: p.top };
		const prev = list[i - 1];
		// Al subir a una sección alta se llega a su final, para seguir leyéndola hacia arriba
		return { inside: false, to: prev ? prev.end : null };
	}

	/** Posición desde la que cuenta un gesto: el destino del deslizamiento en curso, o la actual. */
	const base = () => (animating ? animTo : window.scrollY);

	function animateTo(to: number) {
		const from = window.scrollY;
		if (Math.abs(to - from) < 1) return;
		const chained = animating;
		const id = ++animId;
		animating = true;
		animTo = to;
		guard = null;
		// El vídeo (scroll-world.ts) arranca ya hacia la escena de destino, sin esperar al scroll
		window.dispatchEvent(new CustomEvent('section-pager:go', { detail: { y: to } }));
		const t0 = performance.now();
		const ease = chained ? easeOut : easeInOut;
		const frame = (now: number) => {
			if (id !== animId) return; // sustituido por otro deslizamiento
			const k = Math.min((now - t0) / DURATION, 1);
			window.scrollTo({ top: from + (to - from) * ease(k), behavior: 'instant' });
			if (k < 1) requestAnimationFrame(frame);
			else {
				animating = false;
				window.dispatchEvent(new CustomEvent('section-pager:go', { detail: { y: null } }));
			}
		};
		requestAnimationFrame(frame);
	}

	/** Si el gesto es sobre algo con scroll propio en esa dirección (p. ej. un menú), se le deja. */
	function scrollsInside(target: EventTarget | null, dir: 1 | -1) {
		let el = target instanceof Element ? target : null;
		while (el && el !== document.body && el !== root) {
			const s = getComputedStyle(el);
			if (/(auto|scroll)/.test(s.overflowY) && el.scrollHeight > el.clientHeight + 1) {
				if (dir > 0 ? el.scrollTop + el.clientHeight < el.scrollHeight - 1 : el.scrollTop > 0) return true;
			}
			el = el.parentElement;
		}
		return false;
	}

	const blocked = () => root.style.overflow === 'hidden'; // menú abierto

	// Firefox (y otros con scroll suave) siguen animando el scroll de la rueda después del
	// evento: mientras dura un gesto dentro de una sección alta, no se deja pasar de su borde
	let guard: { bound: number; dir: 1 | -1 } | null = null;
	let guardTimer = 0;
	window.addEventListener(
		'scroll',
		() => {
			if (!guard || animating) return;
			const y = window.scrollY;
			if (guard.dir > 0 ? y > guard.bound + 1 : y < guard.bound - 1) {
				window.scrollTo({ top: guard.bound, behavior: 'instant' });
			}
		},
		{ passive: true },
	);

	/** Paso dentro de una sección alta mientras otro deslizamiento sigue en marcha. */
	function stepInside(dir: 1 | -1, from: number, bound: number) {
		const step = window.innerHeight * 0.85 * dir;
		animateTo(dir > 0 ? Math.min(from + step, bound) : Math.max(from + step, bound));
	}

	window.addEventListener(
		'wheel',
		(e) => {
			if (!enabled() || blocked() || e.ctrlKey) return;
			if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return; // gesto horizontal (carrusel)
			const now = performance.now();
			const gap = now - lastWheel;
			const abs = Math.abs(e.deltaY);
			const dir: 1 | -1 = e.deltaY > 0 ? 1 : -1;
			const px = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? window.innerHeight : 1);

			// ¿Empieza un gesto nuevo? (si no, es la continuación o la inercia del anterior)
			const fresh =
				gap > GESTURE_GAP ||
				dir !== lastDir ||
				(abs > lastAbs * 2.5 && abs > 30) ||
				(e.deltaMode !== 0 || abs >= NOTCH_PX ? gap > NOTCH_GAP && abs >= lastAbs : false);
			lastWheel = now;
			lastAbs = abs;
			lastDir = dir;
			if (fresh) {
				mode = 'collecting';
				acc = 0;
			}

			if (scrollsInside(e.target, dir)) return;
			if (mode === 'spent') {
				e.preventDefault();
				return;
			}

			const from = base();
			const move = decide(dir, from);
			if (!move) return;

			if (move.inside) {
				if (animating) {
					// Llega un gesto mientras se desliza hacia una sección alta: un paso dentro de ella
					e.preventDefault();
					mode = 'spent';
					stepInside(dir, from, move.bound);
					return;
				}
				mode = 'inside';
				acc = 0;
				guard = { bound: move.bound, dir };
				clearTimeout(guardTimer);
				guardTimer = window.setTimeout(() => (guard = null), 600);
				// Scroll normal, pero sin pasarse del borde de la sección
				const y = window.scrollY;
				if (dir > 0 ? y + px > move.bound : y + px < move.bound) {
					e.preventDefault();
					window.scrollTo({ top: move.bound, behavior: 'instant' });
				}
				return;
			}

			e.preventDefault();
			// El gesto venía de recorrer una sección alta y ha llegado a su borde: se para ahí
			if (mode === 'inside') {
				mode = 'spent';
				return;
			}
			if (move.to === null) return;
			acc += px;
			if (Math.abs(acc) < THRESHOLD) return;
			acc = 0;
			mode = 'spent';
			animateTo(move.to);
		},
		{ passive: false },
	);

	window.addEventListener('keydown', (e) => {
		if (!enabled() || blocked() || e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
		const t = e.target as HTMLElement | null;
		if (t?.closest('input, textarea, select, [contenteditable=""], [contenteditable="true"]')) return;
		let dir: 1 | -1;
		switch (e.key) {
			case 'ArrowDown':
			case 'PageDown':
				dir = 1;
				break;
			case 'ArrowUp':
			case 'PageUp':
				dir = -1;
				break;
			case ' ':
				// En botones y enlaces el espacio los activa
				if (t?.closest('button, a, summary, [role="button"]')) return;
				dir = e.shiftKey ? -1 : 1;
				break;
			case 'Home':
			case 'End': {
				e.preventDefault();
				const list = pages();
				animateTo(e.key === 'Home' ? 0 : list[list.length - 1].top);
				return;
			}
			default:
				return;
		}
		const from = base();
		const move = decide(dir, from);
		if (!move) return;
		if (move.inside) {
			// Flechas sin deslizamiento en marcha: scroll normal. Si no, una pantalla, sin pasarse del borde
			if (e.key.startsWith('Arrow') && !animating) return;
			e.preventDefault();
			stepInside(dir, from, move.bound);
			return;
		}
		e.preventDefault();
		if (move.to !== null) animateTo(move.to);
	});
}
