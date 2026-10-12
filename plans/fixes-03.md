# Fixes 03 · Versión móvil, tarjetas plegables y carrusel de marcas

Correcciones sobre el estado tras [`fixes-02.md`](fixes-02.md), centradas en el móvil.
Siguen vigentes las reglas de [`landing-scroll-world.md`](landing-scroll-world.md):

- **No generar nada:** no se generan imágenes ni vídeos.
- **Sin modelos externos:** no se llama a Higgsfield ni a ningún otro modelo.
- **Configuración:** todo dato editable va en `src/config/`.
- **Despliegue:** cada push a `main` se publica en Cloudflare.

Validar en local con `astro dev --background` antes de hacer commit.

---

## Problemas detectados

Medido con Chrome sin interfaz, con anchos de móvil de 360 y 375px (800px de alto de pantalla):

| Bloque | Alto en móvil | Problema |
|---|---|---|
| Contáctanos | — | Cortado por la derecha en móviles de menos de unos 396px de ancho |
| Servicios (6 tarjetas) | 1452px | Tarjetas enormes, casi 2 pantallas |
| Promociones (6 tarjetas) | 1356px | Igual |
| Actualidad (2 tarjetas) | 668px | Igual |
| **Marcas (8 visibles)** | **3171px** | 382px por marca; difícil de manejar en móvil y en escritorio |
| Horario y localización | 717px | Muestra todas las temporadas |
| Filtros de Marcas | unos 200px | 3–4 líneas de botones; en móvil se ven raros |

### Por qué se cortaba Contáctanos

El correo `farmaciapbelda@gmail.com` es una sola palabra que no se puede partir y ocupa 364px. La rejilla `.canales` usaba una columna `auto`, que no puede ser más estrecha que su contenido, así que toda la sección medía 364px. En un móvil de 360–375px solo hay 328px disponibles. Como `body` tiene `overflow-x: clip`, lo que sobra no genera scroll horizontal: simplemente se corta.

---

## Decisiones

- **D1 · Tarjetas en móvil:** se muestran como una fila con el icono, el título y un botón para desplegar, sin la descripción. Al desplegar:
  - **Servicios:** se ve el contenido de `detalle` si existe y, si no, `texto`.
  - **Promociones:** el descuento o el precio queda siempre visible en la fila, porque es la información clave. La etiqueta de fecha se oculta en móvil porque ya la repite `promociones.nota`.
  - **Actualidad:** fecha y título; al desplegar, el texto y el enlace.
  - Solo hay una tarjeta abierta a la vez por sección.
  - En escritorio no cambia nada.
- **D2 · Marcas como carrusel**, en móvil y en escritorio. Se quitan el separador horizontal "Ver todas las marcas" y el límite de 8 marcas: en un carrusel dejan de tener sentido.
- **D3 · Fichas de marca:** muestran el logo y el nombre. Al pulsar una ficha, su descripción aparece en un panel bajo el carrusel. Se eligió el panel en lugar de girar la ficha porque el texto no cabe bien en fichas tan estrechas.
- **D4 · Filtros:** se quitan **solo en móvil**; en escritorio se mantienen. En móvil, el enlace de Kiokids ("Ver en Marcas") mueve el carrusel hasta la primera marca de "Bebé y maternidad" y la selecciona. En escritorio sigue aplicando el filtro.
- **D5 · El carrusel no avanza solo.** Al principio se pidió que avanzara solo. Se desaconsejó por estos motivos:
  - Accesibilidad: la norma WCAG 2.2.2 obliga a poner un control de pausa.
  - La ficha se mueve mientras la persona la toca o lee su descripción.
  - Compite con el vídeo de fondo.
  - Molesta a quienes son sensibles al movimiento.

  Al final se acordó que se mueva **solo cuando el usuario lo arrastra**: con el dedo en móvil, arrastrando con el ratón en escritorio, y con flechas ← → en escritorio.

---

## 1. Contáctanos: el contenido cabe en la pantalla

Fichero: `src/components/Contacto.astro`

- [x] **1.1** `.canales` usa `grid-template-columns: minmax(0, 1fr)` en una columna y `repeat(2, minmax(0, 1fr))` en dos.
- [x] **1.2** `.canal__value` usa `overflow-wrap: anywhere`, para que el correo se parta si no cabe.
- [x] **1.3** En móvil, filas de contacto más compactas: relleno de 12/16px, icono de 40px y radio de 16px.

## 2. Servicios, Promociones y Actualidad: tarjetas plegables en móvil

Fichero: `src/components/Cards.astro`

- [x] **2.1 Estructura:** cada tarjeta tiene ahora una `card__head` (icono, descuento o precio, fecha y título, y el botón para plegar) y un `card__body` (texto, etiqueta, enlace y detalle). En escritorio, las dos cajas usan `display: contents`, así que el diseño no cambia.
- [x] **2.2 Móvil (<640px):**
  - Una fila de al menos 44px de alto con un botón redondo de 44px y una flecha que gira al abrir.
  - Se puede tocar toda la cabecera para desplegar.
  - Solo una tarjeta abierta a la vez.
  - El botón usa `aria-expanded` y `aria-controls`.
- [x] **2.3 Servicio con detalle:** en móvil, al desplegar se ve el detalle (título y texto) en lugar del resumen. Los botones "Más información" y "Volver" son solo de escritorio.
- [x] **2.4 Sin JavaScript:** todo se ve desplegado. La clase `is-collapsible` la añade el script.

## 3. Resto de recuadros más compactos en móvil

- [x] **3.1** `.title` pasa a 1.5rem y `.lead` a 1rem en móvil (`src/styles/global.css`).
- [x] **3.2** En móvil, `.chapter__card` y `.contacto__head` tienen relleno de 16px y radio de 16px (`Chapter.astro`, `Contacto.astro`).
- [x] **3.3** `.info-card` en móvil: relleno de 16px y títulos y dirección más pequeños (`HorarioLocalizacion.astro`).
- [x] **3.4 Horario** (`Horario.astro`):
  - En móvil solo se ve la temporada vigente.
  - El botón "Ver otros horarios" despliega las demás temporadas, y desde ahí "Ver solo el horario actual" vuelve a plegarlas.
  - Solo se pliega si hay una temporada vigente y JavaScript funciona.

## 4. Marcas como carrusel

Fichero: `src/components/Marcas.astro`

- [x] **4.1 Se elimina** el separador "Ver todas las marcas", junto con su lógica (`VISIBLES`, `is-collapsed`).
- [x] **4.2 Carrusel** con `scroll-snap` y sin librerías:
  - En móvil se ven unas 2,3 fichas, con la siguiente asomando para que se note que se puede deslizar.
  - En tableta se ven 3,4 fichas y en escritorio 5.
  - La barra de scroll nativa está oculta.
- [x] **4.3 Movimiento solo a mano:**
  - En táctil se desliza de forma nativa.
  - Con ratón se arrastra mediante eventos de puntero; un arrastre no cuenta como clic.
  - Flechas ← → a partir de 640px. Se desactivan al llegar a cada extremo y se ocultan si todas las marcas caben.
- [x] **4.4 Ficha:** botón con el logo y el nombre (`aria-expanded`). Al pulsarla, el panel `#marcas-panel` (`aria-live`) muestra la categoría, el nombre y la descripción. Se cierra pulsando otra vez la ficha o la ✕. Sin JavaScript, la descripción se ve dentro de la ficha.
- [x] **4.5 Filtros:** con `display: none` en móvil. En escritorio funcionan como antes y, al filtrar, el carrusel vuelve al principio.
- [x] **4.6 Enlace de Kiokids:** en escritorio aplica el filtro; en móvil mueve el carrusel hasta la primera marca de la categoría y la selecciona.
- [x] **4.7 Animación de aparición:** el efecto `.reveal` pasa de cada ficha al bloque entero. Dentro de un carrusel horizontal, cada ficha se animaría al entrar por el lateral.

## 5. Comprobación

- [x] **5.1** A 320, 360, 375, 390, 768 y 1280px, ningún elemento sobresale por la derecha.
- [x] **5.2** Nuevos altos en móvil, a 375px:

  | Bloque | Antes | Después |
  |---|---|---|
  | Servicios | 1452px | 468px |
  | Promociones | 1356px | 480px |
  | Actualidad | 668px | 180px |
  | Marcas, con filtros | 3171px + 200px | 177px |
  | Horario y localización | 717px | 561px |

- [x] **5.3** Capturas en móvil de Servicios (con Control de tensión desplegado), Promociones, Marcas (con el panel de La Roche-Posay) y Contáctanos, donde el correo ya cabe entero.
  - Ajuste tras revisarlas: el descuento de las promociones se centra en vertical en la fila.
  - Ajuste tras revisarlas: el nombre de la marca se centra en su zona, porque "Sweet by Asun Arias" ocupa dos líneas.
- [x] **5.4 Escritorio (1280px), sin cambios respecto a antes:**
  - Rejilla de tarjetas sin botón de plegar.
  - "Más información" y "Volver a todos los servicios" funcionan.
  - Promociones con su etiqueta de fecha.
  - Horario con las dos temporadas.
  - Contáctanos en 2 columnas.
  - Filtros de Marcas visibles.
  - Arrastrar con el ratón mueve el carrusel sin abrir la descripción.
  - Un clic en una marca abre su descripción y un segundo clic la cierra.
  - El enlace de Kiokids aplica el filtro "Bebé y maternidad".
- [x] **5.5** `astro check` sin errores y `astro build` correcto.

### Pendiente o mejorable

- En móvil, el enlace de Kiokids lleva a **Mustela**, la primera marca de "Bebé y maternidad", porque el enlace solo indica la categoría. Para que lleve exactamente a Kiokids, se podría añadir `enlace.marca` en `secciones.yaml`.
- Falta probarlo en un móvil real, sobre todo el deslizamiento con el dedo en iOS Safari.
