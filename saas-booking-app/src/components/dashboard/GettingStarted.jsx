import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { FiCheckCircle, FiCircle, FiCopy } from 'react-icons/fi';
import { useLanguage } from '../../i18n/LanguageContext';

// What a new business still has to do before its booking page goes live, from
// the problems the server reports when it syncs the settings.
const STEPS = [
  { problem: 'NAME_MISSING', hash: 'datos-del-negocio' },
  { problem: 'NO_OPENING_HOURS', hash: 'horario' },
  { problem: 'NO_SERVICES', hash: 'servicios' },
  { problem: 'NO_STAFF_WITH_SERVICES', hash: 'personal' },
];

export default function GettingStarted({ business }) {
  const { t: { gettingStarted: copy, common } } = useLanguage();
  const problems = business.problems || [];
  const published = business.status === 'published';
  const bookingLink = business.slug ? `${window.location.origin}/book/${business.slug}` : '';
  const done = STEPS.length - STEPS.filter((s) => problems.includes(s.problem)).length;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(bookingLink);
      toast.success(common.linkCopied);
    } catch {
      toast.error(common.copyFailed);
    }
  };

  return (
    <section className="hd-card p-4 sm:p-5 mb-6 bg-sun-light" aria-labelledby="getting-started-title">
      <h2 id="getting-started-title" className="hd-title text-3xl mb-1">{copy.title}</h2>
      <p className="text-ink-soft mb-4">
        {published ? copy.published : copy.progress(done, STEPS.length)}
      </p>
      <ol className="space-y-2">
        {STEPS.map((step) => {
          const isDone = !problems.includes(step.problem);
          return (
            <li key={step.problem} className="flex items-center gap-2">
              {isDone
                ? <FiCheckCircle className="w-5 h-5 shrink-0 text-leaf" aria-hidden="true" />
                : <FiCircle className="w-5 h-5 shrink-0 text-ink-soft" aria-hidden="true" />}
              {isDone ? (
                <span className="text-ink-soft line-through">{copy.steps[step.problem]}<span className="sr-only">{copy.done}</span></span>
              ) : (
                <Link to={`/settings#${step.hash}`} className="hd-link">{copy.steps[step.problem]}</Link>
              )}
            </li>
          );
        })}
        <li className="flex flex-wrap items-center gap-2">
          <FiCircle className="w-5 h-5 shrink-0 text-ink-soft" aria-hidden="true" />
          <span className={published ? '' : 'text-ink-soft'}>{copy.share}</span>
          {published && bookingLink && (
            <button type="button" onClick={copyLink} className="hd-btn hd-btn-secondary !px-3 !py-1 text-sm">
              <FiCopy className="w-4 h-4" aria-hidden="true" />
              <span>{copy.copy}</span>
            </button>
          )}
        </li>
      </ol>
    </section>
  );
}
