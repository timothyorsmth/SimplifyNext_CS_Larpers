// Use react-router because uhhh claude told me to
// Can remove if this causes problems :)
import { BrowserRouter, Routes, Route } from 'react-router-dom'

// Import pages
import Dashboard from './Pages/Dashboard/Dashboard'

function App() {

  return (
    <BrowserRouter>
      <Routes>
        <Route>
          <Route path="/" element={<Dashboard />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
