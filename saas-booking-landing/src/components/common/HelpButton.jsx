import React, { useState } from 'react';
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
            className="absolute bottom-16 right-0 mb-2 bg-surface border border-gray-800 rounded-lg shadow-xl p-4 w-72"
          >
            <div className="flex justify-between items-start mb-3">
              <h3 className="text-white font-medium">Need Help?</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <FiX />
              </button>
            </div>
            <p className="text-gray-300 text-sm mb-4">
              Our support team is here to help! Send us an email to help@reservease.com and we'll get back to you as soon as possible.
            </p>
            <a
              href="mailto:help@reservease.com"
              className="flex items-center justify-center gap-2 w-full bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg transition-colors"
            >
              <FiMail />
              <span>Contact Support</span>
            </a>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="bg-primary hover:bg-primary/90 text-white w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-colors"
      >
        <FiHelpCircle size={24} />
      </motion.button>
    </div>
  );
};

export default HelpButton;
