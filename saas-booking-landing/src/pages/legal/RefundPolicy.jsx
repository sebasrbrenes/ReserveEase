import { useEffect } from 'react';
import { motion } from 'framer-motion';
import BackButton from '../../components/common/BackButton';

const RefundPolicy = () => {
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
            <span className="hd-title text-5xl md:text-6xl">Refund Policy</span>
          </h1>
          <p className="text-ink-soft text-center">Last updated: February 10, 2025</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="space-y-8 text-ink"
        >
          <section>
            <h2 className="text-2xl font-extrabold mb-4">Overview</h2>
            <p className="mb-4">
              At ReserveEase, we strive to ensure complete satisfaction with our services. This Refund Policy
              outlines the terms and conditions for refunds on our subscription plans and services.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-extrabold mb-4">Subscription Refunds</h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-xl font-semibold mb-2 text-marker">14-Day Money-Back Guarantee</h3>
                <p>We offer a 14-day money-back guarantee on all new subscriptions:</p>
                <ul className="list-disc pl-6 mt-2 space-y-2">
                  <li>Full refund if requested within 14 days of initial purchase</li>
                  <li>No questions asked during the guarantee period</li>
                  <li>Refund processed within 5-7 business days</li>
                </ul>
              </div>

              <div>
                <h3 className="text-xl font-semibold mb-2 text-marker">Cancellation & Prorated Refunds</h3>
                <p>For subscription cancellations after the 14-day period:</p>
                <ul className="list-disc pl-6 mt-2 space-y-2">
                  <li>Service continues until the end of the current billing period</li>
                  <li>No prorated refunds for unused time</li>
                  <li>Cancellation takes effect at the end of the current billing cycle</li>
                </ul>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-extrabold mb-4">Refund Exceptions</h2>
            <p className="mb-4">Refunds may not be available in the following cases:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Violation of our Terms of Service</li>
              <li>Abuse of the refund policy</li>
              <li>Special promotional or discounted subscriptions</li>
              <li>Add-on services or custom development work</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-extrabold mb-4">How to Request a Refund</h2>
            <p className="mb-4">To request a refund:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Contact our support team via email</li>
              <li>Include your account details and reason for refund</li>
              <li>Allow up to 7 business days for processing</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-extrabold mb-4">Contact Us</h2>
            <p>
              If you have questions about our refund policy, please contact us at{' '}
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

export default RefundPolicy;
