import { motion, useReducedMotion } from 'framer-motion';
import Scene from './Scene';
import Highlight from './Highlight';
import HeroAgenda from './HeroAgenda';
import { useBusiness } from './BusinessContext';
import { useLanguage } from '../../i18n/LanguageContext';

const Hero = () => {
  const reduce = useReducedMotion();
  const { business } = useBusiness();
  const { t, appLink } = useLanguage();
  const copy = t.hero;
  const rise = (delay) => (reduce ? {} : {
    initial: { opacity: 0, y: 18 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] },
  });

  return (
    <Scene id="inicio" time={t.times.hero} labelledBy="hero-title">
      <div className="grid grid-cols-[minmax(0,1fr)] items-center gap-14 lg:grid-cols-[1.1fr_0.9fr] lg:gap-10">
        <div>
          <motion.p {...rise(0)} className="font-hand text-2xl text-marker">
            {copy.kicker}
          </motion.p>
          <motion.h1
            {...rise(0.08)}
            id="hero-title"
            className="nb-display mt-3 text-[clamp(3.4rem,9vw,7.75rem)] font-semibold"
          >
            {copy.title[0]}
            <br />
            {copy.title[1]}<em className="font-medium"><Highlight delay={0.7}>{copy.title[2]}</Highlight></em>
          </motion.h1>
          <motion.p {...rise(0.18)} className="mt-8 max-w-xl text-lg md:text-xl text-ink-soft">
            {copy.lead}
          </motion.p>
          <motion.div {...rise(0.26)} className="mt-9 flex flex-col gap-4 sm:flex-row sm:items-center">
            <a href={appLink('/signup')} className="hd-btn px-7 py-3 text-lg">{t.signupFree}</a>
            <a href="#la-carrera" className="hd-link">{copy.raceLink}</a>
          </motion.div>
          <motion.p {...rise(0.32)} className="mt-4 hd-help">{copy.note}</motion.p>
        </div>

        <motion.div
          initial={reduce ? false : { opacity: 0, y: 30, rotate: 4 }}
          animate={{ opacity: 1, y: 0, rotate: 0 }}
          transition={{ duration: 0.8, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
        >
          <HeroAgenda key={business.id} />
        </motion.div>
      </div>
    </Scene>
  );
};

export default Hero;
