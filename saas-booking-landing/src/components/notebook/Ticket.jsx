import { motion, useReducedMotion } from 'framer-motion';
import Scene from './Scene';
import Highlight from './Highlight';
import { APP_URL } from '../../config';

const LINES = [
  ['Tu página de reservas', 'incluido'],
  ['Citas ilimitadas', 'incluido'],
  ['Equipo, servicios y horario', 'incluido'],
  ['Panel con tu semana', 'incluido'],
  ['Teléfono y compu', 'incluido'],
  ['Recordatorios por correo', 'pronto'],
];

// Torn paper edge for the top and bottom of the receipt.
const zigzag = 'conic-gradient(from -45deg at bottom, #0000, #000 1deg 89deg, #0000 90deg) 50% / 14px 100%';

const Ticket = () => {
  const reduce = useReducedMotion();
  return (
    <Scene id="precio" time="18:30" labelledBy="price-title">
      <div className="grid grid-cols-[minmax(0,1fr)] items-center gap-12 lg:grid-cols-[1fr_0.9fr] lg:gap-16">
        <div>
          <p className="font-hand text-2xl text-marker">cierre de caja</p>
          <h2 id="price-title" className="nb-display mt-2 text-5xl font-semibold sm:text-6xl md:text-7xl">
            ¿Cuánto cuesta? <em className="font-medium"><Highlight>$15</Highlight></em> al mes.
          </h2>
          <p className="mt-6 max-w-xl text-lg text-ink-soft">
            Un solo plan, con todo lo que ves en el recibo. Se cobra en dólares cada mes a través de Paddle, nuestro
            proveedor de pagos, y cancelas cuando quieras desde la configuración de tu cuenta.
          </p>
          <a href={`${APP_URL}/signup`} className="hd-btn mt-8 px-7 py-3 text-lg">Suscribirme por $15 al mes</a>
        </div>

        <div className="relative mx-auto w-full max-w-sm">
          {/* The register's paper slot; the receipt prints out of it when the scene comes into view. */}
          <div aria-hidden="true" className="relative z-10 mx-[-0.75rem] h-4 rounded-full border-2 border-ink bg-ink shadow-[0_3px_0_#FFD35C]" />
          {/* The observer sits on the slot's window: the receipt itself starts hidden above it. */}
          <motion.div
            className="-mt-2 overflow-hidden px-1 pb-6"
            initial={reduce ? false : 'inside'}
            whileInView="printed"
            viewport={{ once: true, amount: 0.3 }}
          >
            <motion.div
              className="relative drop-shadow-[3px_5px_0_rgba(31,35,40,0.18)]"
              variants={{ inside: { y: '-100%' }, printed: { y: '0%' } }}
              transition={{ duration: 1.8, ease: [0.3, 0, 0.2, 1] }}
            >
              <div className="bg-white px-6 pb-6 pt-8 font-mono text-sm">
                <p className="text-center font-bold tracking-[0.2em]">RESERVEEASE</p>
                <p className="text-center text-xs text-ink-soft">Plan mensual · {new Date().getFullYear()}</p>
                <ul className="mt-5 space-y-2 border-y border-dashed border-ink/40 py-4">
                  {LINES.map(([item, state]) => (
                    <li key={item} className="flex items-baseline gap-2">
                      <span>{item}</span>
                      <span aria-hidden="true" className="min-w-4 flex-1 translate-y-[-3px] border-b border-dotted border-ink/40" />
                      <span className={state === 'pronto' ? 'text-marker' : 'text-ink-soft'}>{state}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-4 flex items-baseline justify-between text-base font-bold">
                  <span>TOTAL</span>
                  <span className="font-display text-4xl">$15</span>
                </p>
                <p className="mt-1 text-right text-xs text-ink-soft">USD al mes</p>
                <p className="mt-6 text-center text-xs text-ink-soft">¡Gracias por tu visita!</p>
              </div>
              <div className="h-3 bg-white" style={{ mask: zigzag, WebkitMask: zigzag }} />
              <span className="nb-stamp absolute bottom-16 left-6 rotate-[-12deg] bg-white/60 px-3 py-1 text-base">Mensual</span>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </Scene>
  );
};

export default Ticket;
