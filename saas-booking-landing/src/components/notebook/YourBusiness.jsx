import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import Scene from './Scene';
import { useBusiness } from './BusinessContext';
import { APP_URL } from '../../config';
import { useLanguage } from '../../i18n/LanguageContext';

const TAB_COLORS = ['bg-sun', 'bg-coral-light', 'bg-marker-light', 'bg-leaf-light'];

const YourBusiness = () => {
  const reduce = useReducedMotion();
  const { business, businesses, setBusinessId } = useBusiness();
  const { t, money } = useLanguage();
  const copy = t.business;
  const index = businesses.findIndex((b) => b.id === business.id);

  return (
    <Scene id="tu-negocio" time={t.times.business} labelledBy="business-title">
      <div className="grid grid-cols-[minmax(0,1fr)] items-center gap-12 lg:grid-cols-[1fr_1fr] lg:gap-16">
        <div>
          <p className="font-hand text-2xl text-marker">{copy.kicker}</p>
          <h2 id="business-title" className="nb-display mt-2 text-5xl font-semibold sm:text-6xl md:text-7xl">
            {copy.title[0]}<em className="font-medium">{copy.title[1]}</em>{copy.title[2]}
          </h2>
          <p className="mt-6 max-w-xl text-lg text-ink-soft">
            {copy.lead}
          </p>
        </div>

        <div className="mx-auto w-full max-w-md">
          {/* Notebook divider tabs */}
          <div role="radiogroup" aria-label={copy.tabs} className="flex gap-0.5 pl-2 sm:gap-1 sm:pl-4">
            {businesses.map((b, i) => {
              const active = b.id === business.id;
              return (
                <button
                  key={b.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setBusinessId(b.id)}
                  className={`relative -mb-[2px] border-2 border-ink px-2 pb-1.5 pt-1 font-hand text-lg leading-none transition-transform sm:px-4 sm:text-2xl ${
                    TAB_COLORS[i]
                  } ${active ? 'z-10 border-b-white !bg-white' : 'translate-y-1.5 hover:translate-y-0.5'}`}
                  style={{ borderRadius: '10px 12px 0 0' }}
                >
                  {b.tab}
                </button>
              );
            })}
          </div>

          <div className="nb-sheet overflow-hidden" aria-live="polite">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={business.id}
                initial={reduce ? false : { opacity: 0, x: index % 2 ? 16 : -16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={reduce ? { opacity: 0 } : { opacity: 0, x: index % 2 ? -16 : 16 }}
                transition={{ duration: 0.22 }}
                className="px-6 py-6 sm:px-8"
              >
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-ink-soft">{business.place}</p>
                <p className="nb-display mt-1 text-4xl font-semibold">{business.name}</p>
                <p className="mt-2 [overflow-wrap:anywhere] text-sm font-bold text-marker">
                  {new URL(APP_URL).host}/book/{business.slug}
                </p>

                <ul className="mt-6 divide-y-2 divide-dashed divide-ink/15 border-y-2 border-ink">
                  {business.services.map((s) => (
                    <li key={s.id} className="flex items-baseline gap-3 py-3">
                      <span className="font-semibold">{s.name}</span>
                      <span className="text-sm text-ink-soft">{s.minutes} min</span>
                      <span className="ml-auto font-display text-lg font-semibold tabular-nums">{money(s.price)}</span>
                    </li>
                  ))}
                </ul>

                <p className="mt-5 font-hand text-2xl text-ink-soft">
                  {copy.note(business.name)}
                </p>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </Scene>
  );
};

export default YourBusiness;
