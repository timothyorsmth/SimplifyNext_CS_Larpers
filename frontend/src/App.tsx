// Use react-router because uhhh claude told me to
// Can remove if this causes problems :)
import { BrowserRouter, Routes, Route } from 'react-router-dom'

// Import pages
import Dashboard from './Pages/Dashboard/Dashboard'

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
