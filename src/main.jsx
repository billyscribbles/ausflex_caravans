import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HelmetProvider } from 'react-helmet-async'
import { applyTheme } from './lib/applyTheme.js'
import { initAnalytics } from './lib/analytics.js'
import './index.css'
import App from './App.jsx'

applyTheme()
initAnalytics()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <HelmetProvider>
      <App />
    </HelmetProvider>
  </StrictMode>,
)
