import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useInView, useReducedMotion } from 'framer-motion';
import Scene from './Scene';
import Highlight from './Highlight';
import { BUSINESS } from './demo';

const SLOTS = ['9:30', '10:30', '11:00', '12:00', '14:00', '15:30'];

// The race, step by step. Each step starts at its time (ms) after the scene is in view.
const STEPS = [
  { at: 0 },     // 0: both phones open the link
  { at: 700 },   // 1: both fingers go to 10:30
  { at: 1500 },  // 2: both tap at once
  { at: 2700 },  // 3: María gets it, Carlos is told to pick another time
  { at: 4300 },  // 4: Carlos goes to 11:00
  { at: 5100 },  // 5: Carlos taps it
  { at: 5800 },  // 6: Carlos gets 11:00
];
const LAST = STEPS.length - 1;

const Finger = ({ tapping }) => (
  <motion.span
    aria-hidden="true"
    className="pointer-events-none absolute left-1/2 top-1/2 h-9 w-9 -ml-[1.125rem] -mt-[1.125rem] rounded-full border-2 border-ink bg-ink/15"
    initial={{ opacity: 0, scale: 1.8 }}
    animate={tapping ? { opacity: [1, 1, 0], scale: [1, 0.7, 1.6] } : { opacity: 1, scale: 1 }}
    transition={{ duration: tapping ? 0.6 : 0.35 }}
  />
);

const Check = () => (
  <svg aria-hidden="true" viewBox="0 0 64 64" className="h-16 w-16 text-leaf">
    <motion.circle cx="32" cy="32" r="27" fill="none" stroke="currentColor" strokeWidth="4"
      initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.5 }} />
    <motion.path d="M19 33 L28 42 L46 23" fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"
      initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.35, delay: 0.4 }} />
  </svg>
);

// A phone drawn in ink, showing the client's side of the booking page.
const Phone = ({ who, from, target, step, won, lostAt }) => {
  const pressed = step >= 2;
  const done = won !== null && step >= won;
  const told = lostAt !== null && step >= lostAt && !done;

  return (
    <figure className="w-full max-w-[15rem]">
      <div className="relative h-[19.5rem] sm:h-[27rem] overflow-hidden rounded-[2rem] border-[3px] border-ink bg-white shadow-[5px_5px_0_theme(colors.ink.DEFAULT)]">
        <div className="mx-auto mt-2 h-4 w-16 rounded-full bg-ink" />
        <AnimatePresence mode="wait">
          {done ? (
            <motion.div
              key="done"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex h-[85%] flex-col items-center justify-center px-3 text-center"
            >
              <Check />
              <p className="mt-3 nb-display text-xl sm:text-3xl font-semibold">¡Listo, {who}!</p>
              <p className="mt-2 text-sm text-ink-soft">Sábado a las <strong className="text-ink">{target}</strong></p>
              <p className="mt-1 text-xs text-ink-soft">{BUSINESS}</p>
            </motion.div>
          ) : (
            <motion.div key="pick" exit={{ opacity: 0, y: -12 }} className="px-2.5 pt-3 sm:px-3">
              <p className="truncate text-[0.6rem] font-bold uppercase tracking-[0.12em] text-ink-soft sm:text-[0.65rem]">{BUSINESS}</p>
              <p className="mt-1 font-display text-base font-semibold leading-tight sm:text-lg">Elige una hora</p>
              <p className="text-[0.7rem] text-ink-soft sm:text-xs">Sábado · corte</p>

              <AnimatePresence>
                {told && (
                  <motion.p
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="hd-alert mt-2 border-coral bg-coral-light px-2 py-1.5 text-[0.7rem] leading-snug text-coral"
                  >
                    Alguien acaba de reservar las 10:30. Elige otra hora.
                  </motion.p>
                )}
              </AnimatePresence>

              <div className="mt-3 grid grid-cols-2 gap-1.5 sm:gap-2">
                {SLOTS.map((slot) => {
                  const gone = told && slot === '10:30';
                  const isTarget = slot === target;
                  const fingerHere = isTarget && step >= (target === '10:30' ? 1 : 4) && !done && !gone;
                  const isPressed = isTarget && (target === '10:30' ? pressed : step >= 5);
                  return (
                    <span
                      key={slot}
                      aria-pressed={isPressed && !gone}
                      className={`hd-choice relative text-center text-xs ${gone ? 'line-through opacity-40' : ''}`}
                    >
                      {slot}
                      {fingerHere && <Finger tapping={target === '10:30' ? step === 2 : step === 5} />}
                    </span>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <figcaption className="mt-3 text-center font-hand text-2xl leading-tight">
        {who}, <span className="text-ink-soft">desde {from}</span>
      </figcaption>
    </figure>
  );
};

const LOG = [
  { step: 2, time: '10:29:58.214', text: 'María pide las 10:30' },
  { step: 2, time: '10:29:58.231', text: 'Carlos pide las 10:30', note: '17 milésimas después' },
  { step: 3, time: '10:29:58.240', text: 'Las 10:30 son de María', ok: true },
  { step: 3, time: '10:29:58.241', text: 'A Carlos se le pide otra hora' },
  { step: 6, time: '10:30:03.902', text: 'Las 11:00 son de Carlos', ok: true },
];

const Race = () => {
  const reduce = useReducedMotion();
  const stage = useRef(null);
  const inView = useInView(stage, { once: true, amount: 0.45 });
  const [step, setStep] = useState(reduce ? LAST : 0);
  const [run, setRun] = useState(0);

  useEffect(() => {
    if (reduce) {
      setStep(LAST);
      return undefined;
    }
    if (!inView) return undefined;
    setStep(0);
    const timers = STEPS.map(({ at }, i) => setTimeout(() => setStep(i), at));
    return () => timers.forEach(clearTimeout);
  }, [inView, run, reduce]);

  return (
    <Scene id="la-carrera" time="9:15" labelledBy="race-title">
      <p className="font-hand text-2xl text-marker">lo que pasa y nadie ve</p>
      <h2 id="race-title" className="nb-display mt-2 max-w-4xl text-5xl font-semibold sm:text-6xl md:text-7xl">
        Dos clientes, las 10:30. <em className="font-medium"><Highlight>Solo uno</Highlight></em> se la lleva.
      </h2>
      <p className="mt-6 max-w-2xl text-lg text-ink-soft">
        Pasa más de lo que crees: dos personas abren tu enlace a la vez y tocan la misma hora. Con un formulario
        cualquiera, las dos creen que la tienen. Con ReserveEase, la primera en confirmar se la queda y a la otra
        se le pide otra hora en ese mismo instante.
      </p>

      <p className="sr-only">
        Animación: María, desde Instagram, y Carlos, desde WhatsApp, tocan las 10:30 casi al mismo tiempo. María
        se queda con las 10:30. A Carlos se le avisa que esa hora se acaba de ocupar, elige las 11:00 y la reserva.
        Nadie termina con la misma hora.
      </p>

      <div ref={stage} aria-hidden="true" className="mt-12 grid items-start gap-10 lg:grid-cols-[1fr_auto_1fr]">
        <div className="grid grid-cols-2 gap-4 sm:gap-8 lg:contents">
          <div className="flex justify-center lg:order-1 lg:justify-end">
            <Phone who="María" from="Instagram" target="10:30" step={step} won={3} lostAt={null} />
          </div>
          <div className="flex justify-center lg:order-3 lg:justify-start">
            <Phone who="Carlos" from="WhatsApp" target={step >= 4 ? '11:00' : '10:30'} step={step} won={6} lostAt={3} />
          </div>
        </div>

        {/* What happens inside, as a handwritten log on the agenda. */}
        <div className="lg:order-2 lg:w-80 lg:pt-10">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-ink-soft">Por dentro de tu agenda</p>
          <ol className="mt-3 space-y-3 border-l-2 border-dashed border-ink/30 pl-4">
            {LOG.map((entry) => (
              <motion.li
                key={entry.time}
                initial={false}
                animate={{ opacity: step >= entry.step ? 1 : 0.18 }}
                transition={{ duration: 0.3 }}
              >
                <span className="block font-mono text-[0.7rem] text-ink-soft">{entry.time}</span>
                <span className={`font-semibold ${entry.ok ? 'text-leaf' : ''}`}>{entry.text}</span>
                {entry.note && <span className="ml-1 font-hand text-lg text-coral">{entry.note}</span>}
              </motion.li>
            ))}
          </ol>
          <AnimatePresence>
            {step === LAST && (
              <motion.p
                initial={reduce ? false : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6 font-hand text-2xl leading-snug"
              >
                Ni una hora repetida, ni un mensaje de &ldquo;perdón, ya estaba ocupado&rdquo;.
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      </div>

      {!reduce && (
        <div className="mt-10 flex justify-center">
          <button
            type="button"
            onClick={() => setRun((n) => n + 1)}
            disabled={step !== LAST}
            className="hd-btn hd-btn-secondary text-sm"
          >
            Ver otra vez
          </button>
        </div>
      )}
    </Scene>
  );
};

export default Race;
