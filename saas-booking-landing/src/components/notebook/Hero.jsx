import { motion, useReducedMotion } from 'framer-motion';
import Scene from './Scene';
import Highlight from './Highlight';
import HeroAgenda from './HeroAgenda';
import { APP_URL } from '../../config';
import { useBusiness } from './BusinessContext';

const Hero = () => {
  const reduce = useReducedMotion();
  const { business } = useBusiness();
  const rise = (delay) => (reduce ? {} : {
    initial: { opacity: 0, y: 18 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] },
  });

  return (
    <Scene id="inicio" time="8:00" labelledBy="hero-title">
      <div className="grid grid-cols-[minmax(0,1fr)] items-center gap-14 lg:grid-cols-[1.1fr_0.9fr] lg:gap-10">
        <div>
          <motion.p {...rise(0)} className="font-hand text-2xl text-marker">
            para barberías, salones y todo el que trabaja con citas
          </motion.p>
          <motion.h1
            {...rise(0.08)}
            id="hero-title"
            className="nb-display mt-3 text-[clamp(3.4rem,9vw,7.75rem)] font-semibold"
          >
            Tu agenda
            <br />
            se llena <em className="font-medium"><Highlight delay={0.7}>sola.</Highlight></em>
          </motion.h1>
          <motion.p {...rise(0.18)} className="mt-8 max-w-xl text-lg md:text-xl text-ink-soft">
            Compartes un enlace y tus clientes reservan a cualquier hora, solo en los espacios que de verdad tienes
            libres. Tú lo ves todo en tu panel, sin contestar mensajes ni tachar la libreta.
          </motion.p>
          <motion.div {...rise(0.26)} className="mt-9 flex flex-col gap-4 sm:flex-row sm:items-center">
            <a href={`${APP_URL}/signup`} className="hd-btn px-7 py-3 text-lg">Crear mi agenda</a>
            <a href="#la-carrera" className="hd-link">Mira la carrera por las 10:30</a>
          </motion.div>
          <motion.p {...rise(0.32)} className="mt-4 hd-help">$15 USD al mes. Cancelas cuando quieras.</motion.p>
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
