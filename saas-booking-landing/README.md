# ReserveEase landing

Marketing site for ReserveEase (React + Vite + Tailwind). Its "Sign in" and
"Create account" buttons send visitors to the booking app (`saas-booking-app`).

## Local development

```bash
npm install
cp .env.example .env.local   # then set VITE_APP_URL
npm run dev
```

## Configuration

| Variable       | What it does                                                                 |
| -------------- | ---------------------------------------------------------------------------- |
| `VITE_APP_URL` | URL of the deployed app. Buttons link to `$VITE_APP_URL/login` and `/signup`. |

It is read at build time, so after changing it in Vercel you need to redeploy.

## Deploy on Vercel

The landing is its own Vercel project, separate from the app:

1. In Vercel, **Add New → Project** and import this repository again.
2. Set **Root Directory** to `saas-booking-landing` (framework preset: Vite).
3. Under **Environment Variables**, add `VITE_APP_URL` with the app's URL
   (for example `https://reserveease-app.vercel.app`).
4. Deploy.

`vercel.json` adds the SPA rewrite (so `/terms`, `/privacy-policy`, etc. work
on reload) and the same security headers the app uses.
