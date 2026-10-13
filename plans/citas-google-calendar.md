# Citas · Pedir cita para los servicios con Google Calendar

Plan para que desde la web se pueda pedir cita para un servicio (p. ej. control de tensión). La web ofrece los huecos libres según el horario y el calendario de la farmacia; la cita aparece en un Google Calendar interno de la farmacia con la descripción que deje el cliente.
Pendiente de ejecutar. Siguen vigentes las reglas de [`landing-scroll-world.md`](landing-scroll-world.md):

- **Configuración:** todo dato editable va en `src/config/`.
- **Despliegue:** cada push a `main` se publica en Cloudflare.

Validar en local con `astro dev --background` antes de hacer commit.

---

## Decisiones pendientes

1. **Opción 1 (páginas de reserva de Google, sin desarrollo) u opción 2 (reserva integrada en la web).** Se puede empezar con la 1 para medir la demanda.
2. **Qué servicios se pueden reservar** y cuánto dura cada uno.
3. **¿Una cita a la vez o varias en paralelo?** Por ejemplo, la cabina de tensión y el mostrador de dermofarmacia a la vez.
4. **¿Confirmación automática o la farmacia aprueba cada cita?**
5. **Cuenta de Google de la farmacia:** ¿Google Workspace o Gmail personal? Workspace es lo recomendable por los datos de salud (ver más abajo).

---

## Opción 1: páginas de reserva de Google Calendar (sin desarrollo)

Google Calendar trae «Agenda de citas»: una página de reserva que calcula los huecos libres según el horario configurado y los eventos que ya hay en el calendario. Crea la cita en el calendario de la farmacia, admite preguntas propias en el formulario (sirve para la descripción) y envía la confirmación.

- **En la web:** un botón «Pedir cita» que abra o incruste la página de reserva.
- **Cuenta gratuita:** una sola página de reserva. Con servicios de distinta duración hace falta una página por servicio, y eso requiere Google Workspace Business Standard o superior. Los recordatorios automáticos también son de pago.
- **Diseño:** el de Google, solo con título y descripción; no se adapta al de la web.
- **Formulario:** las preguntas son texto simple y solo se ven en la cita.

---

## Opción 2: reserva integrada en la web

### Arquitectura

```
Web (estática, como ahora)
  └─ «Pedir cita» → servicio → día → hora → datos y descripción
        │
        ▼
Cloudflare Worker (nuevo: /api/citas/*)
  ├─ GET  /api/citas/huecos   → horario + duración del servicio − ocupado en Google Calendar
  ├─ POST /api/citas          → valida, vuelve a comprobar el hueco y crea el evento
  └─ GET  /api/citas/cancelar → enlace firmado del correo: borra el evento
        │
        ▼
Google Calendar de la farmacia (calendario «Citas web»)
```

- **La web sigue siendo estática.** En `wrangler.jsonc` se añade un Worker (`main`) que atiende solo `/api/*`. El resto lo siguen sirviendo los assets de `dist/`, como ahora.
- **Acceso a Google mediante una cuenta de servicio** de Google Cloud:
  - la farmacia comparte el calendario «Citas web» con el correo de esa cuenta, con permiso de «Hacer cambios en los eventos»;
  - la cuenta lee los huecos ocupados (`freebusy.query`) y crea o borra eventos (`events.insert` / `events.delete`);
  - la clave de la cuenta va como secreto del Worker y el token se firma con WebCrypto (JWT RS256), sin dependencias;
  - **no se invita al cliente como asistente:** con una cuenta de servicio eso exige permisos de administración de Workspace (delegación de dominio). La confirmación al cliente se envía por correo desde el Worker.

### Configuración: `src/config/citas.yaml`

```yaml
antelacion_minima_horas: 2      # no se puede reservar con menos antelación
dias_vista: 30                  # hasta cuántos días por adelantado
servicios:
  - id: tension                 # enlaza con la tarjeta de Servicios
    nombre: "Control de tensión"
    duracion_min: 20
    margen_min: 5               # tiempo libre entre citas
    franjas:                    # opcional: solo en estas horas (si no, todo el horario)
      - { dias_semana: [1, 2, 3, 4, 5], desde: "09:30", hasta: "13:30" }
    simultaneas: 1              # citas a la vez (1 = una cabina)
```

- **Horario:** sale de los mismos datos que la tarjeta de Horario (`horario.yaml`, o `horario-google.json` si se ejecuta [`horario-google.md`](horario-google.md); en ese caso los festivos de Google también cierran huecos).
- **Datos para el Worker:** el build genera un JSON con la configuración de citas y el horario, y el Worker lo importa. Un solo origen de datos para la web y la API.

### Cálculo de huecos (`GET /api/citas/huecos?servicio=tension&desde=AAAA-MM-DD`)

1. Genera los huecos posibles de cada día, a partir del horario (y las franjas del servicio) y de la duración más el margen.
2. Quita los pasados y los que no cumplen la antelación mínima.
3. Quita los que se solapan con algo ocupado en el calendario (`freebusy.query` en una sola llamada para todo el rango). Para bloquear una mañana, unas vacaciones o una formación, basta crear un evento en el Google Calendar de la farmacia.
4. Todo en hora de `Europe/Madrid`, con cuidado en los cambios de hora de marzo y octubre.
5. Respuesta cacheada unos 60 s para no consultar a Google en cada visita.

### Reserva (`POST /api/citas`)

**Campos del formulario:**
- nombre;
- teléfono (obligatorio, para avisar de cambios);
- correo (para la confirmación);
- descripción breve (máximo 500 caracteres);
- casilla de privacidad.

**Pasos del Worker:**
1. **Antiabuso:** valida los campos, verifica Cloudflare Turnstile (antispam invisible y sin cookies) y aplica un límite de peticiones por IP (binding de rate limiting de Cloudflare).
2. **Sin dobles reservas:** las reservas pasan de una en una por un **Durable Object** (un proceso único que las atiende en orden). Dentro, vuelve a comprobar con `freebusy.query` que el hueco sigue libre. Si ya no lo está, responde «Ese hueco acaba de ocuparse» y la web recarga los huecos.
3. **Crea el evento:**
   - título: «Control de tensión · Ana García»;
   - descripción: teléfono, correo y texto del cliente;
   - `colorId` propio para distinguir las citas web;
   - `extendedProperties.private` con el origen (`web`) y un identificador de la cita.
4. **Avisos:**
   - correo de confirmación al cliente, con un enlace para cancelar (token firmado con HMAC, sin base de datos);
   - correo opcional a la farmacia;
   - se envían con un servicio transaccional (p. ej. Resend, plan gratuito) desde el dominio de la farmacia, con SPF y DKIM configurados.
5. **Si Google no responde:** error claro en la web, con los botones de llamar y WhatsApp.

### Interfaz

- **Botón «Pedir cita»:** en las tarjetas de Servicios que tengan cita (campo `cita: tension` en `secciones.yaml`) y en Contáctanos.
- **Ventana (`<dialog>`) en pasos:** servicio → días con huecos (próximas 2 semanas, los días sin huecos desactivados) → horas → datos y descripción → confirmación.
- **Accesibilidad:** foco controlado, Escape para cerrar y textos de estado para lectores de pantalla.
- **Sin JavaScript:** el botón es un enlace a WhatsApp con el servicio en el mensaje.
- **Diseño:** el de la web (tarjetas, botones y tipografía actuales), adaptado a móvil.

### Datos de salud (RGPD)

La descripción puede contener datos de salud (medicación, diagnósticos), que son de **categoría especial** según el RGPD.

- **Consentimiento y aviso:** casilla de consentimiento explícito y una nota junto al campo, por ejemplo: «Indica solo lo necesario; no hace falta que detalles medicación ni diagnósticos».
- **Calendario en Google Workspace,** no en un Gmail personal: Workspace incluye el acuerdo de tratamiento de datos de Google.
- **Actualizar `/privacidad`:** finalidad (gestión de citas), base legal, conservación, y Google, Cloudflare y el servicio de correo como encargados del tratamiento.
- **Conservación limitada:** una tarea programada del Worker borra la descripción y los datos de contacto de las citas pasadas al cabo de X días (a decidir con la farmacia).
- **Revisión:** que lo revise quien lleve la protección de datos de la farmacia antes de publicarlo. Este plan es orientativo, no asesoramiento legal.

### Coste

Todo con planes gratuitos para este volumen: la API de Google Calendar, el Worker y el Durable Object de Cloudflare, Turnstile y el servicio de correo (~3.000 envíos al mes). El único coste posible es Google Workspace, si la farmacia aún no lo tiene.

### Fases

1. **Lo básico:** `citas.yaml`, huecos, reserva, evento en el calendario y aviso por correo a la farmacia.
2. **Confirmación y cancelación** por correo para el cliente.
3. **Recordatorio** el día antes, con una tarea programada del Worker.
4. **Opcional:** aprobación por la farmacia. La cita se crea como provisional (`status: tentative`) y el cliente recibe la confirmación cuando la farmacia la acepta. Requiere detectar el cambio en el calendario (notificaciones push de la API de Calendar o una revisión periódica).

---

## Pruebas antes de dar por terminado

- **Huecos:**
  - respetan el horario, la duración, el margen, las franjas, la antelación mínima y los días a la vista;
  - un evento creado a mano en el calendario quita sus huecos;
  - el cambio de hora de octubre y de marzo no desplaza ni duplica huecos.
- **Reserva:**
  - crea el evento con todos los datos en el calendario correcto;
  - dos reservas simultáneas del mismo hueco: solo una sale bien y la otra recibe «hueco ocupado».
- **Antiabuso:** un token de Turnstile inválido o demasiadas peticiones son rechazados.
- **Google caído o credenciales mal:** mensaje claro, sin evento a medias, con llamar y WhatsApp a la vista.
- **Cancelación:** el enlace borra el evento; un enlace manipulado o ya usado no hace nada.
- **Correos:** llegan a Gmail y Outlook sin caer en spam (SPF y DKIM correctos).
- **Interfaz:** escritorio y móvil, teclado y lector de pantalla, sin JavaScript.

---

## Referencias

- [Google Workspace: agenda de citas](https://workspace.google.com/intl/en-GB_uk/resources/appointment-scheduling).
- [Guía de la agenda de citas de Google Calendar (zeeg)](https://zeeg.me/post/google-calendar-appointment-scheduling): funciones gratuitas y de pago (consultado el 13/10/2026).
- [Calendly frente a Google Calendar (Zapier)](https://www.zapier.com/blog/calendly-vs-google-calendar): límites del formulario y del diseño.
- [Cuentas de servicio y asistentes en eventos (TechNetExperts)](https://www.technetexperts.com/?p=12067): por qué no se invita al cliente desde una cuenta de servicio.
