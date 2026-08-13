import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import SharedResult from './SharedResult.jsx'

const shareMatch = window.location.pathname.match(/^\/result\/([^/]+)\/?$/)

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {shareMatch ? <SharedResult token={decodeURIComponent(shareMatch[1])} /> : <App />}
  </StrictMode>,
)
