# Farmacia Muchavista · web

Landing page de Farmacia Muchavista (Playa Muchavista, El Campello), hecha con [Astro](https://docs.astro.build).
Al hacer scroll, un vídeo de fondo recorre la farmacia desde la entrada hasta el mostrador.

## Puesta en marcha

```sh
pnpm install
astro dev --background   # servidor en http://localhost:4321 (astro dev status / logs / stop)
pnpm check               # comprobación de tipos
pnpm build               # genera la web estática en dist/
pnpm preview             # sirve dist/ para revisarla
```

Para probar en un móvil de la misma red: `pnpm astro dev --host` y abre en el móvil la dirección "Network" que aparece.

## Editar contenidos

**Todo lo editable está en [`src/config/`](src/config/README.md):** contacto, horario, marcas y textos de cada sección.
No hace falta tocar componentes. Consulta [`src/config/README.md`](src/config/README.md).

## Estructura

```text
public/video/          vídeo de fondo: 1080p escritorio, vertical 608×1080 para móvil en vertical, 540p para móvil/tablet en horizontal, y póster
src/config/            YAML de configuración (contacto, horario, marcas, secciones)
src/content.config.ts  carga y validación de los YAML
src/assets/logo.svg    logo vectorial (trazado del PNG original)
src/assets/marcas/     fotos de marcas (opcional)
src/components/        cabecera, secciones, horario, marcas, contacto, pie…
src/scripts/           motor de scroll del vídeo y animaciones de aparición
src/pages/             inicio, páginas legales y 404
plans/                 plan de la landing y prompts de generación de los clips
```

## Vídeo

`public/video/` contiene la versión final (v4) del recorrido, ya comprimida para web. No se genera nada en el build.
El motor (`src/scripts/scroll-world.ts`) asocia cada sección a un tramo del vídeo según `video: { desde, hasta }` en `src/config/secciones.yaml`.
Con "reducir movimiento" activado en el sistema, se muestra el póster fijo.

Cómo se generaron los clips: [`plans/landing-scroll-world.md`](plans/landing-scroll-world.md), sección 7.
