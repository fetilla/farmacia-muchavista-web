# Fixes 01 · Landing Farmacia Muchavista

Conjunto de correcciones sobre la landing ya publicada (commit `e08ebe7`).
Sigue vigente todo lo de [`landing-scroll-world.md`](landing-scroll-world.md):

- **No generar nada:** no se generan imágenes ni vídeos.
- **Sin modelos externos:** no se llama a Higgsfield ni a ningún otro modelo.
- **Configuración:** todo dato editable va en `src/config/`.
- **Despliegue:** cada push a `main` se publica en Cloudflare.

Validar en local con `astro dev --background` antes de hacer commit.

---

## 0. Cambios globales

- [ ] **0.1 "Dermocosmética" pasa a "Dermofarmacia" en toda la web**, en mayúsculas y minúsculas y en todos los ficheros:
  - `src/config/secciones.yaml`: subtítulo de Inicio, tarjeta de Servicios y subtítulo de Promociones
  - `src/config/marcas.yaml`: categoría
  - `src/layouts/Layout.astro`: meta description
  - Comprobar con `grep -ri "dermocosm" src` que no queda ninguna aparición.
- [ ] **0.2 Correo de contacto:** `farmaciamuchavista@gmail.com` pasa a **`farmaciapbelda@gmail.com`** en `src/config/contacto.yaml` → `email`. Se refleja solo en el bloque Contáctanos, el pie, el JSON-LD y las páginas legales. Comprobar con `grep -r "farmaciamuchavista@" src` que no queda ninguna aparición.

## 1. Inicio

Fichero: `src/config/secciones.yaml` → `inicio`

- [ ] **1.1 Título**
  - Antes: "Tu farmacia de confianza, a un paseo del mar"
  - Después: **"Tu farmacia de confianza, a un paso de la playa"**
- [ ] **1.2 Subtítulo.** Aplicado ya el cambio global 0.1:
  - Antes: "Consejo farmacéutico cercano, dermocosmética y cuidado para toda la familia, todos los días del año junto a la playa."
  - Después: **"Consejo farmacéutico cercano, servicios, dermofarmacia y cuidado para toda la familia."**
- [ ] **1.3 Meta description:** moverla de `src/layouts/Layout.astro` a `secciones.yaml` (campo `inicio.descripcion_seo`), coherente con el nuevo subtítulo y con "dermofarmacia".

## 2. Barra de accesos (cabecera)

Fichero: `src/components/Header.astro`

- [ ] **2.1 Botón de la cabecera**
  - Texto: "Llámanos" pasa a **"Contáctanos"**.
  - Destino: deja de ser `tel:` y pasa a la sección **Contáctanos** (`#contacto`, ver §7).
  - Icono: `phone` pasa a `chat-circle-text`.
- [ ] **2.2 Menú móvil:** el botón inferior pasa de "Llamar al 965…" a **"Contáctanos"**, con el mismo destino.
- [ ] **2.3 No cambian:** el botón "Llámanos al 965 65 15 54" del hero y el botón flotante de WhatsApp.
- [ ] **2.4 Menú:** añadir el enlace **"Contacto"** después de Actualidad, apuntando a `#contacto`. El texto sale de `secciones.yaml` → `contacto.menu` y se marca como activo al llegar a la sección.

## 3. Nosotros

Fichero: `src/config/secciones.yaml` → `nosotros`

- [ ] **3.1 Párrafo 1**
  - Antes: "Desde nuestro mostrador en Muchavista acompañamos…"
  - Después: **"Desde nuestro mostrador acompañamos…"** (el resto del párrafo no cambia)
- [ ] **3.2 Lema destacado** al final de la sección
  - Antes: `frase_destacada` "Cuidamos de tu salud con la cercanía de siempre y el rigor de un equipo sanitario."
  - Después: **"Cercanía, pasión y profesión"**
  - Mantener la animación palabra a palabra (`TaglineReveal`). Como es más corto, mostrarlo más grande, en 6xl (60 px) en escritorio y 4xl (36 px) en móvil. Debe leerse como el lema de la farmacia, no como un párrafo.
  - Renombrar el campo a `lema` en el YAML y en `src/content.config.ts`.

## 4. Servicios

Ficheros: `src/config/secciones.yaml` → `servicios`, `src/components/Cards.astro` (o un nuevo `Servicios.astro`), `src/content.config.ts`

- [ ] **4.1** La tarjeta "Dermocosmética" pasa a **"Dermofarmacia"** (cambio global 0.1), ajustando también su texto.
- [ ] **4.2 Botón "Más información"** en las tarjetas que tengan detalle. Por ahora solo **Control de tensión**.
  - **YAML:** nuevo campo opcional en cada tarjeta:

    ```yaml
    - titulo: "Control de tensión"
      texto: "…"
      icono: "heartbeat"
      detalle:
        titulo: "Seguimiento de Tensión Arterial, Pulso y Detección de Arritmias"
        texto: "Medición rigurosa siguiendo las directrices de Guías clínicas especializadas como la Guía ESC 2024, Guía AHA/ACC. Se realiza mediante el dispositivo de última generación Omron X7 Smart Afib (clínicamente validado), manguitos adaptados y un reposo previo de 5 minutos en un entorno tranquilo para evitar sesgos. Tras varias tomas válidas, se elabora un informe personalizado con tus valores, pautas de ejercicio y recomendaciones nutricionales para cuidar de tu corazón."
    ```

  - **Comportamiento:**
    - Al pulsar "Más información" se **ocultan las demás tarjetas** y la elegida se amplía a todo el ancho de la rejilla, mostrando `detalle.titulo` y `detalle.texto`.
    - Un botón **"Volver a todos los servicios"** restaura la rejilla y devuelve el foco al botón de esa tarjeta.
  - **Accesibilidad:**
    - El botón lleva `aria-expanded` y `aria-controls`.
    - Al abrir, el foco va al título del detalle.
    - Esc cierra el detalle.
    - Sin JavaScript, el detalle se ve debajo de su tarjeta.
  - **Animación:** transición con la curva de la web (`--ease`). Si el usuario prefiere menos movimiento, sin animación.
  - **Scroll:** al abrir o cerrar, la sección cambia de alto. Hay que comprobar que los tramos del vídeo se recalculan; el `ResizeObserver` del motor debería hacerlo.
  - Las tarjetas sin `detalle` no muestran el botón.
- [ ] **4.3 Esquema:** añadir `detalle: { titulo, texto }` opcional a `tarjeta` en `src/content.config.ts` y documentarlo en `src/config/README.md`.

## 5. Marcas

Ficheros: `src/config/marcas.yaml`, `src/components/Marcas.astro`, `src/content.config.ts`

- [ ] **5.1 Categorías oficiales**, en este orden. Todas tienen marcas, así que todas aparecen como filtro:
  1. Dermofarmacia
  2. Protección solar
  3. Bebé y maternidad
  4. Complementos alimenticios
  5. Salud y botiquín
  6. Bucodental
  7. Ortopedia y deporte
- [ ] **5.2 Lista de categorías en el YAML:** en `marcas.yaml`, una lista `categorias:` en ese orden y la lista de marcas aparte (`marcas:`). La validación falla si una marca usa una categoría que no está en la lista. Una categoría sin marcas no aparece como filtro.

  ```yaml
  categorias:
    - Dermofarmacia
    - Protección solar
    - …
  marcas:
    - nombre: "Eucerin"
      categoria: "Dermofarmacia"
      …
  ```

- [ ] **5.3 Reasignar:** Eucerin, La Roche-Posay, Lierac y Avène pasan de "Dermocosmética" a **Dermofarmacia**.
- [ ] **5.4 Eliminar** la marca **Arkopharma**.
- [ ] **5.5 Añadir las marcas nuevas** con estas descripciones propuestas.
  - Las he redactado a partir de información pública de cada marca, de forma neutra y **sin afirmaciones de salud**, porque los complementos alimenticios no pueden prometer efectos que no estén autorizados.
  - Quedan con `provisional: true` hasta que la farmacia las revise.

  **Complementos alimenticios**

  | Marca | Descripción propuesta |
  |---|---|
  | Solgar | Marca estadounidense fundada en 1947, con una amplia gama de vitaminas, minerales y complementos nutricionales. |
  | Vitaceutics | Línea de complementos nutricionales de Faes Farma, con fórmulas a base de vitaminas, minerales y extractos vegetales. |
  | Kobho | Marca española de complementos alimenticios con fórmulas de probióticos, colágeno, creatina y descanso. |
  | Sweet by Asun Arias | Complementos nutricionales pensados para la mujer, con fórmulas numeradas para el climaterio, el descanso, la piel y las mucosas. |

  **Bucodental**

  | Marca | Descripción propuesta |
  |---|---|
  | Vitis | Gama completa de higiene bucodental de Dentaid: pastas, colutorios, cepillos y seda dental para cada necesidad. |
  | Lacer | Laboratorio español con larga tradición en salud bucodental: dentífricos y colutorios para encías, sensibilidad y cuidado diario. |
  | Bexident | Línea bucodental de ISDIN para el cuidado de encías y la prevención de caries, con colutorios, dentífricos y geles. |
  | Oraldine | Colutorios para una boca fresca y limpia cada día, con opciones para encías y protección anticaries. |
  | Fluocaril | Marca francesa nacida en 1946 de la mano de farmacéuticos, conocida por sus dentífricos con flúor contra la caries. |

  **Ortopedia y deporte**

  | Marca | Descripción propuesta |
  |---|---|
  | Prim | Compañía española de ortopedia con muñequeras, rodilleras, tobilleras y otras ayudas para el día a día y el deporte. |
  | Farmalastic | Línea de ortopedia de Cinfa con sujeciones, soportes y medias para la vida diaria y la práctica deportiva. |

- [ ] **5.6 Cargador:** adaptar el cargador de `marcas.yaml` en `src/content.config.ts` al nuevo formato (objeto con `categorias` y `marcas`) y actualizar `src/config/README.md`.
- [ ] **5.7 Rejilla:** con 22 marcas, comprobar que el filtro "Todas" no hace la sección excesivamente larga en móvil. Si lo hace, mostrar 8 marcas y un botón "Ver todas las marcas".

## 6. Reparto del vídeo entre secciones

Fichero: `src/config/secciones.yaml` → `video` de cada sección

La sección **Contáctanos** pasa a estar **dentro del recorrido** y es la que hace la transición al **último clip** del vídeo (tramo 7, 30,25–35,29 s, hacia el tensiómetro y el mostrador):

| Sección | Antes | Después |
|---|---|---|
| Promociones | 20,17–30,25 (tramos 5–6) | **20,17–25,21** (tramo 5, acercamiento al expositor) |
| Actualidad | 30,25–35,29 (tramo 7) | **25,21–30,25** (tramo 6, rodea el expositor) |
| **Contáctanos** | fuera del vídeo | **30,25–35,29** (tramo 7, hacia el mostrador) |

- [ ] **6.1** Actualizar los `video: { desde, hasta }` en `secciones.yaml`, añadiendo `video` a `contacto`.
- [ ] **6.2** Comprobar que al pulsar cada enlace del menú el vídeo cae al inicio de su tramo y que la última imagen del vídeo coincide con Contáctanos.

## 7. Contáctanos dentro del vídeo

Ficheros: `src/components/Contacto.astro`, `src/pages/index.astro`

No hay formulario. **Contáctanos es la sección actual**, con los mismos textos:

> **Contáctanos**
> Estamos aquí para ayudarte
> Escríbenos por WhatsApp, llámanos o pásate por la farmacia. Te atendemos encantados.

- [ ] **7.1 Mover la sección dentro del recorrido.** Pasa de estar después de `ScrollWorld` a ser la **última sección dentro de `ScrollWorld`**, con `data-chapter` y su tramo de vídeo (§6).
- [ ] **7.2 Fondo:** igual que el resto de secciones, sobre el vídeo con el velo azul.
  - Se elimina el fondo arena y la ola de separación.
  - Los textos van en una tarjeta translúcida, como las demás secciones.
  - Los 4 canales (WhatsApp, llamada, Instagram y correo) son tarjetas translúcidas debajo.
- [ ] **7.3 Horario y "Dónde estamos":** mantenerlos dentro de Contáctanos, también en tarjeta translúcida, con el mismo diseño unificado de horario y localización que en Inicio (un solo recuadro).
- [ ] **7.4 Final del recorrido:** al acabar Contáctanos termina el vídeo y aparece directamente el pie de página azul. Revisar que el final del vídeo y la entrada del pie no dejan un hueco vacío.
- [ ] **7.5 Destino de "Contáctanos":** cabecera, menú móvil y enlace "Contacto" del menú apuntan a `#contacto` (§2).
- [ ] **7.6 Móvil:** comprobar que las 4 tarjetas de canales y el horario caben sin solaparse con el botón flotante de WhatsApp.

## 8. Validación

- [ ] `astro check` y `astro build` sin errores.
- [ ] `grep -ri "dermocosm" src` y `grep -r "farmaciamuchavista@" src` no devuelven nada.
- [ ] Probar en 360, 390, 414, 768 y 1280 px:
  - sin scroll horizontal
  - "Más información" de Control de tensión abre y cierra, y las demás tarjetas se ocultan y vuelven
  - filtros de marcas con las 7 categorías y las 22 marcas
  - Contáctanos dentro del vídeo, legible y sin solapes
- [ ] Vídeo: cada sección cae en su tramo nuevo y Contáctanos coincide con el último clip.
- [ ] Lighthouse en móvil: mantener accesibilidad 100 y rendimiento ≥ 90.
- [ ] Prueba en un móvil real antes del push.

## Decisiones tomadas

- **D1.** No hay formulario de email. El correo se ofrece como canal (`mailto:`) dentro de Contáctanos.
- **D2.** "Contáctanos" de la cabecera lleva a la sección Contáctanos, que es la última del recorrido.
- **D3.** Todas las categorías de marcas tienen marcas, así que no hay filtros vacíos.
- **D4.** "Dermocosmética" pasa a "Dermofarmacia" en toda la web.
- **D5.** Las descripciones de las marcas nuevas son propuestas basadas en información pública, pendientes de revisión de la farmacia.

## Fuentes de las descripciones de marcas

- Solgar: [brandwiki.lazada.com.ph/solgar](https://brandwiki.lazada.com.ph/solgar/), [easypara.fr](https://www.easypara.fr/les-marques-de-parapharmacie/solgar.html)
- Vitaceutics (Faes Farma): [farmaciasoler.com](https://www.farmaciasoler.com/app/webroot/index.php/blog/vitaceutics-formula-antioxidantes-30-sobres-p-23776.html), [donfarma.com](https://donfarma.com/cosmetica/14738-vitaceutics-antienvejecimiento-y-antioxidante-30-sobres.html)
- Kobho Labs: [farmaciajimenez.com/nuestras-marcas/kobho-labs](https://farmaciajimenez.com/nuestras-marcas/kobho-labs), [farma2go.com](https://farma2go.com/blogs/cuidate/kobho-labs-analisis-marca-2026)
- Sweet by Asun Arias: [farmaciaavenidadeamerica.com](https://www.farmaciaavenidadeamerica.com/collections/sweet-by-asun-arias), [farmacing.es](https://www.farmacing.es/marca/1191-sweet-by-asun-arias)
- Bucodental (Vitis, Lacer, Bexident, Oraldine, Fluocaril): [farmaciajimenez.com bucodental](https://farmaciajimenez.com/catalogo/corporal-y-cuidados/bucodental/bucodental-cuidados), [farmaciajimenez.com/nuestras-marcas/fluocaril](https://farmaciajimenez.com/nuestras-marcas/fluocaril), [soin-et-nature.com Fluocaril](https://www.soin-et-nature.com/es/68_fluocaril), [Bexident ISDIN](https://farmaciajimenez.com/nuestras-marcas/isdin-dermatologia/isdin-bexident/bexident-anticaries-colutorio-500-ml)
- Prim: [medi-shop.gr](https://www.medi-shop.gr/en/brand/prim), [forbes.es](https://forbes.es/?p=993749)
- Farmalastic (Cinfa): [atlas.marcasrenombradas.com/marcas/cinfa](https://atlas.marcasrenombradas.com/marcas/cinfa/?lang=en)
