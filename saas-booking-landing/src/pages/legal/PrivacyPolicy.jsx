import { useEffect } from 'react';
import { motion } from 'framer-motion';
import BackButton from '../../components/common/BackButton';

const PrivacyPolicy = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="hd-page pt-20 pb-16">
      <BackButton />
      <div className="max-w-4xl mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-12"
        >
          <h1 className="text-3xl md:text-4xl font-bold mb-4 text-center">
            <span className="hd-title text-5xl md:text-6xl">Privacy Policy</span>
          </h1>
          <p className="text-ink-soft text-center">Last updated: January 20, 2025</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="space-y-8 text-ink"
        >
          <section>
            <h2 className="text-2xl font-extrabold mb-4">Introduction</h2>
            <p className="mb-4">
              At ReserveEase, we take your privacy seriously. This Privacy Policy explains how we collect,
              use, disclose, and safeguard your information when you use our service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-extrabold mb-4">Information We Collect</h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-xl font-semibold mb-2 text-marker">Personal Information</h3>
                <p>We may collect personal information that you provide, including:</p>
                <ul className="list-disc pl-6 mt-2 space-y-2">
                  <li>Name and contact information</li>
                  <li>Billing information</li>
                  <li>Business details</li>
                  <li>Account credentials</li>
                </ul>
              </div>

              <div>
                <h3 className="text-xl font-semibold mb-2 text-marker">Usage Information</h3>
                <p>We automatically collect certain information about your device, including:</p>
                <ul className="list-disc pl-6 mt-2 space-y-2">
                  <li>IP address</li>
                  <li>Browser type</li>
                  <li>Device information</li>
                  <li>Usage patterns</li>
                </ul>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-extrabold mb-4">How We Use Your Information</h2>
            <p className="mb-4">We use the information we collect to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Provide and maintain our service</li>
              <li>Improve and personalize user experience</li>
              <li>Process transactions</li>
              <li>Send administrative information</li>
              <li>Provide customer support</li>
              <li>Ensure platform security</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-extrabold mb-4">Data Security</h2>
            <p>
              We implement appropriate technical and organizational measures to maintain the security of your
              personal information. However, please note that no method of transmission over the internet or
              electronic storage is 100% secure.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-extrabold mb-4">Contact Us</h2>
            <p>
              If you have questions about this Privacy Policy, please contact us at{' '}
              <a href="mailto:contact@reservease.com" className="hd-link">
                contact@reservease.com
              </a>
            </p>
          </section>
        </motion.div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
