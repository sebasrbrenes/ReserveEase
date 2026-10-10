# ReserveEase

Agenda de reservas para negocios de servicios (barberías, salones y profesionales que atienden con cita). El negocio configura sus servicios, personal y horarios, comparte un enlace público de reservas y administra las citas desde un panel.

> **Estado:** prototipo funcional en proceso de recuperación. La reserva pública todavía no evita reservas simultáneas del mismo horario ni aísla por completo los datos entre negocios. No usar con clientes reales hasta completar esa etapa. El plan de trabajo está en el documento maestro del proyecto.

## Estructura

| Carpeta | Qué es | Stack |
| --- | --- | --- |
| `saas-booking-app/` | Panel del negocio y página pública de reservas (`/book/:providerId`) | React 18, Vite, Tailwind, Firebase Auth y Firestore |
| `saas-booking-backend/` | API para correo, SMS y webhook de suscripciones | Node, Express, firebase-admin, SendGrid, Twilio |
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
| Barbería Demo | `barberia@demo.test` | `demo1234` | `/book/demo-owner-barberia` |
| Salón Demo | `salon@demo.test` | `demo1234` | `/book/demo-owner-salon` |

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

Sin `VITE_USE_EMULATORS=true`, la app usa la configuración web de Firebase de `src/firebase/config.js`. Esos valores son públicos por diseño; la protección real depende de las reglas de Firestore.

Por defecto `NOTIFICATIONS_MODE=mock`: las rutas de correo y SMS responden sin contactar a SendGrid ni a Twilio. Para enviar mensajes reales hay que poner `NOTIFICATIONS_MODE=live` y las credenciales correspondientes. Esas rutas tienen además un límite de peticiones por IP.

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

Rutas privadas del panel: requieren `Authorization: Bearer <ID token de Firebase>` de una cuenta con correo verificado que sea miembro del negocio (`businesses/{id}/members/{uid}`). Sin token: `401 UNAUTHENTICATED`; otro negocio: `403 FORBIDDEN`. Cada cambio envía `expectedVersion`; si la cita cambió entretanto responde `409 VERSION_CONFLICT`.

| Método y ruta | Estado |
| --- | --- |
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

La CI de GitHub Actions (`.github/workflows/ci.yml`) ejecuta estas comprobaciones en cada push a `main` y en cada PR. Un error de lint hace fallar la CI.

## Despliegue

| Parte | Dónde | Configuración |
| --- | --- | --- |
| App | Vercel | `vercel.json` reescribe todas las rutas a la SPA; definir `VITE_BACKEND_URL` en las variables del proyecto |
| Backend | Render | Variables de `saas-booking-backend/.env.example` |
| Landing | Firebase Hosting | `firebase deploy --only hosting` desde `saas-booking-landing/` tras `npm run build` |

## Limitaciones conocidas

- La reserva pública se guarda desde el navegador sin transacción; dos personas pueden reservar el mismo horario.
- La disponibilidad compara solo la hora de inicio, no la duración del servicio.
- No hay reglas de Firestore versionadas ni pruebas automáticas.
- Los estados de cita (`Pending`, `Canceled`, `Cancelled`, `Confirmed`) no son consistentes entre pantallas.
- La ruta `/verify-email` a la que redirigen registro y login no existe.
- La landing promete funciones (IA, predicciones) que no están implementadas.
