import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { FiCheck } from 'react-icons/fi';
import { Link } from 'react-router-dom';

const features = [
  'Unlimited bookings',
  'Smart scheduling & reminders',
  'Customer management',
  'Calendar integrated',
  'Email and SMS notifications',
  'Analytics dashboard',
  'Mobile-friendly booking page',
  'Security & privacy',
];

const PricingCard = () => {
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 50 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5 }}
      className="relative rounded-2xl p-1 bg-blue-500 max-w-xl mx-auto"
    >
      <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-blue-500 px-6 py-1.5 rounded-full text-sm font-medium">
        14-Day Free Trial
      </div>
      
      <div className="h-full rounded-xl bg-gray-900 p-8">
        <div className="text-center mb-6">
          <h3 className="text-xl font-bold mb-2 gradient-text">Everything you need</h3>
          <p className="text-gray-400 text-base mb-6">Simple, powerful booking solution for your business</p>
          <div className="flex items-center justify-center gap-10 mb-2">
            <div className="pricing-option w-56">
              <div className="flex flex-col items-center">
                <div className="flex items-start">
                  <span className="text-2xl font-bold text-primary mt-2">$</span>
                  <span className="text-6xl font-extrabold text-primary mx-1">29</span>
                </div>
                <div className="flex flex-col items-center mt-1">
                  <span className="text-gray-400 text-base">/month</span>
                  <span className="text-sm text-gray-400 mb-14">Billed monthly</span>
                </div>
              </div>
            </div>

            <div className="pricing-option mb-9 w-56">
              <div className="flex flex-col items-center pt-6">
                <div className="flex items-start">
                  <span className="text-2xl font-bold text-primary mt-2">$</span>
                  <span className="text-6xl font-extrabold text-primary mx-1">260</span>
                </div>
                <div className="flex flex-col items-center mt-1">
                  <span className="text-gray-400 text-base">/year</span>
                  <span className="text-sm text-gray-400">Billed yearly</span>
                </div>
                <div className="mt-3">
                  <span className="inline-block bg-gradient-to-r from-green-400 to-green-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                  Save $90 yearly! 🎉
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {features.map((feature, i) => (
            <div key={i} className="flex items-center text-gray-300 text-sm">
              <FiCheck className="mr-2 text-primary" />
              {feature}
            </div>
          ))}
        </div>

        <Link
          to="https://app.reserveease.com/signup"
          className="w-full flex items-center justify-center py-4 rounded-lg bg-blue-600 text-white font-medium hover:opacity-70 transition-opacity text-lg"
        >
          Start Your Free Trial
        </Link>
      </div>
    </motion.div>
  );
};

const Pricing = () => {
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });

  return (
    <section id="pricing" className="py-32 relative">
      <div className="max-w-7xl mx-auto px-4">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            <span className="gradient-text">One Simple Plan</span>
          </h2>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            Try all features free for 14 days.
          </p>
        </motion.div>

        <PricingCard />
      </div>
    </section>
  );
};

export default Pricing;
