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
- Un proyecto de Firebase con Authentication y Firestore para la app.
- Credenciales de servicio de Firebase para el backend.

## Arranque local

Cada carpeta es un proyecto independiente con su propio `package-lock.json`.

### App

```bash
cd saas-booking-app
npm ci
cp .env.example .env.local   # ajustar VITE_BACKEND_URL si hace falta
npm run dev                  # http://localhost:3000
```

La configuración web de Firebase está en `src/firebase/config.js`. Esos valores son públicos por diseño; la protección real depende de las reglas de Firestore.

### Backend

```bash
cd saas-booking-backend
npm ci
cp .env.example .env         # completar las credenciales de Firebase Admin
npm run dev                  # http://localhost:3001
```

Por defecto `NOTIFICATIONS_MODE=mock`: las rutas de correo y SMS responden sin contactar a SendGrid ni a Twilio. Para enviar mensajes reales hay que poner `NOTIFICATIONS_MODE=live` y las credenciales correspondientes. Esas rutas tienen además un límite de peticiones por IP.

### Landing

```bash
cd saas-booking-landing
npm ci
npm run dev
```

## Comprobaciones

| Comando | Dónde |
| --- | --- |
| `npm run build` | app y landing |
| `npm run lint` | app y landing |
| `node --check <archivo>` | backend (sintaxis) |

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
