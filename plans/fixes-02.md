# Fixes 02 · Promociones, Actualidad, Kiokids y ajustes

Correcciones sobre el estado tras [`fixes-01.md`](fixes-01.md), implementado en local y **pendiente de commit**.
Siguen vigentes las reglas de [`landing-scroll-world.md`](landing-scroll-world.md):

- **No generar nada:** no se generan imágenes ni vídeos.
- **Sin modelos externos:** no se llama a Higgsfield ni a ningún otro modelo.
- **Configuración:** todo dato editable va en `src/config/`.
- **Despliegue:** cada push a `main` se publica en Cloudflare.

Validar en local con `astro dev --background` antes de hacer commit.

---

## 1. Promociones: sustituir las de ejemplo por las reales

Fichero: `src/config/secciones.yaml` → `promociones.tarjetas`

Las tres tarjetas actuales (Protección solar, Rutina facial y Cuidado del bebé) son inventadas y se eliminan.

- [ ] **1.1 Nuevas promociones**, en este orden:

  | # | Título | Texto | Destacado |
  |---|---|---|---|
  | 1 | **Lierac** | Hasta 40 € de descuento llevando 2 unidades (según la gama). | `Hasta -40 €` |
  | 2 | **Acniben · gama acné** | 20 % de descuento en la gama acné de Acniben. | `-20 %` |
  | 3 | **Filorga · solar antiedad SPF50+** | Protector solar antiedad SPF50+. | Precio: antes **29,90 €**, ahora **19,90 €** |
  | 4 | **Effaclar · La Roche-Posay** | 20 % de descuento en la gama Effaclar. | `-20 %` |
  | 5 | **Dorminatur** | 20 % de descuento en Dorminatur. | `-20 %` |
  | 6 | **Solgar · Bisglicinato de magnesio** | 20 % de descuento en Bisglicinato de magnesio de Solgar. | `-20 %` |

- [ ] **1.2 Campos nuevos** en la tarjeta (`src/content.config.ts`), opcionales:
  - `descuento`: texto corto destacado en una etiqueta coral, por ejemplo `"-20 %"` o `"Hasta -40 €"`.
  - `precio: { antes, ahora }`: se muestra el precio anterior **tachado** (`<del>`) y el nuevo en grande (`<ins>`). Para lectores de pantalla: "Antes 29,90 €, ahora 19,90 €".
  - Documentarlos en `src/config/README.md`.
- [ ] **1.3 Diseño:**
  - **Rejilla:** 6 tarjetas, en 3 columnas en escritorio, 2 en tablet y 1 en móvil.
  - **Contenido:** el descuento o precio es lo más visible de la tarjeta, después el título y por último el texto. El icono `tag` se mantiene en todas o se quita para dar protagonismo al descuento.
  - **Etiqueta antigua:** desaparece la etiqueta `etiqueta` de fecha ("Hasta el 31 de agosto"…). Ver la decisión D1 sobre la vigencia.
- [ ] **1.4 Subtítulo de la sección**
  - Antes: "Cada mes renovamos nuestro expositor con descuentos en solares, dermofarmacia y cuidado infantil."
  - Propuesta: **"Descuentos en dermofarmacia, protección solar y complementos alimenticios. Consulta las condiciones en la farmacia."**
- [ ] **1.5 Aviso legal breve bajo las tarjetas:** "Promociones válidas hasta fin de existencias. Consulta condiciones en la farmacia." El texto sale del YAML (`promociones.nota`). Ver D1.
- [ ] **1.6** Quitar `provisional: true` de Promociones.

## 2. Actualidad: sustituir las entradas de ejemplo por las reales

Fichero: `src/config/secciones.yaml` → `actualidad.tarjetas`

Las tres entradas actuales (protector solar, cabina de tensión y medusas) son inventadas y se eliminan.

- [ ] **2.1 Nuevas entradas:**

  | # | Título | Texto | Icono |
  |---|---|---|---|
  | 1 | **Colaboración solidaria con la Asociación Española Contra el Cáncer** | Colaboramos con la sede de San Juan de Alicante de la Asociación Española Contra el Cáncer: donamos el 100 % de lo recaudado con los productos asociados. | `hand-heart` |
  | 2 | **Nueva marca en Bebé y maternidad: Kiokids** | Incorporamos Kiokids, con accesorios de puericultura para el día a día del bebé: alimentación, dentición, baño e higiene. | `baby` |

- [ ] **2.2 Fechas:** el campo `fecha` es opcional y, si no se indica, no se muestra. Ver D2.
- [ ] **2.3 Rejilla:** con 2 entradas, se muestran en 2 columnas en escritorio y apiladas en móvil, sin un hueco de tercera columna.
- [ ] **2.4 Enlace a Kiokids:** la entrada de Kiokids lleva un enlace "Ver en Marcas" que hace scroll a `#marcas` con el filtro "Bebé y maternidad" activado. Opcional; ver D3.
- [ ] **2.5** Quitar `provisional: true` de Actualidad.

## 3. Marcas: añadir Kiokids y limitar a 8 visibles

Ficheros: `src/config/marcas.yaml`, `src/components/Marcas.astro`

- [ ] **3.1 Añadir Kiokids** en **Bebé y maternidad**, después de Mustela:

  ```yaml
  - nombre: "Kiokids"
    categoria: "Bebé y maternidad"
    descripcion: "Accesorios de puericultura para el día a día del bebé: alimentación, dentición, baño e higiene."
    provisional: true
  ```

  La descripción se basa en el catálogo público de la marca (cucharas, baberos, mordedores, accesorios de baño), queda pendiente de revisión y debe coincidir con el texto de la entrada de Actualidad (§2.1). Total: **19 marcas**.
- [ ] **3.2 Máximo 8 marcas visibles en todos los tamaños de pantalla**, no solo en móvil como ahora.
  - Con el filtro "Todas" se ven las 8 primeras.
  - Debajo hay un **separador horizontal pulsable** que muestra el resto: una línea fina a todo el ancho con una etiqueta centrada "Ver todas las marcas (19)" y un icono de flecha hacia abajo. Toda la franja es el botón.
  - **Desplegado:** se ven todas las marcas y la etiqueta cambia a **"Ver menos"** con la flecha hacia arriba. Al pulsarlo se vuelve a 8 y la vista hace scroll al inicio de la rejilla para no dejar al usuario perdido más abajo.
  - **Con un filtro de categoría:** se aplica la misma regla de 8 sobre las marcas de esa categoría. Hoy ninguna categoría pasa de 5, así que el separador no aparece; lo hará solo si alguna supera las 8.
  - **Accesibilidad:**
    - El separador es un `<button>` con `aria-expanded` y `aria-controls` apuntando a la rejilla.
    - Al desplegar, el foco va a la primera marca nueva (la novena).
    - Su área táctil es de al menos 44 px de alto.
  - **Sin JavaScript** se ven todas las marcas y el separador no aparece.
  - **Animación:** las marcas nuevas aparecen con la animación de aparición de la web. Si el usuario prefiere menos movimiento, sin animación.
- [ ] **3.3** Sustituir el botón actual "Ver todas las marcas", que solo existe en móvil, por este separador.

## 4. Quitar las etiquetas "Texto provisional" y "Marcas de ejemplo"

Ficheros: `src/components/Chapter.astro`, `src/components/Hero.astro`, `src/components/Marcas.astro`, `src/styles/global.css`

- [ ] **4.1** Eliminar el distintivo visual (`.provisional-badge`) de todas las secciones y de Marcas, y sus estilos en `global.css`.
- [ ] **4.2** El campo `provisional` se mantiene en los YAML solo como recordatorio interno para quien edite: sin efecto visual, como mucho un comentario HTML `<!-- TODO -->`. Ver D4.
- [ ] **4.3** Comprobar con `grep -rn "Texto provisional\|Marcas de ejemplo" src` que no queda ninguno.

## 5. Cabecera: quitar el enlace "Contacto"

Fichero: `src/components/Header.astro`

- [ ] **5.1** Quitar **"Contacto"** de los enlaces del menú, tanto en escritorio como en móvil. El botón **"Contáctanos"** ya lleva a `#contacto`. Queda así: Inicio · Nosotros · Servicios · Marcas · Promociones · Actualidad + botón Contáctanos.
- [ ] **5.2** Al llegar a la sección Contáctanos, ningún enlace del menú queda marcado como activo, porque Contacto ya no está. Para que no parezca un error, el botón "Contáctanos" pasa a destacarse como activo (`aria-current="location"`, con un contorno o un tono más oscuro).
- [ ] **5.3** `secciones.yaml` → `contacto.menu` deja de usarse en la cabecera. Se mantiene como el texto del botón "Contáctanos", para que también sea editable.

## 6. Validación

- [ ] `astro check` y `astro build` sin errores.
- [ ] `grep -rn "Texto provisional\|Marcas de ejemplo" src` no devuelve nada.
- [ ] Promociones: 6 tarjetas con sus descuentos. Filorga muestra 29,90 € tachado y 19,90 €.
- [ ] Actualidad: 2 entradas sin hueco vacío.
- [ ] Marcas:
  - 19 en total, Kiokids en Bebé y maternidad.
  - 8 visibles con el separador en 360, 390, 414, 768 y 1280 px.
  - "Ver todas" y "Ver menos" funcionan con ratón, toque y teclado.
- [ ] Cabecera sin "Contacto". "Contáctanos" lleva a la sección y se marca activo al llegar.
- [ ] Vídeo: los tramos siguen cayendo en su sitio, también después de desplegar y plegar las marcas, porque la sección cambia de alto.
- [ ] Sin scroll horizontal ni errores en consola. Lighthouse en móvil con accesibilidad 100 y rendimiento ≥ 90.
- [ ] Prueba en un móvil real antes del push.

## Decisiones tomadas

- **D1. Vigencia de las promociones:** hasta el 31 de octubre. Se muestra en cada tarjeta ("Hasta el 31 de octubre") y en la nota bajo las promociones.
- **D2. Fechas de Actualidad:** sin fechas.
- **D3. Enlace "Ver en Marcas"** desde la noticia de Kiokids: sí. Lleva a Marcas con el filtro "Bebé y maternidad" activado.
- **D4. Campo `provisional`:** eliminado de `marcas.yaml`. En `secciones.yaml` se mantiene solo como recordatorio interno, sin efecto visual. También se quitó el aviso visible "Texto provisional pendiente de revisión legal" de las páginas legales.
- **D5. Marcas de las promociones:** se añaden **Acniben** y **Filorga** (Dermofarmacia) y **Dorminatur** (Complementos alimenticios). Lierac, La Roche-Posay y Solgar ya estaban. Total: **22 marcas**.

## Fuente de la descripción de Kiokids

- Catálogo de la marca en [carrefour.es](https://www.carrefour.es/bebe-kiokids-lorelli-red-string/F-105uZ174hZo4jsZpytu/c): accesorios de alimentación, dentición, baño, higiene y viaje para bebé.

## Fuentes de las marcas añadidas en D5

- Acniben (ISDIN): [farmaciajimenez.com](https://farmaciajimenez.com/nuestras-marcas/isdin-dermatologia/isdin-acniben)
- Filorga: [lyko.com](https://lyko.com/en/filorga/about-filorga), [businesscoot.com](https://www.businesscoot.com/en/company/filorga-cosmetiques-colgate-palmolive)
- Dorminatur (Esteve): [imfarmacias.es](https://www.imfarmacias.es/uploads/2023/10/imfarmacias_esteve_anos_33580_03090557.pdf), [druni.es](https://www.druni.es/melatonina-pasiflora-gaba-dorminatur-complemento-alimenticio)
