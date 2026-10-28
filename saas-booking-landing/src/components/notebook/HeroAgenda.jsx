import { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Arrow } from '../Doodles';
import { nextSaturday } from './demo';
import { useBusiness } from './BusinessContext';
import { useLanguage } from '../../i18n/LanguageContext';

// The day page of the demo business. Taken rows are written in pencil; free rows
// can be booked by the visitor, exactly as a client would from the link.
const TIMES = ['9:00', '9:30', '10:00', '10:30', '11:00', '11:30', '12:00'];
const TAKEN_AT = { '9:00': 0, '10:00': 1, '11:30': 2 };

const SPIRAL_RINGS = 9;

const HeroAgenda = () => {
  const reduce = useReducedMotion();
  const { business } = useBusiness();
  const { t, money } = useLanguage();
  const copy = t.agenda;
  const [serviceId, setServiceId] = useState(business.services[0].id);
  const [booked, setBooked] = useState(null);
  const service = business.services.find((s) => s.id === serviceId) ?? business.services[0];
  const day = nextSaturday();
  const weekday = day.toLocaleDateString(t.locale, { weekday: 'long' });
  const month = day.toLocaleDateString(t.locale, { month: 'long' });

  return (
    <div className="relative mx-auto w-full max-w-md">
      <div className="nb-sheet md:rotate-[1.2deg] pt-8">
        {/* Spiral binding */}
        <div aria-hidden="true" className="absolute -top-3 inset-x-6 flex justify-between">
          {Array.from({ length: SPIRAL_RINGS }, (_, i) => (
            <span key={i} className="block h-6 w-3 rounded-full border-2 border-ink bg-paper" />
          ))}
        </div>

        <div className="px-5 sm:px-7 flex items-end justify-between gap-4 border-b-2 border-ink pb-3">
          <div className="leading-none">
            <p className="font-hand text-2xl text-ink-soft capitalize">{weekday}</p>
            <p className="nb-display text-6xl font-semibold">
              {day.getDate()}
              <span className="ml-2 align-top font-hand text-2xl font-bold tracking-normal text-ink-soft">{month}</span>
            </p>
          </div>
          <p className="text-right text-xs font-bold uppercase tracking-[0.14em] text-ink-soft">
            {business.name}
            <span className="block font-semibold normal-case tracking-normal">{business.place}</span>
          </p>
        </div>

        <fieldset className="px-5 sm:px-7 pt-4">
          <legend className="sr-only">{copy.service}</legend>
          <div className="flex flex-wrap gap-2">
            {business.services.map((s) => (
              <button
                key={s.id}
                type="button"
                aria-pressed={s.id === serviceId}
                onClick={() => setServiceId(s.id)}
                className="hd-choice text-xs sm:text-sm"
              >
                {s.name} <span className="font-normal text-ink-soft">· {money(s.price)}</span>
              </button>
            ))}
          </div>
        </fieldset>

        <ol className="mt-3 nb-ruled" style={{ backgroundPosition: '0 12px' }}>
          {TIMES.map((time) => {
            const taken = business.taken[TAKEN_AT[time]];
            const mine = booked === time;
            return (
              <li key={time} className="relative flex items-center gap-4 h-12 px-5 sm:px-7 border-b border-ink/10 last:border-b-0">
                <span className="w-12 shrink-0 text-sm font-extrabold tabular-nums">{time}</span>

                {mine && (
                  <motion.span
                    aria-hidden="true"
                    className="absolute left-[4.75rem] sm:left-[5.25rem] right-4 top-2 bottom-2 bg-sun/80 origin-left"
                    style={{ borderRadius: '3px 10px 4px 12px' }}
                    initial={reduce ? false : { scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ duration: 0.45, ease: [0.65, 0, 0.35, 1] }}
                  />
                )}

                {taken ? (
                  <span className="relative font-hand text-xl text-ink-soft">
                    <span className="sr-only">{copy.taken}</span>{taken}
                  </span>
                ) : mine ? (
                  <span className="relative flex flex-1 items-center justify-between gap-2">
                    <motion.span
                      className="font-hand text-2xl font-bold text-marker-dark"
                      initial={reduce ? false : { opacity: 0, x: -6 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: reduce ? 0 : 0.35 }}
                    >
                      {copy.you} · {service.name.toLowerCase()}
                    </motion.span>
                    <motion.span
                      className="nb-stamp bg-white/70"
                      initial={reduce ? false : { opacity: 0, scale: 1.8, rotate: -18 }}
                      animate={{ opacity: 1, scale: 1, rotate: -8 }}
                      transition={{ delay: reduce ? 0 : 0.55, type: 'spring', stiffness: 380, damping: 18 }}
                    >
                      {copy.booked}
                    </motion.span>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => setBooked(time)}
                    className="group relative flex flex-1 items-center justify-between self-stretch text-left text-sm text-ink-soft/70 hover:text-marker focus-visible:text-marker"
                  >
                    <span className="font-hand text-xl">{copy.free}</span>
                    <span className="font-bold opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                      {copy.bookAt(time)}
                    </span>
                  </button>
                )}
              </li>
            );
          })}
        </ol>

        <div className="border-t-2 border-ink px-5 sm:px-7 py-4 min-h-[5.5rem]" aria-live="polite">
          {booked ? (
            <div className="flex items-start justify-between gap-4">
              <p className="text-sm">
                <strong>{copy.done(booked)}</strong> {copy.doneText}
              </p>
              <button type="button" onClick={() => setBooked(null)} className="hd-link text-sm shrink-0">
                {copy.again}
              </button>
            </div>
          ) : (
            <p className="text-sm text-ink-soft">
              {copy.summary(service, money(service.price))}
            </p>
          )}
        </div>
      </div>

      {/* Hint for first-time visitors, pointing up at the free times. */}
      <p aria-hidden="true" className={`mt-5 flex items-center justify-center gap-2 font-hand text-2xl text-marker transition-opacity ${booked ? 'opacity-0' : 'opacity-100'}`}>
        <Arrow className="h-7 w-12 -rotate-[100deg] -scale-y-100" />
        {copy.hint}
      </p>
    </div>
  );
};

export default HeroAgenda;
