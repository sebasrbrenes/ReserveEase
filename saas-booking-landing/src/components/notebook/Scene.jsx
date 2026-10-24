// One "hour" of the notebook. The left column is the red margin with the time
// of day; consecutive scenes line up so the margin reads as one line.
const Scene = ({ id, time, labelledBy, className = '', children }) => (
  <section id={id} aria-labelledby={labelledBy} className={`scroll-mt-16 nb-ruled ${className}`}>
    <div className="mx-auto max-w-7xl grid grid-cols-[2.75rem_1fr] md:grid-cols-[7rem_1fr]">
      <div className="border-r-2 border-coral/50">
        <p className="sticky top-20 pt-10 md:pt-16 pr-2 md:pr-4 text-right font-hand font-bold text-xl md:text-3xl text-coral">
          <time>{time}</time>
        </p>
      </div>
      <div className="min-w-0 pl-4 pr-4 md:pl-12 md:pr-8 py-14 md:py-24">{children}</div>
    </div>
  </section>
);

export default Scene;
