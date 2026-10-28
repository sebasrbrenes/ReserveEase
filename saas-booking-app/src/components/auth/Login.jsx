import { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../firebase/config';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { FcGoogle } from 'react-icons/fc';
import { Logo, Star, Underline } from '../ui/Doodles';

const Login = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const { signInWithGoogle } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { user } = await signInWithEmailAndPassword(auth, formData.email, formData.password);
      
      if (!user.emailVerified) {
        toast.error('Verifica tu correo antes de entrar');
        // Stay signed in so the verification screen can resend the email.
        navigate('/verify-email', { 
          state: { 
            email: user.email,
            displayName: user.displayName 
          } 
        });
        return;
      }

      toast.success('¡Bienvenido de nuevo!');
      navigate('/dashboard');
    } catch (error) {
      console.error('Login error:', error);
      let errorMessage = 'No pudimos iniciar sesión';
      
      switch (error.code) {
        case 'auth/invalid-email':
          errorMessage = 'El correo no es válido';
          break;
        case 'auth/user-disabled':
          errorMessage = 'Esta cuenta está desactivada';
          break;
        case 'auth/user-not-found':
          errorMessage = 'No hay ninguna cuenta con este correo';
          break;
        case 'auth/invalid-credential':
        case 'auth/wrong-password':
          errorMessage = 'El correo o la contraseña no son correctos';
          break;
        default:
          errorMessage = 'No pudimos iniciar sesión';
      }
      
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      await signInWithGoogle();
      toast.success('¡Bienvenido!');
      navigate('/dashboard');
    } catch (error) {
      console.error('Google sign in error:', error);
      toast.error('No pudimos entrar con Google');
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
              <span className="hd-title text-4xl sm:text-5xl">Hola de nuevo</span>
              <Underline className="absolute -bottom-3 left-0 w-full h-4 text-sun" />
              <Star className="hidden sm:block absolute -right-9 -top-2 w-6 h-6 text-marker rotate-12" />
            </h2>
            <p className="mt-5 hd-help">
              ¿No tienes cuenta?{' '}
              <Link to="/signup" className="hd-link">
                Crea una
              </Link>
            </p>
          </div>
          <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email-address" className="hd-label">
                Correo electrónico
              </label>
              <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={formData.email}
                onChange={handleChange}
                className="hd-input"
                placeholder="tu@correo.com"
              />
            </div>
            <div>
              <label htmlFor="password" className="hd-label">
                Contraseña
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={formData.password}
                onChange={handleChange}
                className="hd-input"
                placeholder="Contraseña"
              />
            </div>

            <div className="text-sm">
              <Link to="/forgot-password" className="hd-link">
                ¿Olvidaste tu contraseña?
              </Link>
            </div>

            <button type="submit" disabled={loading} className="hd-btn w-full">
              {loading ? 'Entrando...' : 'Entrar'}
            </button>

            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading}
              className="hd-btn hd-btn-secondary w-full"
            >
              <FcGoogle className="w-5 h-5" aria-hidden="true" />
              Entrar con Google
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
