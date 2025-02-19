import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { FaRegCalendarAlt, FaRegClock, FaRegBell, FaMobileAlt, FaRegPaperPlane, FaRegClipboard } from 'react-icons/fa';
import { FiXCircle, FiCheckCircle } from 'react-icons/fi';

const ComparisonItem = ({ oldWay, newWay, icon: Icon, index, isLast }) => {
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });

  return (
    <>
      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: 20 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.5, delay: index * 0.1 }}
        className="flex flex-col md:flex-row justify-center items-center gap-4 md:gap-8 py-4"
      >
        {/* Mobile view - single column */}
        <div className="flex md:hidden flex-col items-center w-full max-w-sm gap-4">
          <div className="text-center w-full">
            <div className="flex items-center justify-center space-x-2 mb-2">
              <FiXCircle className="text-red-500 text-lg" />
              <h4 className="text-gray-300 font-medium text-base">{oldWay.title}</h4>
            </div>
            <p className="text-gray-400 text-sm">{oldWay.description}</p>
          </div>

          <div className="w-10 h-10 rounded-full bg-surface flex items-center justify-center">
            <Icon size={16} className="text-primary" />
          </div>

          <div className="text-center w-full">
            <div className="flex items-center justify-center space-x-2 mb-2">
              <FiCheckCircle className="text-green-500 text-lg" />
              <h4 className="text-gray-300 font-medium text-base">{newWay.title}</h4>
            </div>
            <p className="text-gray-400 text-sm">{newWay.description}</p>
          </div>
        </div>

        {/* Desktop view - three columns */}
        <div className="hidden md:flex md:flex-row justify-center items-center gap-8 w-full">
          <div className="w-[280px] text-right">
            <div className="flex items-start justify-end space-x-3">
              <div>
                <h4 className="text-gray-300 font-medium mb-1 text-base">{oldWay.title}</h4>
                <p className="text-gray-400 text-sm">{oldWay.description}</p>
              </div>
              <div className="mt-1">
                <FiXCircle className="text-red-500 text-lg" />
              </div>
            </div>
          </div>

          <div className="w-16 flex justify-center">
            <div className="w-10 h-10 rounded-full bg-surface flex items-center justify-center">
              <Icon size={16} className="text-primary" />
            </div>
          </div>

          <div className="w-[280px]">
            <div className="flex items-start space-x-3">
              <div className="mt-1">
                <FiCheckCircle className="text-green-500 text-lg" />
              </div>
              <div>
                <h4 className="text-gray-300 font-medium mb-1 text-base">{newWay.title}</h4>
                <p className="text-gray-400 text-sm">{newWay.description}</p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
      {!isLast && (
        <div className="w-full max-w-3xl mx-auto px-4">
          <div className="border-t border-gray-800/50"></div>
        </div>
      )}
    </>
  );
};

const WhySwitch = () => {
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });

  const comparisons = [
    {
      icon: FaRegCalendarAlt,
      oldWay: { title: "Manual paper calendars", description: "Double-bookings and scheduling conflicts" },
      newWay: { title: "Smart digital calendar", description: "Automatic conflict prevention" }
    },
    {
      icon: FaRegBell,
      oldWay: { title: "Calling clients one by one", description: "For appointment reminders" },
      newWay: { title: "Automated email notifications", description: "And reminders" }
    },
    {
      icon: FaRegClock,
      oldWay: { title: "Hours spent managing", description: "Appointment books and phone calls" },
      newWay: { title: "24/7 online booking system", description: "That works while you sleep" }
    },
    {
      icon: FaMobileAlt,
      oldWay: { title: "Limited to office hours", description: "And phone availability" },
      newWay: { title: "Clients book anytime", description: "Anywhere from their mobile devices" }
    },
    {
      icon: FaRegPaperPlane,
      oldWay: { title: "Manual follow-ups", description: "And feedback collection" },
      newWay: { title: "Automated follow-ups", description: "And digital feedback forms" }
    },
    {
      icon: FaRegClipboard,
      oldWay: { title: "Messy paperwork", description: "And lost appointment cards" },
      newWay: { title: "Digital records", description: "And instant booking confirmations" }
    }
  ];

  return (
    <section className="py-24 relative">
      <div className="max-w-6xl mx-auto px-4">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-3">
            <span className="gradient-text">Why Switch to Digital?</span>
          </h2>
          <p className="text-lg text-gray-400 max-w-xl mx-auto">
            See how ReserveEase transforms your traditional booking process into a modern, efficient system.
          </p>
        </motion.div>

        <div className="max-w-5xl mx-auto">
          {comparisons.map((comparison, index) => (
            <ComparisonItem 
              key={index} 
              {...comparison} 
              index={index}
              isLast={index === comparisons.length - 1}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default WhySwitch;
