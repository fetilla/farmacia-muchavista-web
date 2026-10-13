# Landing Farmacia Muchavista · scroll-world (Astro)

Diseña e implementa con Astro la landing page de **Farmacia Muchavista** usando el skill **scroll-world**, siguiendo todo lo que se indica abajo.

---

## 0. Restricciones (obligatorias en TODAS las fases)

- **El vídeo ya está generado.** Usa únicamente los archivos de `./public/video/`. Es la versión **v4** del recorrido por la farmacia.
- **No generes nada:** ni stills, ni clips, ni keyframes, ni conectores, ni imágenes de marca o de sección.
- **No llames a Higgsfield** (ni CLI ni MCP), **ni a Codex, Monid ni ningún otro modelo de imagen o vídeo**, ni al planificar ni al implementar.
- **No gastes créditos de Higgsfield.**
- Del skill scroll-world usa **solo** la dirección de arte, la estructura narrativa y el **motor de scroll-scrub**. Sáltate todos los pasos de entrevista para generar escenas, render de clips y facturación.
- Si algún paso del skill pide generar o llamar a un modelo, **omítelo** y usa los assets existentes. Si falta algo visual (fotos de marcas, iconos), usa placeholders hechos con código (SVG/CSS) y márcalos con `TODO`.

---

## 1. Assets disponibles

| Archivo | Uso |
|---|---|
| `public/video/farmacia-walkthrough-1080.mp4` | Vídeo de fondo en escritorio. 1920×1080, 24 fps, 35,3 s, sin audio, H.264, 15,6 MB, keyframe cada 6 fotogramas y sin B-frames (saltos más rápidos en Firefox), faststart |
| `public/video/farmacia-walkthrough-portrait.mp4` | Móvil en vertical. Recorte central 608×1080 del máster v4 (la franja que se ve en un móvil en vertical), todos los fotogramas clave, 12,7 MB. Sustituye en vertical al de 540p, que se veía pixelado al ampliarse |
| `public/video/farmacia-walkthrough-mobile.mp4` | Vídeo de fondo en móvil y tablet. 960×540, todos los fotogramas clave (scrub fluido en móvil), 11,2 MB. Sustituye al antiguo 720p (GOP 24), que daba tirones en móvil |
| `public/video/farmacia-walkthrough-poster.webp` / `.jpg` | Póster: primer fotograma, la fachada. Mostrar mientras carga el vídeo |
| `public/pictures/logo-without-background.png` | Logo |

**Logo:** si es de colores planos, conviértelo a SVG con `potrace` (`brew install potrace`; es una herramienta local, no un modelo de IA) y guárdalo en `src/assets/logo.svg`. Si la vectorización pierde calidad, usa el PNG optimizado con `astro:assets`. No lo regeneres con IA.

### Estructura del vídeo (7 tramos de 5,04 s, concatenados sin transiciones)

| Tramo | Tiempo (s) | Recorrido |
|---|---|---|
| 1 | 0,00 – 5,04 | Acera → fachada → entra por la puerta → Beauty Point |
| 2 | 5,04 – 10,08 | Rodea la isla del Beauty Point por la izquierda, aparece la pared de Dermocosmética |
| 3 | 10,08 – 15,13 | Retrocede y gira a la derecha → vista amplia de toda la farmacia |
| 4 | 15,13 – 20,17 | Pasa la isla hacia la zona de Promociones |
| 5 | 20,17 – 25,21 | Se acerca al expositor redondo de promociones (Lierac, Zona Infantil) |
| 6 | 25,21 – 30,25 | Rodea el expositor, que queda de frente con el cartel "Promociones" |
| 7 | 30,25 – 35,29 | Avanza ~2 m, pasa el tensiómetro y gira hacia el pasillo y el mostrador |

### Mapeo de secciones del menú → tramo de vídeo

El orden del menú coincide con el orden del recorrido:

| Sección | Tramo | Motivo |
|---|---|---|
| Inicio | 1 | Llegada y entrada a la farmacia |
| Nosotros | 2 | Beauty Point, el corazón de la farmacia |
| Servicios | 3 | Vista amplia: todo lo que ofrecemos |
| Marcas | 4 | Recorrido entre lineales y productos |
| Promociones | 5–6 | Expositor y cartel de Promociones |
| Actualidad | 7 | Mostrador y vida diaria de la farmacia |

Al pulsar un elemento del menú, se hace scroll hasta su sección y el vídeo queda en el inicio de su tramo. Ajusta los tiempos finos si al verlo algún punto de parada no cae bien.

---

## 2. Dirección de arte

- **Concepto:** farmacia de playa. Colores que evoquen el mar, con aspecto **profesional y a la vez cercano**. Sanitario, limpio y de confianza, pero cálido, nada frío ni clínico.
- **Paleta propuesta** (defínela como tokens CSS en `:root`):
  - Azul mar profundo para texto y fondos oscuros (p. ej. `#0E3A5B`).
  - Azul Muchavista / cielo, coherente con el rótulo y el techo azul de la farmacia (p. ej. `#5B8FD6`).
  - Turquesa / agua clara como acento y CTA secundario (p. ej. `#2BB3B1`).
  - Arena como fondo cálido de secciones (p. ej. `#F5EEDF`).
  - Blanco espuma (`#FBFDFF`).
  - Coral suave, solo para destacar promociones (p. ej. `#F2836B`).
  - Verifica contraste **WCAG AA** en todos los textos sobre el vídeo y sobre los fondos.
- **Tipografía:** una sans humanista y legible para el texto (p. ej. *Nunito Sans* o *Figtree*) y una display amable para los titulares (p. ej. *Fraunces* o *DM Serif Display*). Carga con Google Fonts y `font-display: swap`.
- **Sobre el vídeo:** velo/degradado azul mar semitransparente para garantizar la legibilidad, tarjetas de texto con fondo espuma o arena translúcido y bordes redondeados.
- **Detalles:** ondas suaves en SVG como separadores de sección, iconografía lineal y movimiento sutil. Respeta `prefers-reduced-motion`: en ese caso, nada de scroll-scrub; muestra el póster o fotogramas estáticos.
- Consulta también el skill `landing-page-design` para jerarquía, espaciados, CTA y SEO.

---

## 2b. Configuración centralizada (regla obligatoria)

**Todos los YAML de configuración de la web viven en un único directorio: `src/config/`.** Ningún otro sitio del proyecto contiene datos editables de la farmacia.

```
src/config/
├── README.md        # qué controla cada fichero y cómo editarlo
├── contacto.yaml    # nombre, dirección, Maps, WhatsApp, teléfono, Instagram, email (§4c)
├── horario.yaml     # temporadas y franjas horarias (§4b)
├── marcas.yaml      # listado de marcas (§4)
└── secciones.yaml   # textos de Inicio, Nosotros, Servicios, Promociones y Actualidad
```

- **`secciones.yaml`:** contiene el título, subtítulo, texto y tarjetas de cada sección "en construcción". Así los textos provisionales se sustituyen editando el YAML, sin tocar componentes. Cada texto provisional lleva `provisional: true`, y el aviso o `TODO` en el código se genera a partir de ese campo.
- **Fotos referenciadas desde los YAML:** las de marcas van en `src/assets/marcas/`. El YAML guarda solo la ruta o el nombre del archivo.
- **Validación:** todos los YAML se cargan con content collections o imports con esquema `zod`, definidos en `src/content.config.ts`. Si alguno tiene un error, el build falla con un mensaje claro que indica fichero y campo.
- **Sin datos escritos en el código:** los componentes no contienen ningún teléfono, dirección, horario, marca ni texto de sección; todo se lee de `src/config/`.
- **`src/config/README.md`:** explica en lenguaje sencillo cómo cambiar cada cosa y cómo ver el resultado (`astro dev` o `astro build`).

---

## 3. Estructura de la landing

### Cabecera / menú (fija)

- **Logo** (enlaza a `#inicio`).
- Enlaces: **Inicio · Nosotros · Servicios · Marcas · Promociones · Actualidad**, como anclas a cada sección.
- **CTA principal** en la cabecera, por ejemplo "Llámanos" (`tel:`) o "Cómo llegar" (Google Maps).
- En móvil, menú hamburguesa accesible: foco, `aria-expanded`, cierre con Esc y CTA visible.

### Secciones

Las secciones marcadas como "en construcción" llevan un **texto provisional** inventado y verosímil, guardado en `src/config/secciones.yaml` con `provisional: true`:

1. **Inicio:** en construcción. Hero con claim provisional, por ejemplo *"Tu farmacia junto al mar"*, subtítulo, CTA principal y botón de WhatsApp. Debajo del hero, siempre visible en esta sección, un bloque con **datos reales**:
   - **Horario:** se lee de `src/config/horario.yaml` (ver §4b). Muestra las dos temporadas, invierno y verano, y resalta la que está vigente hoy.
   - **Localización:** C/ Juan de la Cierva, 40 · Playa Muchavista, El Campello · 03560, Alicante. Añade un enlace "Cómo llegar" a Google Maps. Los datos se leen de `src/config/contacto.yaml` (ver §4c).
   - Textos de referencia, tal y como los ha dado la farmacia:

     ```
     Horario Invierno
     Lun. a Vie. de 9:00 a 21:00 h
     Sáb. de 9:00 a 14:00
     Dom. cerrado

     Horario Verano (Julio y Agosto)
     Lun. a Sáb. de 9:00 a 21:30 h
     Dom. cerrado

     Localización
     C/ Juan de la Cierva, 40
     Playa Muchavista, El Campello
     03560, Alicante
     ```
2. **Nosotros:** en construcción. Texto provisional sobre el equipo y la cercanía.
3. **Servicios:** en construcción. Texto provisional y 4–6 tarjetas de servicio de ejemplo (consejo farmacéutico, dermocosmética, control de tensión, nutrición, infantil…).
4. **Marcas:** **autogenerada desde YAML** (ver §4).
5. **Promociones:** en construcción. Texto provisional y 2–3 tarjetas de ejemplo.
6. **Actualidad:** en construcción. Texto provisional y 2–3 entradas de ejemplo.
7. **Pie y bloque "Contáctanos":** logo, dirección, horario resumido (del mismo YAML), los cuatro canales de contacto (ver §4c) y enlaces legales (aviso legal, privacidad y cookies como placeholders).

### CTA, WhatsApp y contacto

- **CTA principal** visible en la cabecera y en el hero: "Llámanos", con `tel:+34965651554`.
- **Botón de WhatsApp** flotante en todas las pantallas, más un enlace en el hero y en el bloque Contáctanos: `https://wa.me/34680143623?text=<mensaje-codificado>`, con un mensaje inicial como "Hola, quería hacer una consulta a Farmacia Muchavista".
- **Bloque "Contáctanos"**, con un icono por canal:
  - WhatsApp 680 14 36 23
  - Llamada 965 65 15 54
  - Instagram @farmaciamuchavista → `https://instagram.com/farmaciamuchavista`
  - Correo farmaciamuchavista@gmail.com → `mailto:`
- Ningún dato de contacto se escribe directamente en los componentes: todo se lee de `src/config/contacto.yaml`.

---

## 4. Marcas desde YAML (regenerable)

- Fichero de datos: `src/config/marcas.yaml`, con entradas como esta:

  ```yaml
  - nombre: "Marca ejemplo"
    categoria: "Dermocosmética"
    foto: "marcas/marca-ejemplo.webp"   # ruta dentro de src/assets/
    descripcion: "Descripción breve de la marca."
  ```

- Cárgalo con una **content collection** de Astro (`src/content.config.ts`, loader `file()` sobre el YAML) y valida el esquema con `zod`: `nombre`, `categoria` y `descripcion` obligatorios; `foto` opcional.
- La sección agrupa o filtra por `categoria` y muestra tarjetas con foto (`<Image>` de `astro:assets`), nombre y descripción.
- Si una marca no tiene foto o no existe el archivo, usa un placeholder SVG con sus iniciales. **No generes imágenes.**
- **Regenerar:** basta con editar el YAML y volver a ejecutar `astro build` (o guardar con `astro dev` en marcha). Documenta en el README cómo añadir una marca y dónde poner su foto.
- Incluye 6–8 marcas de ejemplo marcadas como provisionales.

## 4b. Horario desde YAML (fácil de cambiar)

- Fichero: `src/config/horario.yaml`, editable sin tocar código. Estructura propuesta, con los datos reales:

  ```yaml
  temporadas:
    - id: invierno
      nombre: "Horario Invierno"
      vigencia: { desde: "09-01", hasta: "06-30" }   # MM-DD, cruza el cambio de año
      franjas:
        - dias: "Lun. a Vie."
          horas: "9:00 a 21:00 h"
        - dias: "Sáb."
          horas: "9:00 a 14:00 h"
        - dias: "Dom."
          horas: "cerrado"
    - id: verano
      nombre: "Horario Verano (Julio y Agosto)"
      vigencia: { desde: "07-01", hasta: "08-31" }
      franjas:
        - dias: "Lun. a Sáb."
          horas: "9:00 a 21:30 h"
        - dias: "Dom."
          horas: "cerrado"
  ```

- Cárgalo con una content collection o un `import` de YAML, con esquema `zod`. Si el YAML es inválido, el build debe fallar con un error claro.
- Los textos visibles salen tal cual del YAML (`dias` y `horas`).
- **Temporada vigente:** calcúlala en el cliente con la fecha actual, con un script mínimo, para que cambie sola sin tener que hacer un build. En el HTML estático se muestran las dos temporadas, de modo que sin JavaScript sigue funcionando.
- Opcional: añade al YAML campos estructurados (`abre: "09:00"`, `cierra: "21:00"`, `diasSemana: [1,2,3,4,5]`) para alimentar el JSON-LD `openingHoursSpecification` y un indicador "Abierto ahora / Cerrado".
- Documenta en el README cómo cambiar el horario.

## 4c. Contacto y localización desde YAML

- Fichero: `src/config/contacto.yaml`:

  ```yaml
  nombre: "Farmacia Muchavista"
  direccion:
    calle: "C/ Juan de la Cierva, 40"
    zona: "Playa Muchavista, El Campello"
    cp: "03560"
    provincia: "Alicante"
  maps_url: "https://www.google.com/maps/search/?api=1&query=Farmacia+Muchavista+C%2F+Juan+de+la+Cierva+40+El+Campello"
  whatsapp: { visible: "680 14 36 23", numero: "34680143623", mensaje: "Hola, quería hacer una consulta a Farmacia Muchavista" }
  telefono: { visible: "965 65 15 54", numero: "+34965651554" }
  instagram: { usuario: "@farmaciamuchavista", url: "https://instagram.com/farmaciamuchavista" }
  email: "farmaciamuchavista@gmail.com"
  ```

- Úsalo en la cabecera, el hero, el botón flotante, el bloque Contáctanos, el pie y el JSON-LD.

---

## 5. Implementación técnica

- **Astro 7** (ya instalado). Usa componentes `.astro` y JavaScript vanilla para el scroll-scrub, sin frameworks salvo que sea imprescindible. Antes de empezar, consulta la documentación de Astro enlazada en `CLAUDE.md`.
- **Motor scroll-scrub** (del skill scroll-world, adaptado a un solo vídeo):
  - `<video muted playsinline preload="auto" poster=…>`, con la fuente elegida por ancho de pantalla: 540p con todos los fotogramas clave hasta 1024 px o en táctiles, y 1080p por encima. En móvil no se usan `backdrop-filter` ni `filter: blur` sobre el vídeo.
  - Asocia el progreso del scroll a `video.currentTime` con `requestAnimationFrame` e interpolación suave. No uses `play()`.
  - Las secciones son bloques de altura suficiente para cubrir su tramo de vídeo, con el contenido superpuesto.
  - En iOS, "desbloquea" el vídeo en el primer toque o scroll si hace falta. Comprueba que el scrub funciona en Safari iOS y en Chrome Android.
  - Carga diferida: muestra primero el póster y carga el vídeo enseguida, sin bloquear el LCP.
  - Con `prefers-reduced-motion` o si el vídeo falla, usa el póster como fondo estático.
- **SEO y accesibilidad:** `<title>`, meta description, Open Graph con el póster, `lang="es"`, landmarks, orden de encabezados, foco visible, textos alternativos y JSON-LD `Pharmacy` con la dirección, el teléfono y el horario reales, generado a partir de `contacto.yaml` y `horario.yaml`.
- **Rendimiento:** objetivo Lighthouse móvil ≥ 85 en rendimiento y ≥ 95 en accesibilidad. No precargues el vídeo de 1080p en móvil.

---

## 6. Fases

1. **Diseño:** dirección de arte (tokens, tipografía, componentes), wireframe de secciones sobre el vídeo y mapeo de tiempos. Presenta un resumen antes de implementar.
2. **Implementación:** layout, cabecera y menú, motor scroll-scrub, secciones con textos provisionales, Marcas desde YAML, CTA, WhatsApp, pie, SEO y logo SVG.
3. **Integración y validación:**
   - **Arranque con Astro:** levanta el servidor con `astro dev --background` y revisa `astro dev status` y `astro dev logs`, sin errores en consola. Después ejecuta `astro check` y `astro build` sin errores, y comprueba el build con `astro preview`.
   - **Validación en móvil:**
     - Viewports de 360, 390, 414, 768 y 1280 px: sin scroll horizontal, menú hamburguesa operativo, CTA y WhatsApp visibles y pulsables (área táctil ≥ 44 px).
     - Prueba en un **móvil real** de la misma red, levantando el servidor accesible en LAN (`--host`): scrub fluido, carga del vídeo de móvil (540p), enlace de WhatsApp que abre la app y `tel:` que llama.
     - Comprobar Safari iOS y Chrome Android.
     - Probar con `prefers-reduced-motion` activado.
     - Pasar Lighthouse en móvil.
   - Comprueba que cambiar cualquier YAML de `src/config/` (horario, contacto, marcas o secciones) se refleja en la web sin tocar componentes. Simula también una fecha de julio para verificar que se resalta el horario de verano.
   - Entrega una lista con lo validado y lo pendiente: textos definitivos y fotos de marcas.

---

## 7. Dónde está la generación de los clips (referencia, no regenerar)

Todo está fuera de git (en `.gitignore`), solo como referencia por si hace falta rehacer algo **manualmente y con permiso explícito**:

- **Prompts originales de los 7 clips:** `plans/clips-generation.md`. Los clips 2, 3 y 7 finales usan prompts ampliados respecto a ese archivo (escena estática y taburetes fijos en el 2 y el 3; avance de ~2 m antes de girar en el 7).
- **Máster sin comprimir:**
  - `higgsfield-output/farmacia-walkthrough-1080p-v4.mp4` (40 MB)
  - `higgsfield-output/farmacia-walkthrough-1080p-v4-scrub.mp4`, con un keyframe cada 6 fotogramas
- **Montaje v4:** `higgsfield-output/concat-v4.txt`. Clips usados: `clips/clip1.mp4`, `clip2-crop.mp4`, `clip3-crop.mp4`, `clip4.mp4`, `clip5.mp4`, `clip6.mp4`, `clip7-v2.mp4`.
- **Clips descartados**, en la misma carpeta: `clip2`, `clip3`, `clip3-v2`, `clip3-v3`, `clip7`, y las pruebas de modelo en `higgsfield-output/test/` (MiniMax H3 vs Kling).
- **Keyframes 16:9 usados:** `higgsfield-output/keyframes/`. La foto 2 usada es `2-beauty-dermo1-v2.jpg`, recortada para quitar un taburete cortado en el borde. Los IDs de subida a Higgsfield están en `higgsfield-output/keyframe-ids.txt`; el de `2-beauty-dermo1-v2` es `aa1b7344-6d0a-4b33-9229-5ea34f4dcc49`.
- **Original sin reducir de la foto 2:** `.originals/pictures/video/2-beauty-dermo1.jpg`.
- **Modelo y ajustes:** Kling 3.0 Omni Frames (`kling_o3_flf`), modo pro, 16:9, 5 s, sonido off, fotograma inicial y final.
  - En la prueba gratuita, Higgsfield solo permite generar a través del **MCP**, no desde la CLI.
  - Coste: 6,25 créditos por clip.
- **Compresión web:**
  - 1080p: `hqdn3d=2:2:5:5`, libx264 `-preset veryslow -tune fastdecode -crf 32 -g 6 -keyint_min 6 -sc_threshold 0 -bf 0 -movflags +faststart`, sin audio. Frente a GOP 24, en Firefox los saltos bajan de ~19 a ~15 ms de mediana y de ~30 a ~20 ms en el p90.
  - Móvil vertical: `crop=608:1080:(iw-608)/2:0,hqdn3d=1:1:3:3`, libx264 `-tune fastdecode -profile:v main -crf 30 -g 1 -bf 0 -movflags +faststart`, sin audio.
  - Móvil: `hqdn3d=3:3:6:6`, escalado a 960×540, libx264 `-tune fastdecode -profile:v main -crf 32 -g 1 -bf 0 -movflags +faststart` (todos los fotogramas clave), sin audio.
- **Fotos originales:** la carpeta `public/pictures/video/` con las 8 fotos originales ya no existe en el proyecto. Si hicieran falta, hay que recuperarlas de su fuente.
