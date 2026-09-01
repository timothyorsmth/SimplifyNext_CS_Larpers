import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { CaregiverProvider } from './Context/CaregiverContext'
import { CareRecipientProvider } from './Context/CareRecipientContext.tsx'
import { ChatProvider } from './Context/ChatContext.tsx'

import App from './App.tsx'
import "./index.css"

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <CaregiverProvider>
    <CareRecipientProvider>
    <ChatProvider>
      <App />
    </ChatProvider>
    </ CareRecipientProvider>
    </CaregiverProvider>
  </StrictMode>,
)
