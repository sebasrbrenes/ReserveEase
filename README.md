# ReserveEase

Agenda de reservas para negocios de servicios (barberías, salones y profesionales que atienden con cita). El negocio configura sus servicios, personal y horarios, comparte un enlace público de reservas y administra las citas desde un panel.

> **Estado:** listo para pruebas con negocios reales. Las reservas pasan por la API en transacciones (dos personas no pueden tomar la misma hora) y cada negocio solo ve sus datos. Falta cerrar el despliegue de producción: SendGrid con remitente verificado, dominios autorizados en Firebase Auth y reglas publicadas. El plan de trabajo está en el documento maestro del proyecto.

## Estructura

| Carpeta | Qué es | Stack |
| --- | --- | --- |
| `saas-booking-app/` | Panel del negocio y página pública de reservas (`/book/:slug`), ambos sobre la API v1 | React 18, Vite, Tailwind, Firebase Auth y Firestore |
| `saas-booking-backend/` | API v1 de reservas y proceso que envía los correos a los clientes | Node, Express, firebase-admin, SendGrid |
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

Por defecto `NOTIFICATIONS_MODE=mock`: los correos solo se marcan como simulados y nada sale hacia SendGrid. Para enviarlos de verdad hay que poner `NOTIFICATIONS_MODE=live`, `SENDGRID_API_KEY` y `FROM_EMAIL`.

Los correos de las reservas no salen del navegador. Cada reserva, cambio de hora o cancelación deja una tarea en `notificationJobs` dentro de la misma transacción, y el proceso del backend (`server.js`) las envía:

- Confirmación al reservar, aviso de nueva hora al reprogramar y aviso al cancelar.
- Recordatorio 24 horas antes. Si la reserva se hace dentro de esas 24 horas, solo se envía la confirmación.
- Un recordatorio de una hora anterior o de una cita cancelada nunca se envía.
- Si el proveedor falla, se reintenta a los 1, 5, 25 y 125 minutos; después queda como fallido y el panel ofrece reintentar.
- En modo `mock` las tareas quedan como `simulated` y el panel lo dice ("Correo simulado"); con `live`, `SENDGRID_API_KEY` y `FROM_EMAIL` se envían por SendGrid y quedan como `accepted` (aceptado por el proveedor, que no es lo mismo que entregado).
- Si el negocio apaga "Correos a clientes" en Configuración, sus tareas quedan como `disabled` y no se envía nada; el panel muestra "Correos a clientes apagados".
- `NOTIFICATIONS_WORKER=off` desactiva el envío en ese proceso.

### 4. Landing

```bash
cd saas-booking-landing
npm ci
npm run dev
```

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
| `GET /api/v1/businesses/:businessId/availability?serviceId=&staffId=&date=&excludeAppointmentId=` | Disponible: horarios libres para el panel; al reprogramar, la propia cita no bloquea su horario |
| `GET /api/v1/businesses/:businessId/appointments?from=&to=` | Disponible: citas del negocio entre dos fechas locales |
| `POST /api/v1/businesses/:businessId/appointments` | Disponible: reserva creada desde el panel, con las mismas reglas que la pública e `Idempotency-Key` |
| `PATCH /api/v1/businesses/:businessId/appointments/:id` | Disponible: edita contacto o notas sin tocar estado, horario ni fecha de creación |
| `POST /api/v1/businesses/:businessId/appointments/:id/reschedule` | Disponible: mueve la cita (y opcionalmente cambia de profesional) en una sola operación; si el horario nuevo está ocupado la original queda intacta |
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
| Landing | Vercel | Proyecto con raíz `saas-booking-landing/`; definir `VITE_APP_URL` y `VITE_CONTACT_EMAIL` |

### Suscripción ($15 USD/mes con Paddle)

Paddle es el comerciante registrado (Merchant of Record): cobra, emite la factura y declara impuestos. El
servidor crea el checkout con el precio y el negocio (`POST /api/v1/businesses/:id/billing/checkout`) y la app
lo abre con Paddle.js. La suscripción solo cambia con el webhook firmado
`POST /api/v1/billing/paddle/webhook`, que guarda el estado en `businesses/{id}/billing/subscription`
(las reglas de Firestore no dejan escribirlo desde el navegador). `POST .../billing/portal` abre el portal de
Paddle para cambiar la tarjeta, ver facturas o cancelar.

1. En una cuenta sandbox de Paddle: crear el producto y su precio de $15 USD mensuales, una API key, un
   client-side token y un destino de notificaciones con la URL del webhook y los eventos `subscription.*`.
2. En Checkout settings, poner como enlace de pago por defecto la URL de la app (Paddle exige un dominio aprobado).
3. Render: `PADDLE_ENV=sandbox`, `PADDLE_API_KEY`, `PADDLE_PRICE_ID`, `PADDLE_WEBHOOK_SECRET`. Vercel (app):
   `VITE_PADDLE_CLIENT_TOKEN`. Probar con la tarjeta `4242 4242 4242 4242`.
4. Para cobrar de verdad: verificar la cuenta live, aprobar el dominio, repetir el paso 1 en live y cambiar a
   `PADDLE_ENV=production` con las claves live.

Sin esas variables la app dice que los pagos todavía no están disponibles y no ofrece checkout.

## Limitaciones conocidas

- Sin SendGrid configurado (`NOTIFICATIONS_MODE=live`) los correos solo se simulan. No hay SMS.
- Si el proceso se detiene justo después de que el proveedor acepta un correo y antes de guardarlo, ese correo puede enviarse dos veces: SendGrid no deduplica por clave. El id de la tarea viaja en `custom_args` para poder conciliarlo.
- Las citas guardadas con el modelo anterior (colección raíz `appointments`) no aparecen en el panel; no hay migración.
- Tener o no una suscripción activa todavía no limita el uso de la app: solo se registra y se muestra.
