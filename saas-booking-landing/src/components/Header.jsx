import { Link } from 'react-router-dom';
import { Logo } from './Doodles';
import { APP_URL } from '../config';

const Header = () => (
  <header className="sticky top-0 z-30 border-b-2 border-ink bg-paper/90 backdrop-blur-sm">
    <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4">
      <Link to="/" aria-label="ReserveEase, inicio"><Logo /></Link>
      <nav aria-label="Secciones" className="hidden items-center gap-6 font-hand text-2xl lg:flex">
        <a href="#la-carrera" className="hover:text-marker">la carrera</a>
        <a href="#tu-negocio" className="hover:text-marker">tu negocio</a>
        <a href="#precio" className="hover:text-marker">precio</a>
        <a href="#preguntas" className="hover:text-marker">preguntas</a>
      </nav>
      <nav aria-label="Cuenta" className="flex items-center gap-4">
        <a href={`${APP_URL}/login`} className="hd-link text-sm sm:text-base">Entrar</a>
        <a href={`${APP_URL}/signup`} className="hd-btn hidden py-2 sm:inline-flex">Crear mi agenda</a>
      </nav>
    </div>
  </header>
);

export default Header;
