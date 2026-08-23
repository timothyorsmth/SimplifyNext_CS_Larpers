import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { CaregiverProvider } from './Context/CaregiverContext'
import App from './App.tsx'
import "./index.css"

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <CaregiverProvider>
      <App />
    </CaregiverProvider>
  </StrictMode>,
)
