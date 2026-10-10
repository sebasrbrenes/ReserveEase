import { Link } from 'react-router-dom';
import { Logo } from './Doodles';

const linkClass = 'text-ink-soft hover:text-marker';

const Footer = () => (
  <footer className="border-t-2 border-ink bg-paper-deep">
    <div className="max-w-6xl mx-auto px-4 py-10 grid gap-8 sm:grid-cols-2 md:grid-cols-4">
      <div className="sm:col-span-2 md:col-span-1">
        <Logo />
        <p className="mt-3 text-sm text-ink-soft">Online booking for businesses that work by appointment.</p>
      </div>
      <nav aria-label="Product">
        <h2 className="font-extrabold mb-3">Product</h2>
        <ul className="space-y-2">
          <li><a href="/#how-it-works" className={linkClass}>How it works</a></li>
          <li><a href="/#features" className={linkClass}>Features</a></li>
          <li><a href="/#pricing" className={linkClass}>Pricing</a></li>
        </ul>
      </nav>
      <nav aria-label="Company">
        <h2 className="font-extrabold mb-3">Company</h2>
        <ul className="space-y-2">
          <li><Link to="/about" className={linkClass}>About</Link></li>
          <li><a href="mailto:contact@reservease.com" className={linkClass}>Contact</a></li>
        </ul>
      </nav>
      <nav aria-label="Legal">
        <h2 className="font-extrabold mb-3">Legal</h2>
        <ul className="space-y-2">
          <li><Link to="/privacy-policy" className={linkClass}>Privacy Policy</Link></li>
          <li><Link to="/terms" className={linkClass}>Terms of Service</Link></li>
          <li><Link to="/refund-policy" className={linkClass}>Refund Policy</Link></li>
        </ul>
      </nav>
    </div>
    <p className="border-t border-ink/20 py-4 text-center text-sm text-ink-soft">
      &copy; {new Date().getFullYear()} ReserveEase
    </p>
  </footer>
);

export default Footer;
