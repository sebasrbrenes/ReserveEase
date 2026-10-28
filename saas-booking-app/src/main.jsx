import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/caveat/600.css'
import '@fontsource/caveat/700.css'
import '@fontsource-variable/nunito'
import './index.css'
import { registerLocale } from 'react-datepicker'
import { enUS, es } from 'date-fns/locale'
import App from './App.jsx'
import { applyLanguage, initialLanguage } from './i18n/language'

// Month and day names of the date pickers, in both languages.
registerLocale('es', es)
registerLocale('en', enUS)
applyLanguage(initialLanguage())

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
