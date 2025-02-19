import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { 
  FaCalendarAlt, 
  FaChartLine, 
  FaMobileAlt, 
  FaUsersCog,
  FaBell,
  FaLock,
} from 'react-icons/fa';

const features = [
  {
    icon: FaCalendarAlt,
    title: "Smart Scheduling",
    description: "AI-powered scheduling system that learns from your preferences and optimizes your calendar automatically.",
    highlight: "Reduce scheduling time by 85%"
  },
  {
    icon: FaChartLine,
    title: "Intelligent Analytics",
    description: "Real-time insights into your business performance with predictive booking trends and revenue forecasts.",
    highlight: "Make data-driven decisions"
  },
  {
    icon: FaMobileAlt,
    title: "Mobile-First Design",
    description: "Beautiful, responsive booking interface that works flawlessly across all devices and screen sizes.",
    highlight: "Book anywhere, anytime"
  },
  {
    icon: FaUsersCog,
    title: "Smart Team Management",
    description: "Automated staff scheduling with workload balancing and real-time availability updates.",
    highlight: "Optimize team efficiency"
  },
  {
    icon: FaBell,
    title: "Automated Notifications",
    description: "Smart reminder system with customizable templates and multi-channel notifications.",
    highlight: "Reduce no-shows by 50%"
  },
  {
    icon: FaLock,
    title: "Enterprise Security",
    description: "Bank-grade encryption and compliance with international data protection standards.",
    highlight: "Your data, protected"
  }
];

const FeatureCard = ({ icon: Icon, title, description, highlight, index }) => {
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className="group hover-card p-5 rounded-xl bg-surface relative overflow-hidden"
    >
      <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-secondary/5 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500 ease-out origin-left"></div>
      
      <div className="relative z-10">
        <div className="feature-icon mb-4 w-12 h-12">
          <Icon size={20} className="text-white" />
        </div>
        
        <h3 className="text-xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary">
          {title}
        </h3>
        
        <p className="text-gray-400 mb-3 text-sm">
          {description}
        </p>
        
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-primary">
            {highlight}
          </span>
        </div>
      </div>
    </motion.div>
  );
};

const Features = () => {
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });

  return (
    <section id="features" className="py-24 relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0">
        <div className="absolute top-1/2 left-0 w-72 h-72 bg-primary/5 rounded-full filter blur-3xl"></div>
        <div className="absolute bottom-0 right-0 w-72 h-72 bg-secondary/5 rounded-full filter blur-3xl"></div>
      </div>

      <div className="max-w-6xl mx-auto px-4 relative z-10">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-3">
            <span className="gradient-text">Powerful Features</span>
            <br />
            <span className="text-white">for Modern Businesses</span>
          </h2>
          <p className="text-lg text-gray-400 max-w-xl mx-auto">
            Transform your booking process with cutting-edge features designed to save time,
            reduce stress, and delight your customers.
          </p>
        </motion.div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <FeatureCard key={index} {...feature} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
