import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useInView, useReducedMotion } from 'framer-motion';
import Scene from './Scene';
import Highlight from './Highlight';
import { useBusiness } from './BusinessContext';
import { APP_URL } from '../../config';

// The back-and-forth every appointment takes over chat. `me` is the business.
const messages = (service) => [
  { text: `Hola, ¿tienes espacio mañana para ${service}?` },
  { me: true, text: '¡Hola! ¿A qué hora te sirve?' },
  { text: '¿Tipo 3?' },
  { me: true, text: 'A las 3 no tengo. ¿4:30?' },
  { text: 'Uy, a esa hora salgo del trabajo. ¿Y el jueves?' },
  { me: true, text: 'Jueves a las 10:00 o a las 5:00' },
  { text: 'A las 5 perfecto' },
  { me: true, text: 'Listo, te apunto' },
  { text: 'Perdón, se me complicó el jueves. ¿Lo podemos mover?' },
];

const EVERY = 520; // ms between messages

const Chat = () => {
  const reduce = useReducedMotion();
  const { business } = useBusiness();
  const list = messages(business.services[0].name.toLowerCase());
  const stage = useRef(null);
  const inView = useInView(stage, { once: true, amount: 0.35 });
  const [shown, setShown] = useState(reduce ? list.length : 0);
  const [struck, setStruck] = useState(!!reduce);
  const link = `${new URL(APP_URL).host}/book/${business.slug}`;

  useEffect(() => {
    if (reduce || !inView) return undefined;
    const timers = list.map((_, i) => setTimeout(() => setShown(i + 1), 300 + i * EVERY));
    timers.push(setTimeout(() => setStruck(true), 300 + list.length * EVERY + 700));
    return () => timers.forEach(clearTimeout);
    // The script runs once, when the scene first comes into view.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inView, reduce]);

  return (
    <Scene id="el-chat" time="11:40" labelledBy="chat-title">
      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-12 lg:grid-cols-[0.95fr_1.05fr] lg:gap-16">
        <div className="lg:sticky lg:top-28">
          <p className="font-hand text-2xl text-marker">entre cliente y cliente</p>
          <h2 id="chat-title" className="nb-display mt-2 text-5xl font-semibold sm:text-6xl md:text-7xl">
            Nueve mensajes para una cita. <em className="font-medium"><Highlight>O un enlace.</Highlight></em>
          </h2>
          <p className="mt-6 max-w-xl text-lg text-ink-soft">
            Cada cita por chat es un ida y vuelta mientras atiendes a otra persona. Con ReserveEase pones tu enlace
            en tu perfil, en tus estados o en Google, y cada cliente elige entre las horas que de verdad tienes libres.
            Si algo cambia, la mueves en tu panel en un paso.
          </p>
        </div>

        <div ref={stage} className="relative mx-auto w-full max-w-md">
          <p className="sr-only">
            Ejemplo: nueve mensajes de ida y vuelta para acordar una sola cita, reemplazados por un enlace a la página
            de reservas.
          </p>
          <ol aria-hidden="true" className="space-y-2.5">
            {list.slice(0, shown).map((m, i) => (
              <motion.li
                key={i}
                initial={reduce ? false : { opacity: 0, y: 10, scale: 0.96 }}
                animate={{ opacity: struck ? 0.35 : 1, y: 0, scale: 1 }}
                transition={{ duration: 0.25 }}
                className={`flex ${m.me ? 'justify-end' : 'justify-start'}`}
              >
                <span
                  className={`relative max-w-[80%] border-2 border-ink px-3.5 py-2 text-[0.95rem] leading-snug ${
                    m.me ? 'bg-leaf-light' : 'bg-white'
                  }`}
                  style={{ borderRadius: m.me ? '16px 4px 14px 16px' : '4px 16px 16px 14px' }}
                >
                  {m.text}
                  {struck && (
                    <motion.span
                      className="absolute left-2 right-2 top-1/2 h-[3px] -translate-y-1/2 rounded-full bg-coral origin-left"
                      initial={reduce ? false : { scaleX: 0 }}
                      animate={{ scaleX: 1 }}
                      transition={{ duration: 0.3, delay: reduce ? 0 : i * 0.06 }}
                    />
                  )}
                </span>
              </motion.li>
            ))}
          </ol>

          <AnimatePresence>
            {struck && (
              <motion.div
                initial={reduce ? false : { opacity: 0, y: 24, rotate: -3 }}
                animate={{ opacity: 1, y: 0, rotate: -1.5 }}
                transition={{ delay: reduce ? 0 : 0.7, type: 'spring', stiffness: 220, damping: 18 }}
                className="nb-sheet mt-6 bg-sun-light px-5 py-4"
              >
                <p className="font-hand text-2xl leading-tight">Reserva aquí la hora que te sirva:</p>
                <p className="mt-1 [overflow-wrap:anywhere] font-bold text-marker underline decoration-2 underline-offset-4">{link}</p>
                <p className="mt-3 text-sm text-ink-soft">Un mensaje. El cliente elige solo y tú no tachas nada.</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </Scene>
  );
};

export default Chat;
