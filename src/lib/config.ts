import { getCollection, getEntry } from 'astro:content';

/** Lee la configuración de src/config/ y falla con un mensaje claro si falta algo. */

export async function getContacto() {
	const entry = await getEntry('contacto', 'contacto');
	if (!entry) throw new Error('No se pudo leer src/config/contacto.yaml');
	return entry.data;
}

export async function getHorario() {
	const entry = await getEntry('horario', 'horario');
	if (!entry) throw new Error('No se pudo leer src/config/horario.yaml');
	return entry.data;
}

export async function getMarcas() {
	const entry = await getEntry('marcas', 'marcas');
	if (!entry) throw new Error('No se pudo leer src/config/marcas.yaml');
	return entry.data;
}

export async function getSecciones() {
	const all = await getCollection('secciones');
	const map = Object.fromEntries(all.map((s) => [s.id, s.data]));
	const required = ['inicio', 'nosotros', 'servicios', 'marcas', 'promociones', 'actualidad', 'contacto'] as const;
	for (const key of required) {
		if (!map[key]) throw new Error(`Falta la sección "${key}" en src/config/secciones.yaml`);
	}
	return map as Record<(typeof required)[number], (typeof all)[number]['data']>;
}

export function whatsappUrl(c: Awaited<ReturnType<typeof getContacto>>) {
	const text = c.whatsapp.mensaje ? `?text=${encodeURIComponent(c.whatsapp.mensaje)}` : '';
	return `https://wa.me/${c.whatsapp.numero}${text}`;
}

const DIAS = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

/** JSON-LD schema.org/Pharmacy generado desde contacto.yaml y horario.yaml */
export function pharmacyJsonLd(
	c: Awaited<ReturnType<typeof getContacto>>,
	h: Awaited<ReturnType<typeof getHorario>>,
	site: URL | undefined,
	image: string,
) {
	const year = new Date().getFullYear();
	const opening = h.temporadas.flatMap((t) => {
		const crosses = t.vigencia.hasta < t.vigencia.desde;
		const validFrom = `${year}-${t.vigencia.desde}`;
		const validThrough = `${crosses ? year + 1 : year}-${t.vigencia.hasta}`;
		return t.franjas
			.filter((f) => !f.cerrado)
			.map((f) => ({
				'@type': 'OpeningHoursSpecification',
				dayOfWeek: f.dias_semana.map((d) => `https://schema.org/${DIAS[d]}`),
				opens: f.abre,
				closes: f.cierra,
				validFrom,
				validThrough,
			}));
	});
	return {
		'@context': 'https://schema.org',
		'@type': 'Pharmacy',
		name: c.nombre,
		image: site ? new URL(image, site).href : image,
		url: site?.href,
		telephone: c.telefono.numero,
		email: c.email,
		address: {
			'@type': 'PostalAddress',
			streetAddress: c.direccion.calle,
			addressLocality: c.direccion.localidad,
			postalCode: c.direccion.cp,
			addressRegion: c.direccion.provincia,
			addressCountry: 'ES',
		},
		hasMap: c.maps_url,
		sameAs: [c.instagram.url],
		openingHoursSpecification: opening,
	};
}
