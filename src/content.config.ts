import { existsSync, promises as fs } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineCollection } from 'astro:content';
import type { Loader, LoaderContext } from 'astro/loaders';
import { z } from 'astro/zod';
import { parse as parseYaml } from 'yaml';

/**
 * Toda la configuración editable de la web vive en src/config/*.yaml.
 * Cada fichero es una colección validada con zod: si un YAML tiene un error de
 * sintaxis o le falta un campo, el build se detiene indicando fichero y campo.
 */

type Shape = 'single' | 'list' | 'map';

function slugify(text: string) {
	return text
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '_')
		.replace(/^_|_$/g, '');
}

/**
 * - single: el YAML es un objeto y se guarda como una sola entrada (id = nombre del fichero)
 * - list:   el YAML es una lista; el id sale de "id" o de "nombre"
 * - map:    el YAML es un objeto; cada clave es una entrada (se conserva el orden)
 */
function yamlConfig(fileName: string, shape: Shape): Loader {
	const id = fileName.replace(/\.ya?ml$/, '');
	const relPath = `src/config/${fileName}`;

	async function sync(filePath: string, { parseData, store }: LoaderContext) {
		const text = await fs.readFile(filePath, 'utf-8');
		let data: unknown;
		try {
			data = parseYaml(text);
		} catch (error) {
			throw new Error(`${relPath} tiene un error de formato YAML: ${(error as Error).message}`);
		}

		let entries: [string, Record<string, unknown>][];
		if (shape === 'single') {
			if (!data || typeof data !== 'object' || Array.isArray(data)) {
				throw new Error(`${relPath} debe ser un objeto con campos (clave: valor).`);
			}
			entries = [[id, data as Record<string, unknown>]];
		} else if (shape === 'list') {
			if (!Array.isArray(data)) throw new Error(`${relPath} debe ser una lista de elementos que empiezan por "- ".`);
			const seen = new Set<string>();
			entries = data.map((item, i) => {
				const raw = (item ?? {}) as Record<string, unknown>;
				const key = String(raw.id ?? (raw.nombre ? slugify(String(raw.nombre)) : `item_${i + 1}`));
				if (seen.has(key)) throw new Error(`${relPath}: el elemento "${raw.nombre ?? key}" está repetido.`);
				seen.add(key);
				return [key, { ...raw, orden: i }];
			});
		} else {
			if (!data || typeof data !== 'object' || Array.isArray(data)) {
				throw new Error(`${relPath} debe ser un objeto con una clave por sección.`);
			}
			entries = Object.entries(data as Record<string, Record<string, unknown>>).map(([key, value], i) => [
				key,
				{ ...(value ?? {}), orden: i },
			]);
		}

		store.clear();
		for (const [key, raw] of entries) {
			const parsed = await parseData({ id: key, data: raw, filePath });
			store.set({ id: key, data: parsed, filePath: relPath });
		}
	}

	return {
		name: `config-${id}`,
		load: async (context) => {
			const url = new URL(relPath, context.config.root);
			if (!existsSync(url)) throw new Error(`No se encuentra ${relPath}.`);
			const filePath = fileURLToPath(url);
			await sync(filePath, context);
			context.watcher?.add(filePath);
			context.watcher?.on('change', async (changed) => {
				if (changed !== filePath) return;
				try {
					await sync(filePath, context);
					context.logger.info(`${relPath} recargado`);
				} catch (error) {
					context.logger.error((error as Error).message);
				}
			});
		},
	};
}

const hora = z.string().regex(/^\d{2}:\d{2}$/, 'usa el formato HH:MM, por ejemplo "09:00"');
const mesDia = z.string().regex(/^\d{2}-\d{2}$/, 'usa el formato MM-DD, por ejemplo "07-01"');

const contacto = defineCollection({
	loader: yamlConfig('contacto.yaml', 'single'),
	schema: z.object({
		nombre: z.string(),
		titular: z.string().optional(),
		direccion: z.object({
			calle: z.string(),
			zona: z.string(),
			cp: z.string(),
			localidad: z.string(),
			provincia: z.string(),
		}),
		maps_url: z.url(),
		whatsapp: z.object({
			visible: z.string(),
			numero: z.string().regex(/^\d{9,15}$/, 'solo dígitos con prefijo de país, sin "+" ni espacios'),
			mensaje: z.string().optional(),
		}),
		telefono: z.object({
			visible: z.string(),
			numero: z.string().regex(/^\+\d{9,15}$/, 'empieza por "+" y sin espacios, por ejemplo "+34965651554"'),
		}),
		instagram: z.object({ usuario: z.string(), url: z.url() }),
		email: z.email(),
	}),
});

const franja = z
	.object({
		dias: z.string(),
		horas: z.string(),
		dias_semana: z.array(z.number().int().min(1).max(7)).min(1),
		abre: hora.optional(),
		cierra: hora.optional(),
		cerrado: z.boolean().default(false),
	})
	.refine((f) => f.cerrado || (f.abre && f.cierra), {
		message: 'cada franja abierta necesita "abre" y "cierra" (o "cerrado: true")',
	});

const horario = defineCollection({
	loader: yamlConfig('horario.yaml', 'single'),
	schema: z.object({
		temporadas: z
			.array(
				z.object({
					id: z.string(),
					nombre: z.string(),
					vigencia: z.object({ desde: mesDia, hasta: mesDia }),
					franjas: z.array(franja).min(1),
				}),
			)
			.min(1),
	}),
});

const marcas = defineCollection({
	loader: yamlConfig('marcas.yaml', 'list'),
	schema: z.object({
		nombre: z.string(),
		categoria: z.string(),
		descripcion: z.string(),
		foto: z.string().optional(),
		provisional: z.boolean().default(false),
		orden: z.number(),
	}),
});

const tarjeta = z.object({
	titulo: z.string(),
	texto: z.string().optional(),
	icono: z.string().optional(),
	etiqueta: z.string().optional(),
	fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'usa el formato AAAA-MM-DD').optional(),
});

const secciones = defineCollection({
	loader: yamlConfig('secciones.yaml', 'map'),
	schema: z.object({
		menu: z.string(),
		antetitulo: z.string().optional(),
		titulo: z.string(),
		subtitulo: z.string().optional(),
		parrafos: z.array(z.string()).optional(),
		frase_destacada: z.string().optional(),
		tarjetas: z.array(tarjeta).optional(),
		video: z
			.object({ desde: z.number().min(0), hasta: z.number().min(0) })
			.refine((v) => v.hasta > v.desde, { message: '"hasta" debe ser mayor que "desde"' })
			.optional(),
		provisional: z.boolean().default(false),
		orden: z.number(),
	}),
});

export const collections = { contacto, horario, marcas, secciones };
