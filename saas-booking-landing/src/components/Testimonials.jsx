import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { FaQuoteLeft } from 'react-icons/fa';

// Import your images here
// Example:
import testimonial1 from '../assets/images/testimonial1.jpg';
import testimonial2 from '../assets/images/testimonial2.jpg';
import testimonial3 from '../assets/images/testimonial3.jpg';

const testimonials = [
  {
    name: "Steven Johnson",
    role: "Barber Owner",
    company: "The Barber Cut",
    content: "ReserveEase transformed how I managed appointments. Our no-show rate dropped by 40% in the first month!",
    image: testimonial1,
  },
  {
    name: "Michael Chen",
    role: "Fitness Trainer",  
    company: "Elite Fitness",
    content: "The automated scheduling has saved me hours each week. Now I can focus more on my clients and less on admin work.",
    image: testimonial2,
  },
  {
    name: "Emma Brick",
    role: "Dental Practice Manager",
    company: "Bright Smile Dental",
    content: "The interface is intuitive and our patients love the easy booking process. Best decision we've made for our practice.",
    image: testimonial3,
  }
];

const TestimonialCard = ({ testimonial, index }) => {
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });

  const isEven = index % 2 === 0;
  const cardClassName = `relative p-5 rounded-xl ${
    isEven 
      ? 'bg-gradient-to-br from-primary/10 to-secondary/10' 
      : 'bg-gradient-to-br from-secondary/10 to-primary/10'
  } backdrop-blur-sm border border-gray-800 hover:border-primary/50 transition-all duration-300 ${
    index % 2 === 0 ? 'lg:translate-y-6' : ''
  }`;

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 50, x: isEven ? -20 : 20 }}
      animate={inView ? { opacity: 1, y: 0, x: 0 } : {}}
      transition={{ duration: 0.8, delay: index * 0.2 }}
      className={cardClassName}
    >
      <div className="absolute -top-3 -left-3 text-primary/20 text-3xl">
        <FaQuoteLeft />
      </div>
      
      <div className="flex flex-col items-center text-center">
        <img 
          src={testimonial.image} 
          alt={testimonial.name}
          className="w-16 h-16 rounded-full mb-3 object-cover border-2 border-primary/50"
        />
        <p className="text-gray-300 mb-3 text-sm">
          "{testimonial.content}"
        </p>
        <div>
          <h4 className="font-semibold text-white text-base">{testimonial.name}</h4>
          <p className="text-xs text-gray-400">{testimonial.role}</p>
          <p className="text-xs text-primary">{testimonial.company}</p>
        </div>
      </div>
    </motion.div>
  );
};

const Testimonials = () => {
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });

  return (
    <section id="testimonials" className="py-24 relative">
      <div className="max-w-6xl mx-auto px-4">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-3">
            <span className="gradient-text">What Our Clients Say</span>
          </h2>
          <p className="text-lg text-gray-400 max-w-xl mx-auto">
            Don't just take our word for it. Here's what professionals across
            different industries have to say about ReserveEase.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {testimonials.map((testimonial, index) => (
            <TestimonialCard key={index} testimonial={testimonial} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
