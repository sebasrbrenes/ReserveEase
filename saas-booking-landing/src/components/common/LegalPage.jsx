import { useEffect } from 'react';
import BackButton from './BackButton';

// Shared layout of the legal and company pages.
export const LegalPage = ({ title, updated, children }) => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="hd-page pt-20 pb-16">
      <BackButton />
      <article className="max-w-3xl mx-auto px-4">
        <header className="mb-12 text-center">
          <h1 className="hd-title text-5xl md:text-6xl mb-4">{title}</h1>
          {updated && <p className="text-ink-soft">Última actualización: {updated}</p>}
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
