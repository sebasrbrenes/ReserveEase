import { motion, useReducedMotion } from 'framer-motion';
import Scene from './Scene';
import { useLanguage } from '../../i18n/LanguageContext';

const LOOK = [
  { bg: 'bg-sun-light', rotate: -2.5 },
  { bg: 'bg-white', rotate: 1.5 },
  { bg: 'bg-marker-light', rotate: -1 },
  { bg: 'bg-coral-light', rotate: 2 },
  { bg: 'bg-leaf-light', rotate: -1.8 },
  { bg: 'bg-sun-light', rotate: 1.2 },
];

const Notes = () => {
  const reduce = useReducedMotion();
  const { t } = useLanguage();
  const copy = t.notes;
  return (
    <Scene id="preguntas" time={t.times.notes} labelledBy="notes-title">
      <p className="font-hand text-2xl text-marker">{copy.kicker}</p>
      <h2 id="notes-title" className="nb-display mt-2 text-5xl font-semibold sm:text-6xl md:text-7xl">
        {copy.title[0]}<em className="font-medium">{copy.title[1]}</em>{copy.title[2]}
      </h2>

      <ul className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {copy.items.map((note, i) => (
          <motion.li
            key={i}
            className={`relative border-2 border-ink p-6 pt-8 ${LOOK[i].bg}`}
            style={{ borderRadius: '3px 3px 18px 3px', boxShadow: '4px 5px 0 rgba(31,35,40,0.85)' }}
            initial={reduce ? false : { opacity: 0, y: 24, rotate: 0 }}
            whileInView={{ opacity: 1, y: 0, rotate: LOOK[i].rotate }}
            whileHover={reduce ? undefined : { rotate: 0, y: -4 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20, delay: reduce ? 0 : (i % 3) * 0.08 }}
          >
            {/* A strip of tape holding the note */}
            <span aria-hidden="true" className="absolute -top-3 left-1/2 h-6 w-20 -translate-x-1/2 rotate-[-3deg] border border-ink/20 bg-white/70" />
            <h3 className="font-hand text-3xl font-bold leading-tight">{note.q}</h3>
            <p className="mt-3 text-[0.95rem] leading-relaxed text-ink-soft">{note.a}</p>
          </motion.li>
        ))}
      </ul>
    </Scene>
  );
};

export default Notes;
