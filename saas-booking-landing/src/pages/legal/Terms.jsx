import { useEffect } from 'react';
import { motion } from 'framer-motion';
import BackButton from '../../components/common/BackButton';

const Terms = () => {
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
          className="mb-12"
        >
          <h1 className="text-3xl md:text-4xl font-bold mb-4 text-center">
            <span className="gradient-text">Terms of Service</span>
          </h1>
          <p className="text-gray-400 text-center">Last updated: January 20, 2025</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="space-y-8 text-gray-300"
        >
          <section>
            <h2 className="text-2xl font-bold mb-4 text-white">1. Agreement to Terms</h2>
            <p>
              By accessing or using ReserveEase&apos;s services, you agree to be bound by these Terms of Service
              and all applicable laws and regulations. If you do not agree with any of these terms, you
              are prohibited from using or accessing our service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4 text-white">2. Use License</h2>
            <div className="space-y-4">
              <p>
                Permission is granted to temporarily access and use ReserveEase&apos;s services for personal
                or business use, subject to the following restrictions:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>You must not modify or copy our software</li>
                <li>You must not attempt to reverse engineer the software</li>
                <li>You must not access without authorization</li>
                <li>You must not transfer the materials to another person or mirror them</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4 text-white">3. Service Terms</h2>
            <div className="space-y-4">
              <h3 className="text-xl font-semibold mb-2 text-primary">3.1 Account Terms</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li>You must be 18 years or older to use this service</li>
                <li>You must provide accurate and complete information</li>
                <li>You are responsible for maintaining account security</li>
                <li>You must notify us of any security breaches</li>
              </ul>

              <h3 className="text-xl font-semibold mb-2 text-primary">3.2 Payment Terms</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li>Subscription fees are billed in advance</li>
                <li>All fees are non-refundable</li>
                <li>We reserve the right to change pricing with notice</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4 text-white">4. Disclaimer</h2>
            <p>
              ReserveEase&apos;s services are provided &quot;as is&quot;. We make no warranties, expressed or implied,
              and hereby disclaim and negate all other warranties including, without limitation,
              implied warranties or conditions of merchantability, fitness for a particular purpose,
              or non-infringement of intellectual property or other violation of rights.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4 text-white">5. Limitations</h2>
            <p>
              In no event shall ReserveEase or its suppliers be liable for any damages (including,
              without limitation, damages for loss of data or profit, or due to business interruption)
              arising out of the use or inability to use our services.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4 text-white">6. Contact</h2>
            <p>
              Questions about the Terms of Service should be sent to us at{' '}
              <a href="mailto:contact@reservease.com" className="text-primary hover:text-primary/80">
                contact@reservease.com
              </a>
            </p>
          </section>
        </motion.div>
      </div>
    </div>
  );
};

export default Terms;
