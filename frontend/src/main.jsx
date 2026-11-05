import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Work Sans se instala con npm y viaja dentro del paquete: no depende de internet.
import '@fontsource/work-sans/400.css'
import '@fontsource/work-sans/500.css'
import '@fontsource/work-sans/600.css'
import '@fontsource/work-sans/700.css'
import './styles.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
