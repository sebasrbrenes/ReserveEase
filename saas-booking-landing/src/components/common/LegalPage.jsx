import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import BackButton from './BackButton';

// Shared layout of the legal and company pages (Spanish unless lang="en").
const LABELS = {
  es: { back: 'Volver al inicio', updated: 'Última actualización' },
  en: { back: 'Back to home', updated: 'Last updated' },
};

export const LegalPage = ({ title, updated, lang = 'es', other, children }) => {
  const labels = LABELS[lang] || LABELS.es;
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="hd-page pt-20 pb-16" lang={lang}>
      <BackButton label={labels.back} />
      <article className="max-w-3xl mx-auto px-4">
        <header className="mb-12 text-center">
          <h1 className="hd-title text-5xl md:text-6xl mb-4">{title}</h1>
          {updated && <p className="text-ink-soft">{labels.updated}: {updated}</p>}
          {other && (
            <p className="mt-2">
              <Link to={other.to} lang={other.lang} hrefLang={other.lang} className="hd-link">{other.label}</Link>
            </p>
          )}
        </header>
        <div className="space-y-8 text-ink leading-relaxed">{children}</div>
      </article>
    </div>
  );
};

export const Section = ({ title, children }) => (
  <section>
    <h2 className="text-2xl font-extrabold mb-3">{title}</h2>
    <div className="space-y-3">{children}</div>
  </section>
);

export const List = ({ children }) => <ul className="list-disc pl-6 space-y-2">{children}</ul>;
