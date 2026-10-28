import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Header from './components/Header'
import Hero from './components/notebook/Hero'
import Race from './components/notebook/Race'
import Chat from './components/notebook/Chat'
import YourBusiness from './components/notebook/YourBusiness'
import Ticket from './components/notebook/Ticket'
import Notes from './components/notebook/Notes'
import Night from './components/notebook/Night'
import Closing from './components/notebook/Closing'
import { BusinessProvider } from './components/notebook/BusinessContext'
import Footer from './components/Footer'

// Pages
import PrivacyPolicy from './pages/legal/PrivacyPolicy';
import PrivacyPolicyEn from './pages/legal/PrivacyPolicyEn';
import Terms from './pages/legal/Terms';
import About from './pages/company/About';

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
              <BusinessProvider>
                <main>
                  <Hero />
                  <Race />
                  <Chat />
                  <YourBusiness />
                  <Ticket />
                  <Notes />
                  <Night />
                  <Closing />
                </main>
              </BusinessProvider>
              <Footer />
            </div>
          }
        />

        {/* Legal Pages */}
        <Route path="/privacy-policy" element={<PrivacyPolicy />} />
        <Route path="/privacy-policy/en" element={<PrivacyPolicyEn />} />
        <Route path="/terms" element={<Terms />} />

        {/* Company Pages */}
        <Route path="/about" element={<About />} />
      </Routes>
    </Router>
  )
}

export default App
