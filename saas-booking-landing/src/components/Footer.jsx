import { Link } from 'react-router-dom';
import { Logo } from './Doodles';
import { CONTACT_EMAIL } from '../config';

const linkClass = 'text-ink-soft hover:text-marker';

const Footer = () => (
  <footer className="border-t-2 border-ink bg-paper-deep">
    <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-10 md:flex-row md:items-center md:justify-between">
      <div>
        <Logo />
        <p className="mt-2 text-sm text-ink-soft">Reservas en línea para negocios que trabajan con citas.</p>
      </div>
      <nav aria-label="Legal y contacto">
        <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
          <li><Link to="/about" className={linkClass}>Quiénes somos</Link></li>
          <li><a href={`mailto:${CONTACT_EMAIL}`} className={linkClass}>Contacto</a></li>
          <li><Link to="/privacy-policy" className={linkClass}>Privacidad</Link></li>
          <li><Link to="/terms" className={linkClass}>Términos</Link></li>
        </ul>
      </nav>
    </div>
    <p className="border-t border-ink/20 py-4 text-center text-sm text-ink-soft">
      &copy; {new Date().getFullYear()} ReserveEase
    </p>
  </footer>
);

export default Footer;
