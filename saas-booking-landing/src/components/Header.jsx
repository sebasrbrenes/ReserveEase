import { Link } from 'react-router-dom';
import { Logo } from './Doodles';
import LanguageSwitch from './LanguageSwitch';
import { useLanguage } from '../i18n/LanguageContext';

const Header = () => {
  const { t, appLink } = useLanguage();
  return (
    <header className="sticky top-0 z-30 border-b-2 border-ink bg-paper/90 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4">
        <Link to="/" aria-label={t.header.home}><Logo /></Link>
        <nav aria-label={t.header.sections} className="hidden items-center gap-6 font-hand text-2xl lg:flex">
          {t.header.nav.map(([href, label]) => (
            <a key={href} href={href} className="hover:text-marker">{label}</a>
          ))}
        </nav>
        <div className="flex items-center gap-3 sm:gap-4">
          <LanguageSwitch />
          <nav aria-label={t.header.account} className="flex items-center gap-4">
            <a href={appLink('/login')} className="hd-link text-sm sm:text-base">{t.header.login}</a>
            <a href={appLink('/signup')} className="hd-btn hidden py-2 sm:inline-flex">{t.header.signup}</a>
          </nav>
        </div>
      </div>
    </header>
  );
};

export default Header;
