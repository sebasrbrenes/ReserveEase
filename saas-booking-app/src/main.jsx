import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/caveat/600.css'
import '@fontsource/caveat/700.css'
import '@fontsource-variable/nunito'
import './index.css'
import dayjs from 'dayjs'
import 'dayjs/locale/es'
import { registerLocale, setDefaultLocale } from 'react-datepicker'
import { enUS, es } from 'date-fns/locale'
import App from './App.jsx'

// The interface is in Spanish: month and day names in calendars and pickers.
// The client pages can switch the pickers to English (business.language).
dayjs.locale('es')
registerLocale('es', es)
registerLocale('en', enUS)
setDefaultLocale('es')

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
