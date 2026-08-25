// Use react-router because uhhh claude told me to
// Can remove if this causes problems :)
import { BrowserRouter, Routes, Route } from 'react-router-dom'

// Import pages
import Dashboard from './Pages/Dashboard/Dashboard'
import PatientProfile from './Pages/PatientProfile/PatientProfile'
import Chat from './Pages/Chat/Chat'
import Tasks from './Pages/Tasks/Tasks'
import Schedule from './Pages/Schedule/Schedule'

// Import components
import NavBar from './Components/NavBar/NavBar'


function App() {

  return (
    <BrowserRouter>
      <div>
        <div className="mainPanel">
          <Routes>
            <Route>
              <Route path="/" element={<Dashboard />} />
              <Route path="/schedule" element={<Schedule />} />
              <Route path="/chat" element={<Chat />} />
              <Route path="/tasks" element={<Tasks />} />
              <Route path="/recipient" element={<PatientProfile />} />
            </Route>
          </Routes>
        </div>

        {/* Navbar */}
        <NavBar />
      </div>
    </BrowserRouter>
  )
}

export default App
