import { useRef } from 'react';
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import Scene from './Scene';
import { Sparkle, Star } from '../Doodles';
import { useBusiness } from './BusinessContext';

const AT = ['21:15', '23:40', '6:50'];
// Where each event sits on the night line (19:00 → 8:00, 13 hours), in percent.
const POS = ['17%', '38%', '76%'];

const Moon = () => (
  <svg aria-hidden="true" viewBox="0 0 40 40" className="h-10 w-10 text-sun">
    <path d="M27 6 A15 15 0 1 0 34 27 A12 12 0 1 1 27 6 Z" fill="currentColor" stroke="#1F2328" strokeWidth="2" strokeLinejoin="round" />
  </svg>
);

const Night = () => {
  const reduce = useReducedMotion();
  const { business } = useBusiness();
  const panel = useRef(null);
  const { scrollYProgress } = useScroll({ target: panel, offset: ['start 0.8', 'end 0.4'] });
  const moonX = useTransform(scrollYProgress, [0, 1], ['0%', '100%']);

  const events = business.night.map((text, i) => ({ at: AT[i], pos: POS[i], text }));

  return (
    <Scene id="la-noche" time="19:00" labelledBy="night-title">
      <p className="font-hand text-2xl text-marker">cuelgas el rótulo de cerrado</p>
      <h2 id="night-title" className="nb-display mt-2 max-w-4xl text-5xl font-semibold sm:text-6xl md:text-7xl">
        Tú cierras a las 7. <em className="font-medium">Tu agenda no.</em>
      </h2>
      <p className="mt-6 max-w-2xl text-lg text-ink-soft">
        La mayoría de la gente piensa en su próxima cita de noche, con el teléfono en la mano. Tu enlace sigue
        abierto mientras duermes, y en la mañana todo está en su lugar.
      </p>

      <div ref={panel} className="relative mt-12 overflow-hidden border-2 border-ink bg-ink px-6 pb-10 pt-8 text-paper sm:px-10"
        style={{ borderRadius: '8px 22px 10px 18px / 18px 10px 22px 8px', boxShadow: '6px 6px 0 #FFD35C' }}>
        <Star className="absolute right-[6%] bottom-10 h-5 w-5 text-sun/70" />
        <Sparkle className="absolute left-[58%] bottom-10 h-4 w-4 text-paper/40" />
        <Star className="absolute left-[8%] bottom-6 h-4 w-4 text-paper/30" />

        {/* Wide screens: a line from closing time to opening time, the moon crossing it as you scroll. */}
        <div className="relative hidden h-44 md:block">
          <div className="absolute inset-x-0 top-24 border-t-2 border-dashed border-paper/40" />
          <span className="absolute left-0 top-28 font-hand text-2xl text-paper/70">19:00 cierras</span>
          <span className="absolute right-0 top-28 font-hand text-2xl text-sun">8:00 abres</span>
          {!reduce && (
            <motion.div className="absolute inset-x-0 top-[4.5rem]" style={{ x: moonX }}>
              <div className="-translate-x-1/2"><Moon /></div>
            </motion.div>
          )}
          {events.map((e, i) => (
            <motion.div
              key={e.at}
              className="absolute top-0 w-40 -translate-x-1/2 text-center lg:w-48"
              style={{ left: e.pos }}
              initial={reduce ? false : { opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ delay: 0.3 + i * 0.35 }}
            >
              <span className="font-mono text-xs text-sun">{e.at}</span>
              <p className="text-sm leading-snug">{e.text}</p>
              <span className="absolute left-1/2 top-[5.6rem] h-3 w-3 -translate-x-1/2 rounded-full border-2 border-paper bg-sun" />
            </motion.div>
          ))}
        </div>

        {/* Phones: the same night as a list. */}
        <ol className="space-y-5 md:hidden">
          <li className="font-hand text-2xl text-paper/70">19:00 cierras</li>
          {events.map((e) => (
            <li key={e.at} className="flex gap-3">
              <span className="mt-0.5 w-12 shrink-0 font-mono text-xs text-sun">{e.at}</span>
              <span className="text-sm leading-snug">{e.text}</span>
            </li>
          ))}
          <li className="font-hand text-2xl text-sun">8:00 abres</li>
        </ol>
      </div>

      {/* The morning after: what the owner finds in the dashboard. */}
      <motion.div
        className="nb-sheet mx-auto mt-12 max-w-xl px-6 py-5 md:-mt-6 md:ml-auto md:mr-6 md:rotate-[-1deg]"
        initial={reduce ? false : { opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.6 }}
      >
        <div className="flex items-baseline justify-between">
          <p className="font-display text-2xl font-semibold">Buenos días</p>
          <p className="font-hand text-xl text-ink-soft">7:58, tu panel</p>
        </div>
        <p className="mt-1 text-sm text-ink-soft">
          <strong className="text-ink">3 reservas nuevas</strong> desde que cerraste, sin contestar un mensaje.
        </p>
        <ul className="mt-4 space-y-2">
          {events.map((e) => (
            <li key={e.at} className="flex items-center gap-3 text-sm">
              <span className="hd-badge border-leaf bg-leaf-light text-leaf">nueva</span>
              <span>{e.text.replace(' reserva ', ': ')}</span>
            </li>
          ))}
        </ul>
      </motion.div>
    </Scene>
  );
};

export default Night;
