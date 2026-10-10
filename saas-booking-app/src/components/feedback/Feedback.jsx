import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import { Underline } from '../ui/Doodles';
import { db } from '../../firebase/config';
import { collection, addDoc } from 'firebase/firestore';

const Feedback = ({ isOpen, onClose }) => {
  const [feedback, setFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!feedback.trim()) {
      toast.error('Please enter your feedback');
      return;
    }

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'feedback'), {
        feedback,
        createdAt: new Date().toISOString()
      });

      toast.success('Thank you for your feedback!');
      setFeedback('');
      onClose();
    } catch (error) {
      console.error('Error submitting feedback:', error);
      toast.error('Failed to submit feedback');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/50"
          onClick={(e) => e.target === e.currentTarget && onClose()}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="feedback-title"
            className="hd-card relative w-full max-w-md p-5 sm:p-6 font-sans text-ink"
          >
            <button
              onClick={onClose}
              aria-label="Close"
              className="absolute top-3 right-3 p-1 rounded-lg text-ink-soft hover:text-ink hover:bg-paper-deep focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-marker"
            >
              <FiX size={24} />
            </button>

            <h2 id="feedback-title" className="relative inline-block mb-6 pr-8">
              <span className="hd-title text-4xl">Send Feedback</span>
              <Underline className="absolute -bottom-2 left-0 w-full h-3 text-sun" />
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="feedback-text" className="hd-label">
                  Your Feedback
                </label>
                <textarea
                  id="feedback-text"
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  className="hd-input focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-marker"
                  rows="4"
                  placeholder="Tell us what you think..."
                />
              </div>

              <div className="flex flex-wrap justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="hd-btn hd-btn-secondary focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-marker"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="hd-btn focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-marker"
                >
                  {isSubmitting ? 'Sending...' : 'Send Feedback'}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default Feedback;
