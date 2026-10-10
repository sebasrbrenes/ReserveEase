import { useState } from 'react';
import { Arrow, Logo, Scribble, Sparkle, Star, Underline } from './Doodles';

// The Hand-Drawn direction sheet and component gallery, at /style-guide.
const COLORS = [
  ['paper', 'bg-paper', 'Page background'],
  ['ink', 'bg-ink', 'Text, borders, shadows'],
  ['marker', 'bg-marker', 'Primary actions, links'],
  ['sun', 'bg-sun', 'Highlights, selected choices'],
  ['leaf', 'bg-leaf', 'Success'],
  ['coral', 'bg-coral', 'Errors, cancellations'],
];

function Section({ title, children }) {
  return (
    <section className="hd-card p-6 space-y-4">
      <h2 className="hd-title text-4xl">{title}</h2>
      {children}
    </section>
  );
}

export default function StyleGuide() {
  const [picked, setPicked] = useState('10:30');

  return (
    <div className="hd-page py-10 px-4">
      <div className="max-w-4xl mx-auto space-y-8">
        <header className="space-y-3">
          <div><Logo /></div>
          <h1 className="relative inline-block">
            <span className="hd-title text-6xl">Hand-Drawn style</span>
            <Underline className="absolute -bottom-3 left-0 w-full h-4 text-sun" />
          </h1>
          <p className="text-ink-soft max-w-2xl">
            Handwriting for titles and short notes, a clear sans-serif for everything people read or type.
            Strokes and doodles decorate; they never stand in for controls, times or status.
          </p>
        </header>

        <Section title="Colors">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {COLORS.map(([name, bg, use]) => (
              <div key={name} className="flex items-center gap-3">
                <span className={`w-12 h-12 border-2 border-ink rounded-lg ${bg}`} aria-hidden="true" />
                <span>
                  <span className="block font-bold">{name}</span>
                  <span className="block text-sm text-ink-soft">{use}</span>
                </span>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Type">
          <p className="hd-title text-5xl">Caveat · Reserva tu cita, ¿mañana?</p>
          <p className="text-lg">Nunito · Corte clásico con Ñuño, 30 min, ₡8 500 · 10:30 a. m. · 0123456789</p>
          <p className="hd-help">Caveat only for titles and short accents. Forms, dates, prices, states and errors use Nunito.</p>
        </Section>

        <Section title="Buttons and fields">
          <div className="flex flex-wrap gap-4">
            <button type="button" className="hd-btn">Book Appointment</button>
            <button type="button" className="hd-btn hd-btn-secondary">Cancel</button>
            <button type="button" className="hd-btn" disabled>Disabled</button>
            <a href="#links" className="hd-link self-center">A link</a>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="sg-name" className="hd-label">Full Name *</label>
              <input id="sg-name" className="hd-input" placeholder="Ana Pérez" />
            </div>
            <div>
              <label htmlFor="sg-email" className="hd-label">Email *</label>
              <input id="sg-email" className="hd-input" aria-invalid="true" aria-describedby="sg-email-error" defaultValue="ana@" />
              <p id="sg-email-error" className="hd-error mt-1">Enter a full email address.</p>
            </div>
          </div>
          <fieldset>
            <legend className="hd-label">Time</legend>
            <div className="mt-2 grid grid-cols-4 gap-2 max-w-sm">
              {['9:00', '9:30', '10:30', '11:00'].map((t) => (
                <button key={t} type="button" className="hd-choice" aria-pressed={picked === t} onClick={() => setPicked(t)}>{t}</button>
              ))}
            </div>
          </fieldset>
        </Section>

        <Section title="Status and messages">
          <div className="flex flex-wrap gap-3">
            <span className="hd-badge text-marker bg-marker-light">Confirmed</span>
            <span className="hd-badge text-leaf bg-leaf-light">Completed</span>
            <span className="hd-badge text-coral bg-coral-light">Cancelled</span>
            <span className="hd-badge text-ink bg-sun-light">No-show</span>
          </div>
          <div className="space-y-3">
            <p className="hd-alert border-leaf bg-leaf-light text-ink" role="status">Booking saved. The confirmation email is on its way.</p>
            <p className="hd-alert border-coral bg-coral-light text-ink" role="alert">That time was just taken. Pick another one.</p>
            <p className="hd-alert border-ink bg-sun-light text-ink">Email simulated: SendGrid is not connected yet.</p>
          </div>
        </Section>

        <Section title="Doodles">
          <div className="flex flex-wrap items-center gap-8 text-marker">
            <Underline className="w-32 h-4" />
            <Scribble className="w-32 h-12" />
            <Arrow className="w-24 h-10" />
            <Star className="w-8 h-8 text-sun" />
            <Sparkle className="w-8 h-8" />
          </div>
          <p className="hd-help">Hidden from screen readers, never clickable, never rotated inside forms or the calendar.</p>
        </Section>

        <Section title="Empty state">
          <div className="text-center py-8">
            <p className="hd-title text-4xl mb-2">Nothing booked yet</p>
            <p className="text-ink-soft">Share your booking link and new appointments will show up here.</p>
          </div>
        </Section>
      </div>
    </div>
  );
}
