import { Link } from 'react-router-dom';
import { Logo } from './Doodles';
import { APP_URL } from '../config';

const Header = () => (
  <header className="sticky top-0 z-30 border-b-2 border-ink bg-paper/90 backdrop-blur-sm">
    <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4">
      <Link to="/" aria-label="ReserveEase, inicio"><Logo /></Link>
      <nav aria-label="Cuenta" className="flex items-center gap-4">
        <a href={`${APP_URL}/login`} className="hd-link text-sm sm:text-base">Entrar</a>
        <a href={`${APP_URL}/signup`} className="hd-btn hidden py-2 sm:inline-flex">Crear mi agenda</a>
      </nav>
    </div>
  </header>
);

export default Header;
