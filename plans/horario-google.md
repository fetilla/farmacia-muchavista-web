# Horario desde Google · Leer el horario de la ficha de Google de la farmacia

Plan para que el horario de la web salga de la ficha de Google de la farmacia (Google Maps / Business Profile), en lugar de mantenerlo a mano en `src/config/horario.yaml`.
Pendiente de ejecutar. Siguen vigentes las reglas de [`landing-scroll-world.md`](landing-scroll-world.md):

- **Configuración:** todo dato editable va en `src/config/`.
- **Despliegue:** cada push a `main` se publica en Cloudflare.

Validar en local con `astro dev --background` antes de hacer commit.

---

## Decisiones tomadas

- **Momento de lectura: al generar la web (opción A).** El horario queda escrito en la página estática y en el JSON-LD. La web sigue siendo estática y el horario no depende de JavaScript para verse.
- **Solo se regenera y publica si cambia el horario en Google y la consulta ha ido bien.** Si Google falla o devuelve lo mismo, no se hace nada.

## Decisiones pendientes

1. **API de Google:**
   - **Places API (New)** (recomendada). Clave de API sin aprobación previa. Gratis en la práctica: los campos de horario son del SKU «Place Details Enterprise», con 1.000 consultas gratis al mes, y una consulta al día son ~30 al mes. Pide dar de alta facturación con tarjeta en Google Cloud. Solo da excepciones (festivos) de los próximos 7 días.
   - **Business Profile API.** Gratis y con horarios especiales con fecha a cualquier plazo. Hay que solicitar acceso y esperar la aprobación: ficha verificada y activa al menos 60 días, con la web puesta en la ficha. Mientras no aprueban, la cuota es 0. Necesita OAuth con una cuenta propietaria o gestora de la ficha.
2. **Temporadas:** Google no tiene temporadas (invierno/verano); guarda un único horario semanal más excepciones por día. Opciones:
   - Mostrar el horario vigente de Google y mantener en `horario.yaml` el de la otra temporada solo para «Ver otros horarios» (recomendada).
   - Mostrar solo lo que diga Google.

   En los dos casos, alguien tiene que cambiar el horario en Google el 1 de julio y el 1 de septiembre.

---

## Cómo funciona

```
GitHub Actions (cron diario)
  └─ scripts/sync-horario-google.mjs
       ├─ consulta Google
       ├─ valida y normaliza la respuesta
       ├─ compara con src/config/horario-google.json
       ├─ si falla o es igual  → termina sin hacer nada
       └─ si es válida y distinta → escribe el JSON, commit y push a main
                                     └─ Cloudflare publica la web (como cualquier push)

astro build
  └─ lee src/config/horario-google.json (nunca llama a Google)
       └─ si no existe o está vacío → usa src/config/horario.yaml
```

- **La compilación nunca llama a Google.** Una caída de Google o de la clave no puede romper ni vaciar la web.
- **El historial de cambios del horario queda en git:** cada cambio es un commit con su fecha.
- **Sin tarea programada en Cloudflare:** se aprovecha el despliegue que ya hace cada push.

---

## Pasos

### 1. Alta en Google (lo hace la farmacia o quien gestione la cuenta)

- **Places API:** crear un proyecto en Google Cloud, activar «Places API (New)», dar de alta la facturación y crear una clave de API restringida solo a Places API (New).
- **Business Profile API:** crear el proyecto y solicitar el acceso con el formulario «Application for Basic API Access». Tras la aprobación (cuota de 300 QPM en la consola), crear credenciales OAuth y obtener un refresh token de una cuenta propietaria o gestora de la ficha.
- **Place ID:** localizar el identificador de la farmacia en Google (Places API) o el nombre de la ubicación (`locations/…`, Business Profile API).

### 2. Script de sincronización: `scripts/sync-horario-google.mjs`

- **Consulta:**
  - Places: `GET https://places.googleapis.com/v1/places/{PLACE_ID}`, con la cabecera `X-Goog-FieldMask: regularOpeningHours,currentOpeningHours,businessStatus` para pagar solo esos campos.
  - Business Profile: `locations.get` con `readMask=regularHours,specialHours,openInfo`.
- **Validación:** la respuesta se da por **fallida** (no se toca nada y el script termina con error, para que se vea en GitHub) si:
  - el HTTP no es 200, hay un error de red o se agota el tiempo de espera (10 s);
  - falta el horario semanal o no tiene ningún tramo;
  - algún tramo tiene horas imposibles (apertura posterior al cierre en el mismo día, días fuera de rango);
  - la ficha no está en estado `OPERATIONAL`. Si Google la marca como cerrada temporal o definitivamente, no se publica automáticamente y se avisa para revisarlo a mano.
- **Normalización:** convertir a un formato propio y estable, para que la comparación no dependa del orden ni de campos irrelevantes de Google:

  ```json
  {
    "semanal": [
      { "dias_semana": [1, 2, 3, 4, 5], "abre": "09:00", "cierra": "21:00" },
      { "dias_semana": [6], "abre": "09:00", "cierra": "14:00" }
    ],
    "especiales": [
      { "fecha": "2026-12-08", "cerrado": true }
    ]
  }
  ```

  - **Horario partido:** tramos separados el mismo día (mañana y tarde).
  - **Días seguidos con el mismo horario:** agrupados, para generar luego «Lun. a Vie.».
  - **Orden fijo y sin fecha de consulta en el fichero:** si no cambia nada, el JSON es idéntico byte a byte.
- **Comparación:** con `src/config/horario-google.json`. Si son iguales, termina sin cambios.
  - **Con Places API:** los horarios especiales solo cubren 7 días, así que la lista `especiales` cambia sola cada día al moverse la ventana. Para no publicar todos los días, se guardan solo los especiales que **difieren del horario semanal**. Un día normal no genera cambio y la web solo se publica cuando entra en la ventana un festivo o un cierre.
- **Escritura:** si la respuesta es válida y distinta, escribe el JSON (2 espacios, salto de línea final).

### 3. Tarea programada: `.github/workflows/sync-horario.yml`

- `schedule: cron: '0 4 * * *'` (una vez al día, de madrugada) y `workflow_dispatch`, para lanzarla a mano.
- **Pasos:** checkout, Node, `node scripts/sync-horario-google.mjs` y, si el fichero ha cambiado (`git diff --quiet` falla), commit y push a `main`.
  - Mensaje del commit: «Horario actualizado desde Google».
- **Secretos:** `GOOGLE_PLACES_API_KEY` y `GOOGLE_PLACE_ID` (o las credenciales OAuth de Business Profile), en los secretos del repositorio. Nunca en el código ni en `src/config/`.
- **Permisos:** `contents: write`, para poder hacer push.
- **Fallo:** si la consulta falla, el job termina en rojo. GitHub avisa por correo y la web sigue con el último horario bueno.

### 4. Lectura en la web

- En `src/content.config.ts`, la colección `horario` usa `src/config/horario-google.json` si existe y es válido; si no, `horario.yaml`, como ahora.
- **Conversión a los datos que ya usa `Horario.astro`** (`dias`, `horas`, `dias_semana`, `abre`, `cierra`, `cerrado`):
  - etiquetas de días agrupados: «Lun. a Vie.», «Sáb.», «Dom.»;
  - horas: «de 9:00 a 21:00 h»; horario partido: «de 9:00 a 14:00 y de 17:00 a 21:00 h»;
  - días sin tramos: «cerrado».
- **Temporadas:** según la decisión pendiente. Por ejemplo, el horario de Google como temporada vigente y la otra temporada del YAML en «Ver otros horarios».
- **Horarios especiales:**
  - el cálculo de «Abierta ahora» (`Horario.astro`) los tiene en cuenta;
  - se muestran en la tarjeta los de los próximos días (p. ej. «Martes 8 de diciembre: cerrado»).
- **JSON-LD** (`pharmacyJsonLd` en `src/lib/config.ts`): `openingHoursSpecification` desde los mismos datos, con los especiales como especificaciones con `validFrom`/`validThrough` del mismo día.

### 5. Documentación

- `src/config/README.md`: explicar que el horario vigente sale de Google y se actualiza solo cada día, y qué sigue editándose en `horario.yaml`.
- Cómo forzar una actualización: lanzar el workflow a mano desde la pestaña Actions de GitHub.

---

## Pruebas antes de dar por terminado

- **Consulta real con la ficha de la farmacia:** el JSON resultante cuadra con lo que se ve en Google Maps.
- **Segunda ejecución sin cambios en Google:** no hay commit.
- **Clave errónea / Google caído** (simular con una clave inválida y con un tiempo de espera de 1 ms): el job falla, no hay commit y la web no cambia.
- **Respuesta sin horario o con la ficha marcada como cerrada:** no hay commit y el job avisa.
- **Festivo dentro de la ventana:** aparece en la tarjeta, el «Abierta ahora» lo respeta y está en el JSON-LD.
- **Sin `horario-google.json`:** la web compila con `horario.yaml` como ahora.
- **Horario partido:** se muestra con los dos tramos.
- **Visual:** la tarjeta compacta de Inicio y la completa de Contáctanos, en escritorio y móvil.

---

## Referencias

- [Places API (New): campos y su SKU](https://developers.google.com/maps/documentation/places/web-service/data-fields): `regularOpeningHours` y `currentOpeningHours` son «Place Details Enterprise».
- [Precios de Google Maps Platform](https://developers.google.com/maps/billing-and-pricing/pricing): Place Details Enterprise, 1.000 gratis al mes y 20 $ cada 1.000 después (consultado el 13/10/2026).
- [Requisitos de acceso a Business Profile API](https://developers.google.com/my-business/content/prereqs).
- [Business Information API: `locations` (`regularHours`, `specialHours`)](https://developers.google.com/my-business/reference/businessinformation/rest/v1/accounts.locations).
