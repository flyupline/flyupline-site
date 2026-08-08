import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './styles/theme.css'
import './styles/admin.css'
import App from './App.jsx'
import { initTheme } from './lib/theme.js'

// Capture the auth link type (invite / recovery / magiclink) before the
// Supabase client consumes and clears the URL hash.
try {
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''))
  window.__authFlowType = hash.get('type') || new URLSearchParams(window.location.search).get('type') || null
} catch {
  window.__authFlowType = null
}

initTheme()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
