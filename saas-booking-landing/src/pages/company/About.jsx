import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import BackButton from '../../components/common/BackButton';

const About = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-background pt-24 pb-16">
      <BackButton />
      <div className="max-w-4xl mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <h1 className="text-3xl md:text-4xl font-bold mb-4">
            <span className="gradient-text">About ReserveEase</span>
          </h1>
          <p className="text-gray-400 text-lg">Transforming the way businesses manage appointments</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="space-y-8"
        >
          <div className="bg-surface rounded-xl p-6">
            <h2 className="text-2xl font-bold mb-4 text-white">Our Story</h2>
            <p className="text-gray-300">
              Founded in 2024, ReserveEase emerged from a simple observation: businesses needed a better way to manage appointments. 
              Our founders experienced firsthand the challenges of traditional booking systems and decided to create a solution that 
              would make appointment management effortless for both businesses and their clients.
            </p>
          </div>

          <div className="bg-surface rounded-xl p-6">
            <h2 className="text-2xl font-bold mb-4 text-white">Our Mission</h2>
            <p className="text-gray-300">
              We're on a mission to revolutionize appointment booking by providing businesses with powerful, yet simple-to-use 
              digital tools. We believe that every business, regardless of size, deserves access to modern booking technology 
              that can help them grow and better serve their clients.
            </p>
          </div>

          <div className="bg-surface rounded-xl p-6">
            <h2 className="text-2xl font-bold mb-4 text-white">Our Values</h2>
            <ul className="space-y-4 text-gray-300">
              <li>
                <strong className="text-primary">Innovation:</strong> Continuously improving our platform with cutting-edge features
              </li>
              <li>
                <strong className="text-primary">Simplicity:</strong> Making complex technology accessible and easy to use
              </li>
              <li>
                <strong className="text-primary">Reliability:</strong> Providing a stable and secure platform you can count on
              </li>
              <li>
                <strong className="text-primary">Customer Focus:</strong> Putting our users' needs at the heart of everything we do
              </li>
            </ul>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default About;
