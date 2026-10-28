# Demo video

The landing's demo (`saas-booking-landing/public/demo/`) is a real recording of
the app running against the Firebase emulators with the seeded demo data. No
screen is mocked: the script clicks through the app the way a person would and
only adds a drawn pointer, since headless browsers have no cursor.

What it shows, in about 40 seconds:

1. The barber opens Sundays, adds the service "Fade" and assigns it to Luis.
2. A client opens the booking link.
3. She picks the service, the barber, the date and a time.
4. The booking is confirmed.
5. The barber's dashboard, already open on that day, refreshes and shows it.

## Re-recording (for example once the app is in English)

Needs ffmpeg (with libx264) and Python with numpy.

```sh
npm run emulators                     # terminal 1, from the repo root
npm run seed                          # fresh demo data
# terminal 2: the API and the app, as in playwright.config.js
(cd saas-booking-backend && APP_ENV=local FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 \
  FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 FIREBASE_PROJECT_ID=demo-reserveease \
  PORT=3001 FRONTEND_URL=http://localhost:3000 NOTIFICATIONS_MODE=mock node server.js) &
(cd saas-booking-app && VITE_USE_EMULATORS=true VITE_BACKEND_URL=http://localhost:3001 npx vite --port 3000) &

node demo-video/record.mjs            # frames and timings in demo-video/out/
python3 demo-video/build.py           # writes the .mp4 and the poster to the landing
```

`build.py` prints the time where each step starts; copy them into `CHAPTERS`
in `saas-booking-landing/src/components/notebook/Demo.jsx`. The texts the
script clicks on (button names, labels) are the app's Spanish copy; update them
in `record.mjs` if the app's wording changes. Set `CHROMIUM_PATH` to use a
specific Chromium build. Run `npm run seed` (or restart the emulators) before
each take: the script adds a service and a booking.
