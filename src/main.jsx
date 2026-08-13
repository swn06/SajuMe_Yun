import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import SharedResult from './pages/SharedResult.jsx'
import { initAnalytics } from './lib/analytics.js'

initAnalytics()

const shareMatch = window.location.pathname.match(/^\/result\/([^/]+)\/?$/)

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {shareMatch ? <SharedResult token={decodeURIComponent(shareMatch[1])} /> : <App />}
  </StrictMode>,
)
