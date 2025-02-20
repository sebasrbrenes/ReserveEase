import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { TimeProvider } from './context/TimeContext'
import { SettingsProvider } from './context/SettingsContext'
import { AuthProvider } from './context/AuthContext'
import { Toaster } from 'react-hot-toast'
import ProtectedRoute from './components/auth/ProtectedRoute'
import Login from './components/auth/Login'
import SignUp from './components/auth/SignUp'
import ForgotPassword from './components/auth/ForgotPassword'
import Dashboard from './components/dashboard/Dashboard'
import Settings from './components/settings/Settings'
import Feedback from './components/feedback/Feedback'
import PublicBookingForm from './components/appointments/PublicBookingForm'
import BookingSuccess from './components/appointments/BookingSuccess'
import Pricing from './components/pricing/PricingPlans'
import './App.css'

function App() {
  const currentTime = new Date().toISOString()

  return (
    <Router>
      <AuthProvider>
        <TimeProvider currentTime={currentTime}>
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
              <Route path="/book/:providerId" element={<PublicBookingForm />} />
              <Route path="/booking/success/:providerId" element={<BookingSuccess />} />
              
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
                  <Feedback />
                </ProtectedRoute>
              } />
              <Route path="/pricing" element={
                <ProtectedRoute>
                  <Pricing />
                </ProtectedRoute>
              } />

              {/* Catch all route */}
              <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
          </SettingsProvider>
        </TimeProvider>
      </AuthProvider>
    </Router>
  )
}

export default App
