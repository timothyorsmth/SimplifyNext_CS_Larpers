// Use react-router because uhhh claude told me to
// Can remove if this causes problems :)
import { BrowserRouter, Routes, Route } from 'react-router-dom'

// Import pages
import Dashboard from './Pages/Dashboard/Dashboard'

function App() {

  return (
    <BrowserRouter>
      <div>
        <div className="mainPanel">
          <Routes>
            <Route>
              <Route path="/" element={<Dashboard />} />
            </Route>
          </Routes>
        </div>

        {/* Navbar */}
        <div className="navPanel">
          <div className="PanelItem Home">
            <p>Home</p>
          </div>
          <div className="PanelItem Schedule">
            <p>Schedule</p>
          </div>
          <div className="PanelItem Chat">

          </div>
          <div className="PanelItem Tasks">
            <p>Tasks</p>
          </div>
          <div className="PanelItem RecipientInfo">
            <p>Recipient</p>
          </div>
        </div>
      </div>
    </BrowserRouter>
  )
}

export default App
