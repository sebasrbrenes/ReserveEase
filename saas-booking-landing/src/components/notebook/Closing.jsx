import Scene from './Scene';
import { LogoMark } from '../Doodles';
import { useLanguage } from '../../i18n/LanguageContext';

const Closing = () => {
  const { t, appLink } = useLanguage();
  const copy = t.closing;
  return (
    <Scene id="empieza" time={t.times.closing} labelledBy="closing-title">
      <div className="flex flex-col items-start gap-8 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="font-hand text-2xl text-marker">{copy.kicker}</p>
          <h2 id="closing-title" className="nb-display mt-2 text-5xl font-semibold sm:text-6xl md:text-7xl">
            {copy.title[0]}<em className="font-medium">{copy.title[1]}</em>{copy.title[2]}
          </h2>
          <p className="mt-5 max-w-xl text-lg text-ink-soft">{copy.lead}</p>
          <a href={appLink('/signup')} className="hd-btn mt-8 px-7 py-3 text-lg">{t.signupFree}</a>
        </div>
        <LogoMark className="h-40 w-40 md:h-56 md:w-56 -rotate-6" />
      </div>
    </Scene>
  );
};

export default Closing;
