import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './modules/user/index.css'
import App from './modules/user/App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
