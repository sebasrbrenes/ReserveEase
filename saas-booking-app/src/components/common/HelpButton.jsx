import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiHelpCircle, FiMail, FiX } from 'react-icons/fi';

const HelpButton = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute bottom-16 right-0 mb-2 hd-card p-4 w-72 max-w-[calc(100vw-3rem)] text-ink"
          >
            <div className="flex justify-between items-start mb-3">
              <h3 className="hd-title text-3xl">¿Necesitas ayuda?</h3>
              <button
                onClick={() => setIsOpen(false)}
                aria-label="Cerrar"
                className="p-1 text-ink-soft hover:text-ink hover:bg-paper-deep rounded-full transition-colors"
              >
                <FiX aria-hidden="true" />
              </button>
            </div>
            <p className="text-ink-soft text-sm mb-4">
              Escríbenos a help@reservease.com y te respondemos lo antes posible.
            </p>
            <a
              href="mailto:help@reservease.com"
              className="hd-btn w-full"
            >
              <FiMail aria-hidden="true" />
              <span>Escribir a soporte</span>
            </a>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Ayuda"
        aria-expanded={isOpen}
        className="hd-btn !rounded-full !p-0 w-12 h-12"
      >
        <FiHelpCircle size={24} aria-hidden="true" />
      </button>
    </div>
  );
};

export default HelpButton;
