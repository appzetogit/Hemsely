import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './modules/user/index.css'
import App from './modules/user/App.jsx'
import { initConsoleSanitizer } from './shared/utils/consoleSanitizer.js'

initConsoleSanitizer();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
