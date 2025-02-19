import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Header from './components/Header'
import Hero from './components/Hero'
import Features from './components/Features'
import WhySwitch from './components/WhySwitch'
import Testimonials from './components/Testimonials'
import Pricing from './components/Pricing'
import FAQ from './components/FAQ'
import Footer from './components/Footer'
import './styles/landing.css'

// Pages
import PrivacyPolicy from './pages/legal/PrivacyPolicy';
import Terms from './pages/legal/Terms';
import About from './pages/company/About';
import Careers from './pages/company/Careers';
import RefundPolicy from './pages/legal/RefundPolicy';

function App() {
  return (
    <Router>
      <Routes>
        {/* Main Landing Page */}
        <Route
          path="/"
          element={
            <>
              <Header />
              <main>
                <Hero />
                <WhySwitch />
                <Features />
                <Testimonials />
                <Pricing />
                <FAQ />
              </main>
              <Footer />
            </>
          }
        />

        {/* Legal Pages */}
        <Route path="/privacy-policy" element={<PrivacyPolicy />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/refund-policy" element={<RefundPolicy />} />

        {/* Company Pages */}
        <Route path="/about" element={<About />} />
        <Route path="/careers" element={<Careers />} />
      </Routes>
    </Router>
  )
}

export default App
