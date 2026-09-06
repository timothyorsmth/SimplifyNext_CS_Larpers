import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { CaregiverProvider } from './Context/CaregiverContext'
import { CareRecipientProvider } from './Context/CareRecipientContext.tsx'
import { ChatProvider } from './Context/ChatContext.tsx'
import { ArticlesProvider } from './Context/ArticlesContext.tsx'

import App from './App.tsx'
import "./index.css"
import { TaskProvider } from './Context/TaskContext.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <CaregiverProvider>
    <CareRecipientProvider>
    <TaskProvider>
    <ChatProvider>
    <ArticlesProvider>
      <App />
    </ArticlesProvider>
    </ChatProvider>
    </TaskProvider>
    </ CareRecipientProvider>
    </CaregiverProvider>
  </StrictMode>,
)