import { useLanguage } from '../i18n/LanguageContext';
import { LANGUAGES } from '../i18n/language';

// EN / ES, next to the account links. The choice is kept for the next visit.
const LanguageSwitch = ({ className = '' }) => {
  const { language, setLanguage, t } = useLanguage();
  return (
    <div role="group" aria-label={t.switcher.label} className={`flex items-center gap-1 text-sm font-bold ${className}`}>
      {LANGUAGES.map((code, i) => (
        <span key={code} className="flex items-center gap-1">
          {i > 0 && <span aria-hidden="true" className="text-ink-soft/50">/</span>}
          <button
            type="button"
            lang={code}
            aria-label={t.switcher[code]}
            aria-pressed={language === code}
            onClick={() => setLanguage(code)}
            className={language === code ? 'text-ink underline decoration-sun decoration-[3px] underline-offset-4' : 'text-ink-soft hover:text-marker'}
          >
            {code.toUpperCase()}
          </button>
        </span>
      ))}
    </div>
  );
};

export default LanguageSwitch;
