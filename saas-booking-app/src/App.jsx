import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { SettingsProvider } from './context/SettingsContext'
import { AuthProvider } from './context/AuthContext'
import { LanguageProvider } from './i18n/LanguageContext'
import { Toaster } from 'react-hot-toast'
import ProtectedRoute from './components/auth/ProtectedRoute'
import Login from './components/auth/Login'
import SignUp from './components/auth/SignUp'
import ForgotPassword from './components/auth/ForgotPassword'
import VerifyEmail from './components/auth/VerifyEmail'
import Dashboard from './components/dashboard/Dashboard'
import Settings from './components/settings/Settings'
import Feedback from './components/feedback/Feedback'
import PublicBookingForm from './components/appointments/PublicBookingForm'
import BookingSuccess from './components/appointments/BookingSuccess'
import ManageBooking from './components/appointments/ManageBooking'
import StyleGuide from './components/ui/StyleGuide'
import './App.css'

// /feedback opened directly: the feedback dialog over an empty page,
// returning to the dashboard when closed.
function FeedbackPage() {
  const navigate = useNavigate()
  return <Feedback isOpen onClose={() => navigate('/dashboard')} />
}

function App() {
  return (
    <LanguageProvider>
      <Router>
        <AuthProvider>
            <SettingsProvider>
              <Toaster
                position="top-right"
                toastOptions={{
                  duration: 3000,
                  style: {
                    background: '#333',
                    color: '#fff',
                  },
                  success: {
                    iconTheme: {
                      primary: '#10B981',
                      secondary: '#fff',
                    },
                  },
                  error: {
                    iconTheme: {
                      primary: '#EF4444',
                      secondary: '#fff',
                    },
                  },
                }}
              />
              <Routes>
                {/* Public Routes */}
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<SignUp />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/verify-email" element={<VerifyEmail />} />
                <Route path="/book/:slug" element={<PublicBookingForm />} />
                <Route path="/booking/success/:slug" element={<BookingSuccess />} />
                <Route path="/manage/:businessId/:appointmentId" element={<ManageBooking />} />
                <Route path="/style-guide" element={<StyleGuide />} />
                
                {/* Protected Routes */}
                <Route path="/" element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                } />
                <Route path="/dashboard" element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                } />
                <Route path="/settings" element={
                  <ProtectedRoute>
                    <Settings />
                  </ProtectedRoute>
                } />
                <Route path="/feedback" element={
                  <ProtectedRoute>
                    <FeedbackPage />
                  </ProtectedRoute>
                } />

                {/* Catch all route */}
                <Route path="*" element={<Navigate to="/login" replace />} />
              </Routes>
            </SettingsProvider>
        </AuthProvider>
      </Router>
    </LanguageProvider>
  )
}

export default App
