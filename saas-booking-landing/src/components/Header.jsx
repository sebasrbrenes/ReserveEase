import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FiMenu, FiX } from 'react-icons/fi';
import { Logo } from './Doodles';
import { APP_URL } from '../config';

const LINKS = [
  ['#how-it-works', 'How it works'],
  ['#features', 'Features'],
  ['#pricing', 'Pricing'],
  ['#faq', 'FAQ'],
];

const Header = () => {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-20 bg-paper/95 border-b-2 border-ink">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
        <Link to="/" aria-label="ReserveEase home"><Logo /></Link>

        <nav aria-label="Main" className="hidden md:flex items-center gap-6 font-semibold">
          {LINKS.map(([href, label]) => (
            <a key={href} href={href} className="hover:text-marker">{label}</a>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-3">
          <a href={`${APP_URL}/login`} className="hd-link">Sign in</a>
          <a href={`${APP_URL}/signup`} className="hd-btn py-2">Create account</a>
        </div>

        <button
          type="button"
          className="md:hidden hd-btn hd-btn-secondary px-3 py-2"
          aria-expanded={open}
          aria-controls="mobile-menu"
          aria-label={open ? 'Close menu' : 'Open menu'}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <FiX aria-hidden="true" /> : <FiMenu aria-hidden="true" />}
        </button>
      </div>

      {open && (
        <nav id="mobile-menu" aria-label="Main" className="md:hidden border-t-2 border-ink px-4 py-4 space-y-3 font-semibold">
          {LINKS.map(([href, label]) => (
            <a key={href} href={href} className="block" onClick={() => setOpen(false)}>{label}</a>
          ))}
          <div className="flex items-center gap-4 pt-2">
            <a href={`${APP_URL}/login`} className="hd-link">Sign in</a>
            <a href={`${APP_URL}/signup`} className="hd-btn py-2">Create account</a>
          </div>
        </nav>
      )}
    </header>
  );
};

export default Header;
