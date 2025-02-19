import { useState } from 'react';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../../firebase/config';
import { motion } from 'framer-motion';
import { FiMail, FiArrowLeft, FiCheck } from 'react-icons/fi';
import { Link } from 'react-router-dom';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await sendPasswordResetEmail(auth, email);
      setSuccess(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-dark px-4">
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-0 right-1/4 w-64 h-64 bg-primary/20 rounded-full filter blur-3xl" />
        <div className="absolute bottom-0 left-1/4 w-64 h-64 bg-secondary/20 rounded-full filter blur-3xl" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full space-y-8 relative"
      >
        <Link 
          to="/login"
          className="absolute -top-16 left-0 flex items-center text-gray-400 hover:text-white transition-colors"
        >
          <FiArrowLeft className="mr-2" />
          Back to Login
        </Link>

        <div>
          <h2 className="mt-6 text-center text-3xl font-bold gradient-text">
            Reset Password
          </h2>
          <p className="mt-2 text-center text-gray-400">
            Enter your email address and we'll send you a link to reset your password
          </p>
        </div>

        {success ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl p-1 bg-gradient-to-br from-green-500 to-green-600"
          >
            <div className="bg-dark-lighter rounded-xl p-6 text-center">
              <div className="mx-auto w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center mb-4">
                <FiCheck className="text-2xl text-green-500" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Check your email</h3>
              <p className="text-gray-400 mb-4">
                We've sent a password reset link to {email}
              </p>
              <Link
                to="/login"
                className="text-primary hover:text-primary/80 transition-colors"
              >
                Back to Login
              </Link>
            </div>
          </motion.div>
        ) : (
          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            <div className="rounded-2xl p-1 bg-gradient-to-br from-primary to-secondary">
              <div className="bg-dark-lighter rounded-xl p-6 space-y-4">
                <div>
                  <label htmlFor="email" className="sr-only">Email address</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center">
                      <FiMail className="text-gray-400" />
                    </div>
                    <input
                      id="email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="block w-full pl-10 pr-3 py-2 border border-gray-700 rounded-lg bg-dark text-gray-300 focus:ring-2 focus:ring-primary/50 focus:border-transparent"
                      placeholder="Email address"
                    />
                  </div>
                </div>

                {error && (
                  <div className="text-red-500 text-sm mt-2">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center py-2 px-4 border border-transparent rounded-lg text-white bg-gradient-to-r from-primary to-secondary hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary/50"
                >
                  {loading ? (
                    <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    'Send Reset Link'
                  )}
                </button>
              </div>
            </div>
          </form>
        )}
      </motion.div>
    </div>
  );
};

export default ForgotPassword;
