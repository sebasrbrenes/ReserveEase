# ReserveEase

Agenda de reservas para negocios de servicios (barberías, salones y profesionales que atienden con cita). El negocio configura sus servicios, personal y horarios, comparte un enlace público de reservas y administra las citas desde un panel.

> **Estado:** listo para pruebas con negocios reales. Las reservas pasan por la API en transacciones (dos personas no pueden tomar la misma hora) y cada negocio solo ve sus datos. Falta cerrar el despliegue de producción: Resend con dominio verificado, dominios autorizados en Firebase Auth y reglas publicadas. El plan de trabajo está en el documento maestro del proyecto.

## Estructura

| Carpeta | Qué es | Stack |
| --- | --- | --- |
| `saas-booking-app/` | Panel del negocio y página pública de reservas (`/book/:slug`), ambos sobre la API v1 | React 18, Vite, Tailwind, Firebase Auth y Firestore |
| `saas-booking-backend/` | API v1 de reservas y proceso que envía los correos a los clientes | Node, Express, firebase-admin, Resend |
| `saas-booking-landing/` | Web promocional | React 18, Vite, Tailwind |
| `Logos/` | Identidad visual | PNG y SVG |

## Requisitos

- Node 20 o superior (la CI usa Node 22).
- Java 11 o superior, para los emuladores de Firebase.

No hace falta ninguna cuenta ni credencial: el desarrollo local usa los emuladores de Firebase con el proyecto ficticio `demo-reserveease`, que no puede tocar recursos reales.

## Arranque local

Cada carpeta es un proyecto independiente con su propio `package-lock.json`. La raíz solo tiene las herramientas de Firebase.

### 1. Emuladores y datos de prueba

```bash
npm ci                       # en la raíz: instala firebase-tools
npm run emulators            # Auth :9099, Firestore :8080, interfaz en http://127.0.0.1:4000
```

En otra terminal, carga dos negocios ficticios (se puede repetir sin duplicar datos):

```bash
cd saas-booking-backend
npm ci
cp .env.example .env         # ya apunta a los emuladores
npm run seed
```

| Negocio | Usuario | Contraseña | Enlace público |
| --- | --- | --- | --- |
| Barbería Demo | `barberia@demo.test` | `demo1234` | `/book/barberia-demo` |
| Salón Demo | `salon@demo.test` | `demo1234` | `/book/salon-demo` |

### 2. Backend

```bash
cd saas-booking-backend
npm run dev                  # http://localhost:3001
```

Con `APP_ENV=local` el backend se niega a arrancar si no apunta a los emuladores, y el seed se niega a escribir fuera de ellos.

### 3. App

```bash
cd saas-booking-app
npm ci
cp .env.example .env.local   # VITE_USE_EMULATORS=true
npm run dev                  # http://localhost:3000
```

Sin `VITE_USE_EMULATORS=true`, la app usa la configuración web de Firebase de las variables `VITE_FIREBASE_*` (ver `.env.example`). Esos valores son públicos por diseño; la protección real depende de las reglas de Firestore (`firestore.rules`): el navegador solo lee y escribe el perfil y la configuración de su propia cuenta, y todo lo relacionado con reservas pasa por la API.

Por defecto `NOTIFICATIONS_MODE=mock`: los correos solo se marcan como simulados y nada sale hacia Resend. Para enviarlos de verdad hay que poner `NOTIFICATIONS_MODE=live`, `RESEND_API_KEY` y `EMAIL_FROM` (con un dominio verificado en Resend).

Los correos de las reservas no salen del navegador. Cada reserva, cambio de hora o cancelación deja una tarea en `notificationJobs` dentro de la misma transacción, y el proceso del backend (`server.js`) las envía:

- Confirmación al reservar, aviso de nueva hora al reprogramar y aviso al cancelar.
- Recordatorio 24 horas antes. Si la reserva se hace dentro de esas 24 horas, solo se envía la confirmación.
- Un recordatorio de una hora anterior o de una cita cancelada nunca se envía.
- Si el proveedor falla, se reintenta a los 1, 5, 25 y 125 minutos; después queda como fallido y el panel ofrece reintentar.
- En modo `mock` las tareas quedan como `simulated` y el panel lo dice ("Correo simulado"); con `live`, `RESEND_API_KEY` y `EMAIL_FROM` se envían por Resend y quedan como `accepted` (aceptado por el proveedor, que no es lo mismo que entregado).
- Si el negocio apaga "Correos a clientes" en Configuración, sus tareas quedan como `disabled` y no se envía nada; el panel muestra "Correos a clientes apagados".
- `NOTIFICATIONS_WORKER=off` desactiva el envío en ese proceso.

### 4. Landing

```bash
cd saas-booking-landing
npm ci
npm run dev
```

## Idiomas

La landing y la app están en inglés (en-US, predeterminado) y español (es). El selector EN/ES guarda la elección en el navegador (`reserveease.language`), y los enlaces de la landing a la app llevan `?lang=` para abrirla en el mismo idioma. Los textos están centralizados:

- Landing: `saas-booking-landing/src/i18n/en.js` y `es.js`.
- Panel, registro y acceso: `saas-booking-app/src/i18n/en.js` y `es.js`.
- Páginas que ven los clientes (reserva, confirmación, gestionar cita): `saas-booking-app/src/i18n/clientCopy.js`, en el idioma que el negocio elige en Configuración. Un negocio nuevo empieza con el idioma en que se registró su dueño.
- Correos de citas: `saas-booking-backend/src/notifications/templates.js`, en el idioma del negocio. Los correos de verificación y de cambio de contraseña los envía Firebase en el idioma de la interfaz.

## API v1

El núcleo nuevo de reservas se construye en `saas-booking-backend/src/` con el modelo de datos v2 del documento maestro:

| Carpeta | Contenido |
| --- | --- |
| `src/domain/` | Esquemas (zod) de negocio, servicio, personal y reserva |
| `src/repositories/` | Acceso a Firestore |
| `src/http/` | Rutas `/api/v1`, validación y formato único de errores |
| `tests/` | Pruebas con Vitest |

Errores con el formato `{ "error": { "code", "message", "fields" }, "requestId" }`.

| Método y ruta | Estado |
| --- | --- |
| `GET /api/v1/public/businesses/:slug` | Disponible: perfil y catálogo públicos (`barberia-demo`, `salon-demo` en el seed) |
| `GET /api/v1/public/businesses/:slug/availability?serviceId=&staffId=&date=YYYY-MM-DD` | Disponible: horarios libres según duración, buffers, antelación mínima, bloqueos y zona horaria del negocio. Solo devuelve horarios, nunca datos de otros clientes |
| `POST /api/v1/public/businesses/:slug/bookings` | Disponible: crea una reserva confirmada de forma atómica. Requiere la cabecera `Idempotency-Key`; un reintento con la misma clave devuelve la misma reserva. Responde `409 SLOT_UNAVAILABLE` si el horario se acaba de ocupar |

Enlace del cliente: cada reserva guarda una clave aleatoria (`manageKey`, solo en el servidor) y los correos de confirmación, cambio y recordatorio llevan el enlace `FRONTEND_URL/manage/:businessId/:appointmentId?k=<clave>`. Una clave equivocada responde `404`, igual que una cita inexistente. El cliente puede mover o cancelar su cita hasta `cancellationNoticeMinutes` antes de que empiece (120 minutos por defecto); después responde `409 TOO_LATE_TO_CHANGE`.

| Método y ruta | Estado |
| --- | --- |
| `GET /api/v1/public/appointments/:businessId/:appointmentId?k=` | Disponible: la cita del cliente (servicio, profesional, hora, estado y hasta cuándo puede cambiarla), sin notas ni datos de contacto |
| `GET /api/v1/public/appointments/:businessId/:appointmentId/availability?k=&date=` | Disponible: horarios libres con el mismo servicio y profesional; su propia hora cuenta como libre |
| `POST /api/v1/public/appointments/:businessId/:appointmentId/reschedule?k=` | Disponible: `{ expectedVersion, startsAt }`, con las mismas reglas que el panel |
| `POST /api/v1/public/appointments/:businessId/:appointmentId/cancel?k=` | Disponible: `{ expectedVersion }`; libera el horario y envía el aviso de cancelación |

Rutas privadas del panel: requieren `Authorization: Bearer <ID token de Firebase>` de una cuenta con correo verificado que sea miembro del negocio (`businesses/{id}/members/{uid}`). Sin token: `401 UNAUTHENTICATED`; otro negocio: `403 FORBIDDEN`. Cada cambio envía `expectedVersion`; si la cita cambió entretanto responde `409 VERSION_CONFLICT`.

| Método y ruta | Estado |
| --- | --- |
| `POST /api/v1/me/business/sync` | Disponible: reconstruye el negocio v2 del usuario a partir de su configuración (servicios, personal, horario, zona horaria y moneda) y devuelve su enlace público. Lo publica cuando tiene nombre, un servicio, alguien que lo atienda y un día abierto. La app lo llama al cargar y al guardar la configuración |
| `DELETE /api/v1/me/account` | Disponible: borra el negocio, su página pública, sus avisos pendientes, la configuración y el acceso. Pide `{ "confirm": true }`, un inicio de sesión de los últimos 10 minutos y que la suscripción no se vaya a renovar |
| `GET /api/v1/businesses/:businessId/availability?serviceId=&staffId=&date=&excludeAppointmentId=` | Disponible: horarios libres para el panel; al reprogramar, la propia cita no bloquea su horario |
| `GET /api/v1/businesses/:businessId/appointments?from=&to=` | Disponible: citas del negocio entre dos fechas locales |
| `POST /api/v1/businesses/:businessId/appointments` | Disponible: reserva creada desde el panel, con las mismas reglas que la pública e `Idempotency-Key` |
| `PATCH /api/v1/businesses/:businessId/appointments/:id` | Disponible: edita contacto o notas sin tocar estado, horario ni fecha de creación |
| `POST /api/v1/businesses/:businessId/appointments/:id/reschedule` | Disponible: mueve la cita (y opcionalmente cambia de profesional) en una sola operación; si el horario nuevo está ocupado la original queda intacta |
| `GET /api/v1/businesses/:businessId/appointments/export` | Disponible: todas las citas del negocio en CSV (solo el dueño) |
| `POST /api/v1/businesses/:businessId/appointments/:id/cancel` | Disponible: cancela, libera el horario y detiene los avisos pendientes; repetirla es seguro |
| `POST /api/v1/businesses/:businessId/appointments/:id/transition` | Disponible: marca `completed` (desde la hora de inicio) o `no_show` (15 minutos después) |

## Comprobaciones

| Comando | Dónde |
| --- | --- |
| `npm run build` | app y landing |
| `npm run lint` | app y landing |
| `node --check <archivo>` | backend (sintaxis) |
| `npm run test:backend` | raíz: pruebas del backend con los emuladores de Firestore y Auth |
| `npm run test:e2e` | raíz: reserva pública (escritorio y móvil), panel, reprogramar, cancelar, aislamiento entre negocios, guardado por secciones de la configuración y accesibilidad (axe, sin problemas graves ni críticos, y sin desplazamiento lateral con zoom al 200 %), con los emuladores y el seed. La primera vez: `npx playwright install chromium` |

La CI de GitHub Actions (`.github/workflows/ci.yml`) ejecuta estas comprobaciones en cada push a `main` y en cada PR. Un error de lint hace fallar la CI.

## Despliegue

| Parte | Dónde | Configuración |
| --- | --- | --- |
| App | Vercel | `vercel.json` reescribe todas las rutas a la SPA; definir `VITE_BACKEND_URL` y las `VITE_FIREBASE_*` de `.env.example` en las variables del proyecto |
| Backend | Render | Variables de `saas-booking-backend/.env.example` |
| Reglas de Firestore | Firebase | `npx firebase deploy --only firestore:rules,firestore:indexes --project <id-del-proyecto>` desde la raíz |
| Landing | Vercel | Proyecto con raíz `saas-booking-landing/`; definir `VITE_APP_URL`, `VITE_CONTACT_EMAIL` y `VITE_SITE_URL` (URL pública de la landing, para las vistas previas al compartir, `robots.txt` y `sitemap.xml`) |

### Suscripción: Basic $15/mes + SMS Add-on $10/mes (Paddle)

Paddle es el comerciante registrado (Merchant of Record): cobra, emite la factura y declara impuestos. El
servidor crea el checkout de Basic (`POST /api/v1/businesses/:id/billing/checkout`) y la app lo abre con
Paddle.js. La suscripción solo cambia con el webhook firmado `POST /api/v1/billing/paddle/webhook`, que
guarda en `businesses/{id}/billing/subscription` todos los ítems, el plan y los complementos (las reglas de
Firestore no dejan escribirlo desde el navegador). Los eventos repetidos (mismo `event_id`) o viejos se ignoran.
`POST .../billing/portal` abre el portal de Paddle para cambiar la tarjeta, ver facturas o cancelar.

Planes y complementos están en `saas-booking-backend/src/billing/catalog.js`: cada uno es una clave y un
price id por variable de entorno, así que uno nuevo no cambia los datos guardados.

**SMS Add-on.** El dueño solicita SMS (`POST .../messaging/sms/request`) y el negocio queda `pending` en
`businesses/{id}/messaging/sms` hasta que su registro 10DLC con las operadoras esté aprobado; entonces se
marca `status: "approved"` en ese documento. Solo con Basic activo y el registro aprobado se puede agregar
(`POST .../billing/addons/sms`): se suma a la misma suscripción con prorrateo inmediato, así que renueva con
Basic. `DELETE .../billing/addons/sms` lo quita sin tocar Basic (Paddle acredita lo no usado). Paddle no
deja cambiar ítems con un pago pendiente (`past_due`) ni con la cancelación programada. El uso se cuenta en
`businesses/{id}/smsUsage/{inicio del ciclo}`, así que empieza de cero en cada renovación.

**Bloqueo sin suscripción.** Desde `BILLING_ENFORCEMENT_DATE`, un negocio sin suscripción activa (`past_due`
conserva acceso mientras Paddle reintenta) recibe `402 SUBSCRIPTION_REQUIRED` en el panel, salvo suscripción,
SMS y exportar citas, y su página pública responde `403 BOOKINGS_PAUSED`. Antes de esa fecha el panel avisa
cuándo empieza. Sin Paddle configurado nunca se bloquea.

1. En una cuenta sandbox de Paddle: producto "ReserveEase Basic" con precio de $15 USD mensuales, producto
   "SMS Reminders" con precio de $10 USD mensuales (mismo intervalo), una API key, un client-side token y un
   destino de notificaciones con la URL del webhook y los eventos `subscription.*`.
2. En Checkout settings, poner como enlace de pago por defecto la URL de la app (Paddle exige un dominio aprobado).
3. Render: `PADDLE_ENV=sandbox`, `PADDLE_API_KEY`, `PADDLE_PRICE_ID_BASIC`, `PADDLE_PRICE_ID_SMS`,
   `PADDLE_WEBHOOK_SECRET` y, cuando se decida, `BILLING_ENFORCEMENT_DATE`. Vercel (app):
   `VITE_PADDLE_CLIENT_TOKEN`. Probar con la tarjeta `4242 4242 4242 4242`.
4. Para cobrar de verdad: verificar la cuenta live, aprobar el dominio, repetir el paso 1 en live y cambiar a
   `PADDLE_ENV=production` con las claves live.

Sin esas variables la app dice que los pagos todavía no están disponibles y no ofrece checkout.

### Recordatorios por SMS (Telnyx)

Solo se envían recordatorios, nunca mensajes promocionales. Cada condición se revisa cuando el recordatorio vence:

1. **Consentimiento.** El formulario público muestra una casilla sin marcar, separada de la reserva, solo si el negocio
   puede enviar SMS. El texto lo arma el servidor (`src/messaging/smsConsent.js`, versionado) y la cita guarda como
   evidencia la versión, el texto, el número, la fecha, el user agent y un hash de la IP. Si el negocio cambia el
   teléfono de la cita, el consentimiento se pierde. Las citas creadas desde el panel nunca tienen consentimiento.
2. **Negocio aprobado.** Las operadoras de EE. UU. exigen registrar a cada negocio (10DLC: su marca, su campaña y su
   número; Telnyx no permite compartir un número entre negocios). El dueño envía sus datos desde Configuración
   (`POST .../messaging/sms/request`), el registro se hace en el portal de Telnyx y el resultado se guarda con
   `node scripts/sms-status.js <businessId> approved +1NUMERO [brandId] [campaignId]` (o `rejected`/`suspended`).
3. **Complemento activo** y recordatorios encendidos.
4. **Sin baja.** Un STOP al número del negocio (webhook `message.received`) lo guarda en
   `businesses/{id}/smsOptOuts/{hash del teléfono}`; START lo quita. HELP lo responde la autorrespuesta del número en Telnyx.
5. **Cuota.** 100 por ciclo, descontados en una transacción junto con la tarea: dos workers no pueden pasarse ni
   contar dos veces. Si Telnyx rechaza el mensaje, la unidad se devuelve.

El SMS se programa 24 horas antes, movido a la franja de 8:00 a 21:00 en la zona del negocio y sin texto con tildes
(cabe en un segmento de 160 caracteres). Cada envío queda en `smsMessages/{tarea}` con el estado y el costo que
reporta Telnyx en `message.sent`/`message.finalized` (webhook firmado con Ed25519, eventos repetidos ignorados).

Configuración: ver `SMS_MODE` y `TELNYX_*` en `saas-booking-backend/.env.example`. Mientras `SMS_MODE` no sea
`live`, todo funciona igual pero los SMS quedan como `simulated`.

## Limitaciones conocidas

- Sin Resend configurado (`NOTIFICATIONS_MODE=live`) los correos solo se simulan. Sin `SMS_MODE=live` los SMS también.
- Telnyx no tiene clave de idempotencia: si el worker se detiene justo después de que Telnyx acepta un SMS y antes de guardarlo, ese SMS podría salir dos veces. El lease de la tarea deja esa ventana en segundos y el id de la tarea viaja como `tag`.
- Plan gratis de Resend: 100 correos al día (UTC) y 3.000 al mes para todos los negocios juntos. Al agotarse la cuota diaria el worker espera al día siguiente sin gastar intentos (máximo 7 esperas); un recordatorio que llega tarde a la cita se descarta.
- El id de cada tarea se envía como clave de idempotencia a Resend (la guarda 24 horas), así que un worker que se detiene después de enviar y antes de guardar el resultado no duplica el correo al reintentarse.
- Las citas guardadas con el modelo anterior (colección raíz `appointments`) no aparecen en el panel; no hay migración.
- Tener o no una suscripción activa todavía no limita el uso de la app: solo se registra y se muestra.
