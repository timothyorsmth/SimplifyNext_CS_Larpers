import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { CaregiverProvider } from './Context/CaregiverContext'
import App from './App.tsx'
import "./index.css"
import { CareRecipientProvider } from './Context/CareRecipientContext.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <CaregiverProvider>
    <CareRecipientProvider>
      <App />
    </ CareRecipientProvider>
    </CaregiverProvider>
  </StrictMode>,
)
