import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiHelpCircle, FiMail, FiX } from 'react-icons/fi';
import { useLanguage } from '../../i18n/LanguageContext';

const SUPPORT_EMAIL = 'help@reservease.com';

const HelpButton = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { t: { help: copy, common } } = useLanguage();

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
              <h3 className="hd-title text-3xl">{copy.title}</h3>
              <button
                onClick={() => setIsOpen(false)}
                aria-label={common.close}
                className="p-1 text-ink-soft hover:text-ink hover:bg-paper-deep rounded-full transition-colors"
              >
                <FiX aria-hidden="true" />
              </button>
            </div>
            <p className="text-ink-soft text-sm mb-4">
              {copy.text(SUPPORT_EMAIL)}
            </p>
            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              className="hd-btn w-full"
            >
              <FiMail aria-hidden="true" />
              <span>{copy.write}</span>
            </a>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-label={copy.button}
        aria-expanded={isOpen}
        className="hd-btn !rounded-full !p-0 w-12 h-12"
      >
        <FiHelpCircle size={24} aria-hidden="true" />
      </button>
    </div>
  );
};

export default HelpButton;
