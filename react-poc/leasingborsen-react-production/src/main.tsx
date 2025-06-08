import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { injectEmergencyStyles } from './emergency-styles'

// 🚨 NUCLEAR OPTION: Force CSS variables directly into DOM
// This bypasses all build tools and ensures styling works
injectEmergencyStyles()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
