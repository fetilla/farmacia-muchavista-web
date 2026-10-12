/** Aparición suave de los elementos .reveal al entrar en pantalla (IntersectionObserver). */
export function initReveal() {
	const items = document.querySelectorAll<HTMLElement>('.reveal');
	if (!('IntersectionObserver' in window)) {
		items.forEach((el) => el.classList.add('is-visible'));
		return;
	}
	const io = new IntersectionObserver(
		(entries) => {
			for (const e of entries) {
				if (e.isIntersecting) {
					e.target.classList.add('is-visible');
					io.unobserve(e.target);
				}
			}
		},
		{ rootMargin: '0px 0px -10% 0px', threshold: 0.05 },
	);
	items.forEach((el) => io.observe(el));
}
