# Configuración de la web

Todo lo que se puede cambiar de la web sin tocar código está en esta carpeta.
Cada fichero `.yaml` es texto normal: ábrelo, cambia el valor entre comillas y guarda.

| Fichero | Qué controla |
|---|---|
| `contacto.yaml` | Nombre, dirección, enlace de Google Maps, WhatsApp, teléfono, Instagram y correo |
| `horario.yaml` | Horario de invierno y de verano, y qué fechas aplica cada uno |
| `marcas.yaml` | Las marcas de la sección "Marcas" |
| `secciones.yaml` | Los textos de Inicio, Nosotros, Servicios, Marcas, Promociones, Actualidad y Contacto, y el tramo de vídeo de cada sección |

## Cómo ver los cambios

- **Mientras trabajas:** con el servidor en marcha (`astro dev --background`, o `pnpm dev`), guarda el fichero y recarga la página en `http://localhost:4321`.
- **Para publicar:** ejecuta `pnpm build`. Si algún YAML tiene un error, el proceso se detiene y te dice el fichero y el campo que hay que corregir.

## Reglas básicas del formato YAML

- Respeta la sangría (los espacios al principio de la línea). Usa espacios, nunca tabuladores.
- Pon los textos entre comillas: `titulo: "Mi título"`.
- Las listas empiezan por `- ` (guion y espacio).
- Lo que va detrás de `#` es un comentario y no se muestra en la web.

## Cambiar el horario

En `horario.yaml`, cada temporada tiene:

- `nombre`: el título que se ve, por ejemplo `"Horario Verano (Julio y Agosto)"`.
- `vigencia`: desde y hasta qué día aplica, en formato `MM-DD`. La web resalta sola la temporada vigente según la fecha del visitante.
- `franjas`: una por grupo de días.
  - `dias` y `horas` son los textos que se ven, tal cual.
  - `dias_semana`, `abre` y `cierra` sirven para el aviso "Abierta ahora / Cerrada ahora" y para Google (1 = lunes … 7 = domingo).
  - Un día cerrado lleva `cerrado: true` y no necesita `abre` ni `cierra`.

Para comprobar cómo se ve el horario en otra fecha, abre la web con `?fecha=` al final, por ejemplo:
`http://localhost:4321/?fecha=2026-07-15T10:30`

## Añadir o cambiar una marca

1. Copia un bloque de `marcas.yaml` y cambia `nombre`, `categoria` y `descripcion`.
2. Si tienes foto o logo, guárdalo en `src/assets/marcas/` (por ejemplo `eucerin.webp`) y añade `foto: "eucerin.webp"`. Sin foto se muestran las iniciales de la marca.
3. Las categorías nuevas aparecen solas en los filtros.
4. Cuando el texto sea definitivo, quita `provisional: true`.

## Cambiar los textos de las secciones

En `secciones.yaml`, cada sección tiene `titulo`, `antetitulo`, `subtitulo`, `parrafos` y `tarjetas`.
Los iconos de las tarjetas son nombres de [Phosphor Icons](https://phosphoricons.com), por ejemplo `heartbeat` o `leaf`.
Si escribes un nombre que no existe, el build te avisa.

`provisional: true` marca los textos de ejemplo. En desarrollo se ve una etiqueta "Texto provisional" sobre la sección; en la web publicada no aparece. Cuando el texto sea definitivo, cámbialo a `provisional: false`.

`video: { desde, hasta }` indica qué segundos del vídeo de fondo acompañan a cada sección mientras se hace scroll. El vídeo dura 35,29 s.

## Contacto

En `contacto.yaml`:

- `whatsapp.numero`: con prefijo de país y sin espacios ni `+` (`"34680143623"`).
- `telefono.numero`: con `+34` y sin espacios (`"+34965651554"`).
- Los campos `visible` son cómo se muestra el número en la web.
