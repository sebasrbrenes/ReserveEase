import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Header from './components/Header'
import Hero from './components/Hero'
import Features from './components/Features'
import HowItWorks from './components/HowItWorks'
import Pricing from './components/Pricing'
import FAQ from './components/FAQ'
import Footer from './components/Footer'

// Pages
import PrivacyPolicy from './pages/legal/PrivacyPolicy';
import Terms from './pages/legal/Terms';
import About from './pages/company/About';
import RefundPolicy from './pages/legal/RefundPolicy';

function App() {
  return (
    <Router>
      <Routes>
        {/* Main Landing Page */}
        <Route
          path="/"
          element={
            <div className="hd-page overflow-x-clip">
              <Header />
              <main>
                <Hero />
                <HowItWorks />
                <Features />
                <Pricing />
                <FAQ />
              </main>
              <Footer />
            </div>
          }
        />

        {/* Legal Pages */}
        <Route path="/privacy-policy" element={<PrivacyPolicy />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/refund-policy" element={<RefundPolicy />} />

        {/* Company Pages */}
        <Route path="/about" element={<About />} />
      </Routes>
    </Router>
  )
}

export default App
