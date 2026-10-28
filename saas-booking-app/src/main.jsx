import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/caveat/600.css'
import '@fontsource/caveat/700.css'
import '@fontsource-variable/nunito'
import './index.css'
import dayjs from 'dayjs'
import 'dayjs/locale/es'
import { registerLocale, setDefaultLocale } from 'react-datepicker'
import { es } from 'date-fns/locale'
import App from './App.jsx'

// The interface is in Spanish: month and day names in calendars and pickers.
dayjs.locale('es')
registerLocale('es', es)
setDefaultLocale('es')

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
