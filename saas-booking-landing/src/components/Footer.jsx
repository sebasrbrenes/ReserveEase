import { Link } from 'react-router-dom';
import { Logo } from './Doodles';
import { CONTACT_EMAIL } from '../config';
import { useLanguage } from '../i18n/LanguageContext';

const linkClass = 'text-ink-soft hover:text-marker';

const Footer = () => {
  const { t, language } = useLanguage();
  // The legal pages exist in both languages; English lives under /en.
  const suffix = language === 'en' ? '/en' : '';
  return (
    <footer className="border-t-2 border-ink bg-paper-deep">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-10 md:flex-row md:items-center md:justify-between">
        <div>
          <Logo />
          <p className="mt-2 text-sm text-ink-soft">{t.footer.tagline}</p>
        </div>
        <nav aria-label={t.footer.nav}>
          <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
            <li><Link to="/about" className={linkClass}>{t.footer.about}</Link></li>
            <li><a href={`mailto:${CONTACT_EMAIL}`} className={linkClass}>{t.footer.contact}</a></li>
            <li><Link to={`/privacy-policy${suffix}`} className={linkClass}>{t.footer.privacy}</Link></li>
            <li><Link to={`/terms${suffix}`} className={linkClass}>{t.footer.terms}</Link></li>
          </ul>
        </nav>
      </div>
      <p className="border-t border-ink/20 py-4 text-center text-sm text-ink-soft">
        &copy; {new Date().getFullYear()} ReserveEase
      </p>
    </footer>
  );
};

export default Footer;
