/**
 * Paso a paso por secciones en escritorio (ratón o trackpad, pantalla > 1024 px).
 *
 * - Cada gesto de rueda/trackpad o tecla (flechas, AvPág/RePág, espacio, Inicio/Fin)
 *   lleva a la sección siguiente o anterior con un deslizamiento de ~0,9 s. Avisa al
 *   vídeo de fondo (scroll-world.ts, evento section-pager:go) del destino, para que
 *   ambos arranquen y lleguen a la vez.
 * - Secciones más altas que la pantalla: dentro de ellas el scroll es el normal hasta
 *   llegar a su final (o a su principio, subiendo); el siguiente gesto salta.
 * - Después de la última sección hay un paso más: el final de la página, con el último
 *   tramo del vídeo en al menos 2/3 de la pantalla y el pie entero debajo.
 * - Trackpad: tras un gesto llegan eventos de inercia durante casi un segundo; se
 *   ignoran hasta que hay una pausa o empieza un gesto nuevo, para no saltar varias
 *   secciones de golpe.
 * - Móvil, tablet, pantallas táctiles y prefers-reduced-motion: scroll normal.
 *   Con el paso a paso activo, <html> lleva la clase is-paged (ver global.css).
 */

const DURATION = 900;
/** Desplazamiento acumulado (px) para que un gesto cuente como cambio de sección. */
const THRESHOLD = 24;
/** Pausa (ms) sin eventos de rueda que da por terminado un gesto. */
const GESTURE_GAP = 160;
/** Margen (px) para considerar que se está en el borde de una sección. */
const EDGE = 4;
/** Aire (px) que se deja bajo el contenido al llegar al final de una sección alta. */
const CONTENT_GAP = 16;

const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

export function mountSectionPager() {
	const query = window.matchMedia(
		'(hover: hover) and (pointer: fine) and (min-width: 1025px) and (prefers-reduced-motion: no-preference)',
	);
	const root = document.documentElement;

	let animating = false;
	/** Tras un salto, se ignoran los eventos de rueda de ese mismo gesto (inercia). */
	let swallowing = false;
	let lastWheel = 0;
	let lastAbs = 0;
	let acc = 0;
	/** El gesto en curso está recorriendo una sección alta con scroll normal. */
	let insideGesture = false;

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

	/** Dentro de una sección alta: scroll normal hasta su borde. Si no, destino del salto (o null si no hay). */
	function decide(dir: 1 | -1): Move | null {
		const list = pages();
		if (!list.length) return null;
		const y = window.scrollY;
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

	function animateTo(to: number) {
		const from = window.scrollY;
		if (Math.abs(to - from) < 1) return;
		animating = true;
		guard = null;
		// El vídeo (scroll-world.ts) arranca ya hacia la escena de destino, sin esperar al scroll
		window.dispatchEvent(new CustomEvent('section-pager:go', { detail: { y: to } }));
		const t0 = performance.now();
		const frame = (now: number) => {
			const k = Math.min((now - t0) / DURATION, 1);
			window.scrollTo({ top: from + (to - from) * easeInOut(k), behavior: 'instant' });
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

	window.addEventListener(
		'wheel',
		(e) => {
			if (!enabled() || blocked() || e.ctrlKey) return;
			if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return; // gesto horizontal (carrusel)
			const now = performance.now();
			const gap = now - lastWheel;
			const abs = Math.abs(e.deltaY);
			lastWheel = now;

			if (animating) {
				e.preventDefault();
				lastAbs = abs;
				return;
			}
			if (swallowing) {
				// Sigue la inercia del gesto anterior hasta una pausa o un gesto nuevo (más fuerte)
				const fresh = gap > GESTURE_GAP || (abs > lastAbs * 1.8 && abs > 20);
				lastAbs = abs;
				if (!fresh) {
					e.preventDefault();
					return;
				}
				swallowing = false;
				insideGesture = false;
				acc = 0;
			}
			if (gap > GESTURE_GAP) {
				acc = 0;
				insideGesture = false;
			}
			lastAbs = abs;

			const dir = e.deltaY > 0 ? 1 : -1;
			if (scrollsInside(e.target, dir)) return;
			const move = decide(dir);
			if (!move) return;
			const px = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? window.innerHeight : 1);
			if (move.inside) {
				acc = 0;
				insideGesture = true;
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
			if (insideGesture && gap <= GESTURE_GAP) {
				swallowing = true;
				return;
			}
			insideGesture = false;
			if (move.to === null) return;
			acc += px;
			if (Math.abs(acc) < THRESHOLD) return;
			acc = 0;
			swallowing = true;
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
				if (animating) return;
				const list = pages();
				animateTo(e.key === 'Home' ? 0 : list[list.length - 1].top);
				return;
			}
			default:
				return;
		}
		if (animating) {
			e.preventDefault();
			return;
		}
		const move = decide(dir);
		if (!move) return;
		if (move.inside) {
			// Flechas: scroll normal. Página/espacio: una pantalla, sin pasarse del borde de la sección
			if (e.key.startsWith('Arrow')) return;
			e.preventDefault();
			const step = window.innerHeight * 0.85 * dir;
			const y = window.scrollY;
			animateTo(dir > 0 ? Math.min(y + step, move.bound) : Math.max(y + step, move.bound));
			return;
		}
		e.preventDefault();
		if (move.to !== null) animateTo(move.to);
	});
}
