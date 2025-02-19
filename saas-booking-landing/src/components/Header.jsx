import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

const Header = () => {
  const handleScroll = (e, id) => {
    e.preventDefault();
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }
  };

  return (
    <motion.header 
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="fixed top-0 left-0 right-0 h-16 bg-dark/80 backdrop-blur-lg border-b border-gray-800 z-50"
    >
      <div className="h-full max-w-[1200px] mx-auto px-4 flex justify-between items-center">
        <motion.div 
          className="text-2xl font-bold gradient-text"
          whileHover={{ scale: 1.05 }}
        >
          <Link to="/">ReserveEase</Link>
        </motion.div>
        
        <nav className="hidden md:flex space-x-8">
          <a
            href="#features"
            onClick={(e) => handleScroll(e, 'features')}
            className="nav-link"
          >
            Features
          </a>
          <a
            href="#testimonials"
            onClick={(e) => handleScroll(e, 'testimonials')}
            className="nav-link"
          >
            Testimonials
          </a>
          <a
            href="#pricing"
            onClick={(e) => handleScroll(e, 'pricing')}
            className="nav-link"
          >
            Pricing
          </a>
          <a
            href="#faq"
            onClick={(e) => handleScroll(e, 'faq')}
            className="nav-link"
          >
            FAQ
          </a>
          <a
            href="#contact"
            onClick={(e) => handleScroll(e, 'contact')}
            className="nav-link"
          >
            Contact
          </a>
        </nav>
        
        <div className="flex space-x-4">
          <Link 
            to="/login"
            className=" px-4 py-2 text-gray-300 duration-300 hover:text-white transition-colors rounded-lg"
          >
            Login
          </Link>
          <Link
            to="/signup"
            className="px-4 py-2 rounded-lg bg-gradient-to-br from-pink-100 to-blue-700 text-white duration-300 hover:scale-105 transition-transform"
          >
            Get Started
          </Link>
        </div>
      </div>
    </motion.header>
  );
};

export default Header;
