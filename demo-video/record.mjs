// Records the landing's product demo from the real app running against the
// Firebase emulators with the seeded demo data (see README.md in this folder).
// Writes JPEG frames, their timings and the clicks/keystrokes to OUT_DIR;
// build.py turns them into the video, its sound and the poster.
import { mkdirSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { chromium } from '@playwright/test';

const APP = process.env.APP_URL || 'http://localhost:3000';
const OUT = process.env.OUT_DIR || `demo-video/out/${process.env.DEMO_LANG || 'en'}`;
const OWNER = { email: 'barberia@demo.test', password: 'demo1234' };
const VIEWPORT = { width: 1280, height: 720 };

// One take per language (DEMO_LANG=en|es). The interface texts the script
// clicks on come from the app's own copy, so they follow its wording.
const LANG = process.env.DEMO_LANG || 'en';
const { default: ui } = await import(`../saas-booking-app/src/i18n/${LANG}.js`);
const TAKES = {
  en: {
    business: { name: 'Oak Street Barbers', currency: 'USD', timezone: 'America/New_York' },
    service: { name: 'Fade', minutes: '45', price: '35' },
    // The seeded services are Spanish and priced in colones.
    services: [['Corte', 'Haircut', '30'], ['Barba', 'Beard trim', '20'], ['Corte y barba', 'Haircut & beard', '45']],
    client: { name: 'Emily Carter', email: 'emily@example.com' },
    locale: 'en-US',
    // Client page copy (saas-booking-app/src/i18n/clientCopy.js).
    book: 'Book appointment',
    confirmed: 'Your appointment is confirmed',
    dayLabel: (d) => `${d.toLocaleDateString('en-US', { weekday: 'long' })}, ${d.toLocaleDateString('en-US', { month: 'long' })} ${d.getDate()}`,
  },
  es: {
    business: { name: 'Barbería El Roble', currency: 'CRC', timezone: 'America/Costa_Rica' },
    service: { name: 'Fade', minutes: '45', price: '7000' },
    services: [],
    client: { name: 'María Rodríguez', email: 'maria@example.com' },
    locale: 'es-CR',
    book: 'Reservar cita',
    confirmed: 'Tu cita está confirmada',
    dayLabel: (d) => `${d.toLocaleDateString('es', { weekday: 'long' })} ${d.getDate()} de ${d.toLocaleDateString('es', { month: 'long' })}`,
  },
};
const TAKE = TAKES[LANG];
const { service: SERVICE, client: CLIENT } = TAKE;
const BUSINESS_NAME = TAKE.business.name;
const S = ui.settings;

// A pointer drawn in the page, since headless screenshots have no cursor.
const CURSOR = () => {
  const install = () => {
    if (document.getElementById('demo-cursor')) return;
    const c = document.createElement('div');
    c.id = 'demo-cursor';
    c.innerHTML = '<svg width="26" height="30" viewBox="0 0 26 30"><path d="M2 2 L2 24 L8 18.5 L12.5 28 L16.5 26 L12 17 L20 17 Z" fill="#1F2328" stroke="#fff" stroke-width="2" stroke-linejoin="round"/></svg>';
    Object.assign(c.style, { position: 'fixed', left: '-40px', top: '-40px', zIndex: 2147483647, pointerEvents: 'none', transition: 'transform 80ms' });
    document.documentElement.appendChild(c);
    const ring = document.createElement('div');
    Object.assign(ring.style, { position: 'fixed', width: '34px', height: '34px', marginLeft: '-17px', marginTop: '-17px', borderRadius: '50%', border: '3px solid #2450B8', zIndex: 2147483646, pointerEvents: 'none', opacity: 0, transform: 'scale(.4)', transition: 'opacity 350ms, transform 350ms' });
    document.documentElement.appendChild(ring);
    addEventListener('mousemove', (e) => { c.style.left = `${e.clientX - 2}px`; c.style.top = `${e.clientY - 2}px`; }, true);
    addEventListener('mousedown', (e) => {
      c.style.transform = 'scale(.85)';
      Object.assign(ring.style, { left: `${e.clientX}px`, top: `${e.clientY}px`, transition: 'none', opacity: 1, transform: 'scale(.4)' });
      requestAnimationFrame(() => requestAnimationFrame(() => Object.assign(ring.style, { transition: 'opacity 350ms, transform 350ms', opacity: 0, transform: 'scale(1.3)' })));
    }, true);
    addEventListener('mouseup', () => { c.style.transform = ''; }, true);
  };
  if (document.readyState === 'loading') addEventListener('DOMContentLoaded', install); else install();
};

// The next Sunday at least two days away: the barber opens Sundays on camera.
const nextSunday = () => {
  const d = new Date();
  d.setDate(d.getDate() + 2);
  while (d.getDay() !== 0) d.setDate(d.getDate() + 1);
  return d;
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// One continuous timeline across pages. Only the page "on camera" sends frames;
// time spent off camera (logins, page loads) is left out of the video.
class Recorder {
  constructor() {
    this.frames = [];
    this.events = [];
    this.segments = [];
    this.session = null;
  }

  now() { return Date.now() / 1000; }

  async start(page) {
    await this.stop();
    const session = await page.context().newCDPSession(page);
    const segment = { start: this.now(), end: null };
    this.segments.push(segment);
    session.on('Page.screencastFrame', ({ data, sessionId }) => {
      const file = `f${String(this.frames.length).padStart(5, '0')}.jpg`;
      writeFileSync(join(OUT, 'frames', file), Buffer.from(data, 'base64'));
      this.frames.push({ file, t: this.now(), segment: this.segments.length - 1 });
      session.send('Page.screencastFrameAck', { sessionId }).catch(() => {});
    });
    await session.send('Page.startScreencast', { format: 'jpeg', quality: 92, maxWidth: 1920, maxHeight: 1080 });
    this.session = session;
    this.segment = segment;
    await sleep(150);
  }

  async stop() {
    if (!this.session) return;
    await sleep(100);
    this.segment.end = this.now();
    await this.session.send('Page.stopScreencast').catch(() => {});
    await this.session.detach().catch(() => {});
    this.session = null;
  }

  mark(type) {
    if (this.session) this.events.push({ type, t: this.now(), segment: this.segments.length - 1 });
  }

  // Frame times and events relative to the start of the video.
  timeline() {
    let offset = 0;
    const startOf = this.segments.map((s) => {
      const at = offset;
      offset += s.end - s.start;
      return at;
    });
    const rel = (x) => startOf[x.segment] + Math.max(0, x.t - this.segments[x.segment].start);
    return {
      duration: offset,
      segments: this.segments.map((s, i) => ({ start: startOf[i], duration: s.end - s.start })),
      frames: this.frames.map((f) => ({ file: f.file, t: rel(f) })),
      events: this.events.map((e) => ({ type: e.type, t: rel(e) })),
    };
  }
}

const rec = new Recorder();
const pointers = new WeakMap();

const glide = async (page, x, y) => {
  const from = pointers.get(page) || { x: VIEWPORT.width / 2, y: VIEWPORT.height / 2 };
  const steps = Math.max(12, Math.min(36, Math.round(Math.hypot(x - from.x, y - from.y) / 18)));
  for (let i = 1; i <= steps; i += 1) {
    const k = i / steps;
    const e = k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2;
    await page.mouse.move(from.x + (x - from.x) * e, from.y + (y - from.y) * e);
    await sleep(14);
  }
  pointers.set(page, { x, y });
};

const scrollTo = async (locator, block = 'center') => {
  await locator.evaluate((el, b) => el.scrollIntoView({ behavior: 'smooth', block: b }), block);
  await sleep(900);
};

const pointAt = async (page, locator) => {
  let box = await locator.boundingBox();
  if (box.y < 70 || box.y + box.height > VIEWPORT.height - 20) {
    await scrollTo(locator);
    box = await locator.boundingBox();
  }
  await glide(page, box.x + box.width / 2, box.y + box.height / 2);
  await sleep(180);
};

const click = async (page, locator, pause = 450) => {
  await pointAt(page, locator);
  rec.mark('click');
  await page.mouse.down();
  await sleep(70);
  await page.mouse.up();
  await sleep(pause);
};

const type = async (page, locator, text) => {
  await click(page, locator, 150);
  await locator.fill('');
  for (const ch of text) {
    rec.mark('key');
    await page.keyboard.type(ch);
    await sleep(55 + Math.random() * 40);
  }
  await sleep(250);
};

const choose = async (page, locator, value) => {
  await click(page, locator, 200);
  await locator.selectOption(value);
  await page.keyboard.press('Escape').catch(() => {});
  await sleep(450);
};

const optionValue = (page, select, text) => page.locator(`${select} option`, { hasText: text }).first().getAttribute('value');

const main = async () => {
  rmSync(OUT, { recursive: true, force: true });
  mkdirSync(join(OUT, 'frames'), { recursive: true });

  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
  const options = { viewport: VIEWPORT, deviceScaleFactor: 1.5, locale: TAKE.locale, timezoneId: TAKE.business.timezone };
  // The owner's interface language (the app's EN/ES switch keeps it here).
  const setLanguage = (lang) => { try { localStorage.setItem('reserveease.language', lang); } catch { /* ignore */ } };

  // Off camera: the owner signs in and sets up the business for this take.
  const owner = await browser.newContext(options);
  await owner.addInitScript(CURSOR);
  await owner.addInitScript(setLanguage, LANG);
  const barber = await owner.newPage();
  await barber.goto(`${APP}/login`);
  await barber.fill('input[type=email]', OWNER.email);
  await barber.fill('input[type=password]', OWNER.password);
  await barber.click('button[type=submit]');
  await barber.waitForURL(/\/dashboard/);
  await barber.goto(`${APP}/settings`);
  const nameInput = barber.locator('#businessName');
  await nameInput.waitFor();
  await sleep(800);
  await nameInput.fill(BUSINESS_NAME);
  await barber.locator('#timezone').selectOption(TAKE.business.timezone);
  await barber.locator('#currency').selectOption(TAKE.business.currency);
  await barber.locator('#language').selectOption(LANG);
  const save = barber.getByRole('button', { name: ui.common.saveChanges });
  if (await save.isEnabled()) {
    await save.click();
    await sleep(2500);
  }
  for (const [from, name, price] of TAKE.services) {
    await barber.getByRole('button', { name: S.services.edit(from), exact: true }).click();
    await barber.getByLabel(S.services.name).fill(name);
    await barber.getByLabel(S.services.price, { exact: true }).fill(price);
    await barber.getByRole('button', { name: S.services.update, exact: true }).click();
    await barber.getByRole('button', { name: S.services.edit(name), exact: true }).waitFor();
    await sleep(600);
  }
  await barber.reload();
  await barber.locator('#horario').waitFor();
  await sleep(1200);
  await barber.evaluate(() => document.getElementById('horario').scrollIntoView({ block: 'start' }));
  await barber.evaluate(() => window.scrollBy(0, -16));
  await barber.mouse.move(900, 560);
  pointers.set(barber, { x: 900, y: 560 });
  await sleep(500);

  // 1. The barber opens Sundays and adds a service.
  await rec.start(barber);
  await sleep(900);
  const sunday = barber.locator('#horario label', { hasText: S.days.sunday }).locator('input[type=checkbox]');
  await click(barber, sunday, 500);
  await choose(barber, barber.getByLabel(S.hours.closes(S.days.sunday)), '1:00 PM');
  await sleep(300);

  await scrollTo(barber.locator('#servicios'), 'start');
  await type(barber, barber.getByLabel(S.services.name), SERVICE.name);
  await type(barber, barber.getByLabel(S.services.duration), SERVICE.minutes);
  await type(barber, barber.getByLabel(S.services.price, { exact: true }), SERVICE.price);
  await click(barber, barber.getByRole('button', { name: S.services.addButton, exact: true }), 1100);

  // Luis offers it.
  await scrollTo(barber.locator('#personal'), 'start');
  await click(barber, barber.getByRole('button', { name: S.staff.edit('Luis'), exact: true }), 600);
  await click(barber, barber.locator('#personal label', { hasText: SERVICE.name }).locator('input[type=checkbox]'), 400);
  await click(barber, barber.getByRole('button', { name: S.staff.update }), 1300);
  await rec.stop();

  // Off camera: the dashboard is already open on that Sunday, still empty.
  const day = nextSunday();
  await barber.goto(`${APP}/dashboard`);
  await barber.locator('.grid-cols-7 > button').first().waitFor();
  await sleep(1200);
  const dayLabel = TAKE.dayLabel(day);
  if (day.getMonth() !== new Date().getMonth()) await barber.getByRole('button', { name: ui.calendar.next }).click();
  await barber.locator(`.grid-cols-7 > button:is([aria-label="${dayLabel}"], [aria-label^="${dayLabel},"])`).click();
  await barber.mouse.move(1000, 640);
  pointers.set(barber, { x: 1000, y: 640 });
  await sleep(1200);

  // 2–4. A client opens the booking link and books.
  const visitor = await browser.newContext(options);
  await visitor.addInitScript(CURSOR);
  await visitor.addInitScript(setLanguage, LANG);
  const client = await visitor.newPage();
  await client.goto(`${APP}/book/barberia-demo`);
  await client.getByText(BUSINESS_NAME, { exact: true }).waitFor();
  await sleep(1000);
  await client.mouse.move(640, 600);
  pointers.set(client, { x: 640, y: 600 });

  await rec.start(client);
  await sleep(1300);
  await choose(client, client.locator('#serviceId'), await optionValue(client, '#serviceId', SERVICE.name));
  await choose(client, client.locator('#staffId'), await optionValue(client, '#staffId', 'Luis'));
  await click(client, client.locator('#date'), 500);
  if (day.getMonth() !== new Date().getMonth()) await click(client, client.locator('.react-datepicker__navigation--next'), 400);
  const dd = String(day.getDate()).padStart(3, '0');
  await click(client, client.locator(`.react-datepicker__day--${dd}:not(.react-datepicker__day--outside-month)`), 900);
  await scrollTo(client.locator('fieldset'), 'center');
  const slot = client.locator('fieldset button').nth(2);
  await slot.waitFor();
  await sleep(300);
  await click(client, slot, 500);

  await scrollTo(client.locator('#clientName'), 'center');
  await type(client, client.locator('#clientName'), CLIENT.name);
  await type(client, client.locator('#email'), CLIENT.email);
  await sleep(200);
  await click(client, client.getByRole('button', { name: TAKE.book }), 0);
  await client.waitForURL(/\/booking\/success\//);
  await client.getByText(TAKE.confirmed).waitFor();
  rec.mark('success');
  await sleep(2600);
  await rec.stop();

  // 5. Back on the barber's dashboard: it refreshes when the tab gets focus.
  await rec.start(barber);
  await sleep(900);
  await barber.evaluate(() => window.dispatchEvent(new Event('focus')));
  await barber.getByText(CLIENT.name).first().waitFor();
  rec.mark('pop');
  await sleep(700);
  await pointAt(barber, barber.getByText(CLIENT.name).first());
  await sleep(2600);
  await rec.stop();

  const timeline = rec.timeline();
  writeFileSync(join(OUT, 'timeline.json'), JSON.stringify(timeline, null, 1));
  console.log(`Recorded ${timeline.frames.length} frames, ${timeline.duration.toFixed(1)} s, ${timeline.events.length} events`);
  await browser.close();
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
