import { useState } from 'react';
import { createUserWithEmailAndPassword, updateProfile, sendEmailVerification } from 'firebase/auth';
import { auth } from '../../firebase/config';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { FcGoogle } from 'react-icons/fc';
import { PRIVACY_URL, PRIVACY_URL_EN, TERMS_URL, TERMS_URL_EN } from '../../utils/links';
import { Logo, Sparkle, Underline } from '../ui/Doodles';
import LanguageSwitch from '../common/LanguageSwitch';
import { useLanguage } from '../../i18n/LanguageContext';

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
  const { language, t: { auth: copy, common } } = useLanguage();
  const s = copy.signup;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate passwords match
      if (formData.password !== formData.confirmPassword) {
        toast.error(s.mismatch);
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
      toast.success(s.created);
      
      // Navigate to a verification pending page
      navigate('/verify-email', { 
        state: { 
          email: formData.email,
          displayName: formData.name 
        } 
      });

    } catch (error) {
      console.error('Signup error:', error);
      let errorMessage = s.failed;
      
      switch (error.code) {
        // Same answer whether or not the email has an account, so the form
        // does not tell strangers who is registered.
        case 'auth/email-already-in-use':
          errorMessage = s.emailInUse;
          break;
        case 'auth/invalid-email':
          errorMessage = copy.errors.invalidEmail;
          break;
        case 'auth/weak-password':
          errorMessage = s.weakPassword;
          break;
        default:
          errorMessage = s.tryAgain;
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
      toast.error(copy.errors.googleFailed);
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
        <div className="mb-2 flex justify-end">
          <LanguageSwitch />
        </div>
        <div className="mb-6 flex justify-center">
          <Logo />
        </div>
        <div className="hd-card p-6 sm:p-8">
          <div className="text-center">
            <h2 className="relative inline-block">
              <span className="hd-title text-4xl sm:text-5xl">{s.title}</span>
              <Underline className="absolute -bottom-3 left-0 w-full h-4 text-sun" />
              <Sparkle className="hidden sm:block absolute -right-9 -top-3 w-6 h-6 text-marker" />
            </h2>
            <p className="mt-5 hd-help">
              {s.haveAccount}{' '}
              <Link to="/login" className="hd-link">
                {s.signIn}
              </Link>
            </p>
          </div>

          <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <label htmlFor="name" className="hd-label">
                  {s.name}
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  value={formData.name}
                  onChange={handleChange}
                  className="hd-input"
                  placeholder={s.namePlaceholder}
                />
              </div>
              <div>
                <label htmlFor="email" className="hd-label">
                  {common.email}
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
                  placeholder={common.emailPlaceholder}
                />
              </div>
              <div>
                <label htmlFor="password" className="hd-label">
                  {s.password}
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
                  {s.confirmPassword}
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
              {s.accept[0]}
              <a href={language === 'en' ? TERMS_URL_EN : TERMS_URL} target="_blank" rel="noreferrer" className="hd-link">{s.accept[1]}</a>{s.accept[2]}
              <a href={language === 'en' ? PRIVACY_URL_EN : PRIVACY_URL} target="_blank" rel="noreferrer" className="hd-link">{s.accept[3]}</a>{s.accept[4]}
            </p>

            <button type="submit" disabled={loading} className="hd-btn w-full">
              {loading ? s.submitting : s.submit}
            </button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t-2 border-dashed border-ink-soft/50"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-ink-soft">{s.or}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="hd-btn hd-btn-secondary w-full"
            >
              <FcGoogle className="h-5 w-5" aria-hidden="true" />
              {s.google}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button onClick={() => navigate('/')} className="hd-link">
              {s.back}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignUp;
