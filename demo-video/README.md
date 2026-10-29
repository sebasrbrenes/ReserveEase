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

The camera work (eased zooms that follow each click and frame the whole field,
a closer look at the confirmation and at the new appointment) is rendered by
[screenstudio-alt](https://github.com/connerkward/screenstudio-alternative-skill)'s
`render.py`, vendored in `vendor/screenstudio-alt/` (MIT). The page is drawn at
1.5x, so the frames are 1920x1080 and the zooms stay sharp in the 1280x720 video.

There is one take per language, `reserveease-demo-en.mp4` and
`reserveease-demo-es.mp4`, each with its poster. The English take renames the
seeded services and uses dollars and New York time off camera; the Spanish one
uses colones and Costa Rica time. The landing plays the take of the visitor's
language.

## Re-recording

Needs ffmpeg (with libx264) and Python with numpy and Pillow.

```sh
npm run emulators                     # terminal 1, from the repo root
npm run seed                          # fresh demo data, before each take
# terminal 2: the API and the app, as in playwright.config.js
(cd saas-booking-backend && APP_ENV=local FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 \
  FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 FIREBASE_PROJECT_ID=demo-reserveease \
  PORT=3001 FRONTEND_URL=http://localhost:3000 NOTIFICATIONS_MODE=mock node server.js) &
(cd saas-booking-app && VITE_USE_EMULATORS=true VITE_BACKEND_URL=http://localhost:3001 npx vite --port 3000) &

DEMO_LANG=en node demo-video/record.mjs   # frames and timings in demo-video/out/en/
python3 demo-video/build.py en            # writes the .mp4 and the poster to the landing
```

Then `npm run seed` again and the same with `es`. `build.py` prints the time
where each step starts; copy them into `demo.steps` in
`saas-booking-landing/src/i18n/en.js` (or `es.js`). The texts the script clicks
on come from the app's own copy (`saas-booking-app/src/i18n/`), so they follow
its wording. Set `CHROMIUM_PATH` to use a specific Chromium build. The seed
leaves earlier bookings in place: to start from nothing, restart the emulators.
