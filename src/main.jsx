import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

const mountEl = document.getElementById('desafio-root') ?? document.getElementById('root')
createRoot(mountEl).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
