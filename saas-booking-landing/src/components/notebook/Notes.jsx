import { motion, useReducedMotion } from 'framer-motion';
import Scene from './Scene';

const NOTES = [
  {
    q: '¿Qué es ReserveEase?',
    a: 'Una página de reservas para tus clientes y un panel para ti. Pones tus servicios, tu equipo y tu horario; tus clientes eligen una hora libre desde tu enlace; tú ves y manejas cada cita.',
  },
  {
    q: '¿Mis clientes necesitan una cuenta?',
    a: 'No. Eligen servicio, persona, día y hora, y dejan su nombre y su correo.',
  },
  {
    q: '¿Lo puedo poner en Instagram o WhatsApp?',
    a: 'Sí. Tu enlace funciona en cualquier lado: tu perfil de Instagram, tus estados de WhatsApp, Google o tu página web.',
  },
  {
    q: '¿Manda correos o mensajes de texto?',
    a: 'Las confirmaciones, los avisos de cambio y los recordatorios del día anterior por correo ya están hechos y se están conectando. Los mensajes de texto todavía no.',
  },
  {
    q: '¿Quién ve mis citas?',
    a: 'Solo tú, después de entrar con un correo verificado. Cada negocio ve solo sus citas, y tus clientes solo ven horas libres, nunca las reservas de otras personas.',
  },
  {
    q: '¿Cómo se paga?',
    a: 'Son $15 USD al mes con tarjeta, a través de Paddle, nuestro proveedor de pagos. Desde la configuración de tu cuenta ves tu próximo cobro, cambias la tarjeta o cancelas; si cancelas, sigues teniendo acceso hasta el final del mes ya pagado.',
  },
];

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
  return (
    <Scene id="preguntas" time="18:45" labelledBy="notes-title">
      <p className="font-hand text-2xl text-marker">pegadas en la nevera</p>
      <h2 id="notes-title" className="nb-display mt-2 text-5xl font-semibold sm:text-6xl md:text-7xl">
        Lo que todos <em className="font-medium">preguntan</em>.
      </h2>

      <ul className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {NOTES.map((note, i) => (
          <motion.li
            key={note.q}
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
