import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiCode, FiTrendingUp, FiUsers, FiHeadphones } from 'react-icons/fi';
import BackButton from '../../components/common/BackButton';

const Careers = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const benefits = [
    {
      icon: FiCode,
      title: "Latest Tech Stack",
      description: "Work with cutting-edge technologies and modern development practices"
    },
    {
      icon: FiTrendingUp,
      title: "Career Growth",
      description: "Clear progression paths and regular feedback sessions"
    },
    {
      icon: FiUsers,
      title: "Great Team",
      description: "Collaborate with talented, passionate individuals globally"
    },
    {
      icon: FiHeadphones,
      title: "Remote First",
      description: "Work from anywhere with flexible hours"
    }
  ];

  return (
    <div className="min-h-screen bg-background pt-24 pb-16">
      <BackButton />
      <div className="max-w-6xl mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <h1 className="text-3xl md:text-4xl font-bold mb-4">
            <span className="gradient-text">Join Our Team</span>
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            Help us transform the future of appointment booking. We&apos;re looking for passionate
            individuals who want to make a difference.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mb-16"
        >
          <h2 className="text-2xl font-bold mb-6 text-white">Why Join Us?</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {benefits.map((benefit, index) => (
              <div key={index} className="bg-surface rounded-xl p-6">
                <benefit.icon className="text-primary text-2xl mb-4" />
                <h3 className="text-lg font-bold text-white mb-2">{benefit.title}</h3>
                <p className="text-gray-400 text-sm">{benefit.description}</p>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="text-center py-12 px-6 bg-surface rounded-xl"
        >
          <h2 className="text-2xl font-bold mb-4 text-white">Currently Not Recruiting</h2>
          <p className="text-gray-400 text-lg mb-6">
            We&apos;re not actively hiring at the moment, but we&apos;re always interested in meeting talented people.
          </p>
          <div className="flex flex-col items-center gap-4">
            <p className="text-gray-300">
              Send your resume to{' '}
              <a href="mailto:careers@reservease.com" className="text-primary hover:text-primary/80">
                careers@reservease.com
              </a>
            </p>
            <p className="text-sm text-gray-400">
              We&apos;ll keep your profile in our talent pool and contact you when relevant positions open up.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Careers;
