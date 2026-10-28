import { useState } from 'react';
import { createUserWithEmailAndPassword, updateProfile, sendEmailVerification } from 'firebase/auth';
import { auth } from '../../firebase/config';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { FcGoogle } from 'react-icons/fc';
import { PRIVACY_URL, TERMS_URL } from '../../utils/links';
import { Logo, Sparkle, Underline } from '../ui/Doodles';

const SignUp = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const { signInWithGoogle } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate passwords match
      if (formData.password !== formData.confirmPassword) {
        toast.error('Passwords do not match');
        return;
      }

      // Create user
      const { user } = await createUserWithEmailAndPassword(auth, formData.email, formData.password);

      // Update profile with name
      await updateProfile(user, {
        displayName: formData.name
      });

      // Send verification email
      await sendEmailVerification(user, {
        url: window.location.origin + '/login',
        handleCodeInApp: true,
      });

      // Show success message
      toast.success('Account created! Please check your email to verify your account.');
      
      // Navigate to a verification pending page
      navigate('/verify-email', { 
        state: { 
          email: formData.email,
          displayName: formData.name 
        } 
      });

    } catch (error) {
      console.error('Signup error:', error);
      let errorMessage = 'Failed to create account';
      
      switch (error.code) {
        // Same answer whether or not the email has an account, so the form
        // does not tell strangers who is registered.
        case 'auth/email-already-in-use':
          errorMessage = 'We could not create an account with this email. If you already have one, log in or reset your password.';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Invalid email address';
          break;
        case 'auth/weak-password':
          errorMessage = 'Password should be at least 6 characters';
          break;
        default:
          errorMessage = error.message;
      }
      
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      await signInWithGoogle();
      navigate('/dashboard');
    } catch (error) {
      console.error('Google sign in error:', error);
      toast.error('Failed to sign in with Google');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <div className="hd-page flex flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex justify-center">
          <Logo />
        </div>
        <div className="hd-card p-6 sm:p-8">
          <div className="text-center">
            <h2 className="relative inline-block">
              <span className="hd-title text-4xl sm:text-5xl">Create Account</span>
              <Underline className="absolute -bottom-3 left-0 w-full h-4 text-sun" />
              <Sparkle className="hidden sm:block absolute -right-9 -top-3 w-6 h-6 text-marker" />
            </h2>
            <p className="mt-5 hd-help">
              Already have an account?{' '}
              <Link to="/login" className="hd-link">
                Sign in
              </Link>
            </p>
          </div>

          <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <label htmlFor="name" className="hd-label">
                  Full Name
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  value={formData.name}
                  onChange={handleChange}
                  className="hd-input"
                  placeholder="John Doe"
                />
              </div>
              <div>
                <label htmlFor="email" className="hd-label">
                  Email Address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className="hd-input"
                  placeholder="you@example.com"
                />
              </div>
              <div>
                <label htmlFor="password" className="hd-label">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className="hd-input"
                  placeholder="••••••••"
                />
              </div>
              <div>
                <label htmlFor="confirmPassword" className="hd-label">
                  Confirm Password
                </label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="hd-input"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <p className="hd-help">
              By creating an account you accept the{' '}
              <a href={TERMS_URL} target="_blank" rel="noreferrer" className="hd-link">terms</a> and the{' '}
              <a href={PRIVACY_URL} target="_blank" rel="noreferrer" className="hd-link">privacy notice</a>.
            </p>

            <button type="submit" disabled={loading} className="hd-btn w-full">
              {loading ? 'Creating Account...' : 'Sign Up'}
            </button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t-2 border-dashed border-ink-soft/50"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-ink-soft">Or continue with</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="hd-btn hd-btn-secondary w-full"
            >
              <FcGoogle className="h-5 w-5" aria-hidden="true" />
              Sign up with Google
            </button>
          </form>

          <div className="mt-6 text-center">
            <button onClick={() => navigate('/')} className="hd-link">
              Go back
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignUp;
