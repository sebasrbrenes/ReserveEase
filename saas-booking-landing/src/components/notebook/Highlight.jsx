import { motion, useReducedMotion } from 'framer-motion';

// A highlighter stroke drawn behind a word, the way someone marks a paper agenda.
const Highlight = ({ children, delay = 0.4, className = '' }) => {
  const reduce = useReducedMotion();
  return (
    <span className={`relative inline-block ${className}`}>
      <svg
        aria-hidden="true"
        viewBox="0 0 300 60"
        preserveAspectRatio="none"
        className="pointer-events-none absolute -left-[4%] bottom-[0.02em] -z-0 h-[0.55em] w-[108%]"
      >
        <motion.path
          d="M6 34 C 70 22, 150 40, 294 26"
          fill="none"
          stroke="#FFD35C"
          strokeWidth="44"
          strokeLinecap="round"
          initial={reduce ? false : { pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.7, delay, ease: [0.65, 0, 0.35, 1] }}
        />
      </svg>
      <span className="relative">{children}</span>
    </span>
  );
};

export default Highlight;
