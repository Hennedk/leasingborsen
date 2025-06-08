import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { ThemeProvider } from './contexts/ThemeContext'
import Home from './pages/Home'
import './App.css'

function App() {
  return (
    <ThemeProvider>
      <Router>
        <div className="App">
          <Routes>
            <Route path="/" element={<Home />} />
            {/* Future routes can be added here */}
            <Route path="/listings" element={<div className="p-8 text-center">Listings page coming soon...</div>} />
            <Route path="/about" element={<div className="p-8 text-center">About page coming soon...</div>} />
          </Routes>
        </div>
      </Router>
    </ThemeProvider>
  )
}

export default App