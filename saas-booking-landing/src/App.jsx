import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Header from './components/Header'
import Hero from './components/notebook/Hero'
import Race from './components/notebook/Race'
import Closing from './components/notebook/Closing'
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
            <div className="min-h-screen overflow-x-clip bg-paper text-ink">
              <Header />
              <main>
                <Hero />
                <Race />
                <Closing />
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
