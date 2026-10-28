import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { FiCheckCircle, FiCircle, FiCopy } from 'react-icons/fi';

// What a new business still has to do before its booking page goes live, from
// the problems the server reports when it syncs the settings.
const STEPS = [
  { problem: 'NAME_MISSING', label: 'Ponle nombre a tu negocio', hash: 'datos-del-negocio' },
  { problem: 'NO_OPENING_HOURS', label: 'Marca los días y horas en que atiendes', hash: 'horario' },
  { problem: 'NO_SERVICES', label: 'Agrega al menos un servicio', hash: 'servicios' },
  { problem: 'NO_STAFF_WITH_SERVICES', label: 'Agrega a quien atiende y elige qué servicios ofrece', hash: 'personal' },
];

export default function GettingStarted({ business }) {
  const problems = business.problems || [];
  const published = business.status === 'published';
  const bookingLink = business.slug ? `${window.location.origin}/book/${business.slug}` : '';
  const done = STEPS.length - STEPS.filter((s) => problems.includes(s.problem)).length;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(bookingLink);
      toast.success('¡Enlace de reservas copiado!');
    } catch {
      toast.error('No pudimos copiar el enlace');
    }
  };

  return (
    <section className="hd-card p-4 sm:p-5 mb-6 bg-sun-light" aria-labelledby="getting-started-title">
      <h2 id="getting-started-title" className="hd-title text-3xl mb-1">Primeros pasos</h2>
      <p className="text-ink-soft mb-4">
        {published
          ? 'Tu página de reservas está lista. Comparte el enlace con tus clientes para recibir la primera cita.'
          : `Completa estos pasos y tu página de reservas se publica sola (${done} de ${STEPS.length}).`}
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
                <span className="text-ink-soft line-through">{step.label}<span className="sr-only"> (listo)</span></span>
              ) : (
                <Link to={`/settings#${step.hash}`} className="hd-link">{step.label}</Link>
              )}
            </li>
          );
        })}
        <li className="flex flex-wrap items-center gap-2">
          <FiCircle className="w-5 h-5 shrink-0 text-ink-soft" aria-hidden="true" />
          <span className={published ? '' : 'text-ink-soft'}>Comparte tu enlace de reservas</span>
          {published && bookingLink && (
            <button type="button" onClick={copyLink} className="hd-btn hd-btn-secondary !px-3 !py-1 text-sm">
              <FiCopy className="w-4 h-4" aria-hidden="true" />
              <span>Copiar enlace</span>
            </button>
          )}
        </li>
      </ol>
    </section>
  );
}
