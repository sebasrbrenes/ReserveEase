import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { Link } from 'react-router-dom';
import { FaRegCalendarAlt, FaArrowRight } from 'react-icons/fa';
import SvgReserveEase from '../assets/images/svgReserveEase.svg';

const Hero = () => {
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });

  return (
    <section ref={ref} className="hero-bg relative pt-32 pb-36 overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 -left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 -right-1/4 w-96 h-96 bg-secondary/10 rounded-full blur-3xl"></div>
      </div>

      <div className="max-w-7xl mx-auto px-4 relative z-10">
        <motion.div
          className="text-center max-w-4xl mx-auto"
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
        >
          {/* Paper to Digital Animation Icon */}
          <motion.div
            className="mb-8 relative mx-auto w-24 h-24"
            initial={{ scale: 0 }}
            animate={inView ? { scale: 1, rotate: 360 } : {}}
            transition={{ duration: 0.8, type: "spring" }}
          >
            <div className="absolute inset-0 rounded-2xl"></div>
            <div className="absolute inset-1 bg-background rounded-2xl flex items-center justify-center">
              <img src={SvgReserveEase} alt="Icon ReserveEase" className='w-30 h-30' />
            </div>
          </motion.div>
          <motion.h1
            className="text-5xl md:text-7xl font-bold pb-6"
            initial={{ opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <span className="gradient-text">Ditch the Paper.</span>
            <br />
            <span className="text-white">Embrace Technology.</span>
          </motion.h1>
          
          <motion.p
            className="text-xl md:text-2xl text-gray-400 mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.4 }}
          >
            Transform your business from chaotic paper schedules to seamless digital booking.
            Save time, reduce no-shows, and delight your customers.
          </motion.p>
          
          <motion.div
            className="flex flex-col sm:flex-row items-center justify-center gap-6 relative z-10"
            initial={{ opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.6 }}
          >
            <Link
              to="https://app.reserveease.com/signup"
              className="group cta-button inline-flex items-center gap-2"
            >
              Start Free Trial
              <FaArrowRight className="transition-transform group-hover:translate-x-1" />
            </Link>
            <span className="text-gray-400">14-day free trial!</span>
          </motion.div>

          {/* Stats Section */}
          <motion.div
            className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8"
            initial={{ opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.8 }}
          >
            {[
              { number: "85%", text: "Less Time Spent on Scheduling" },
              { number: "50%", text: "Fewer No-Shows" },
              { number: "24/7", text: "Online Booking Availability" }
            ].map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-4xl font-bold gradient-text mb-2">{stat.number}</div>
                <div className="text-gray-400">{stat.text}</div>
              </div>
            ))}
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

export default Hero;
