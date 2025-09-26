import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'

//pages and components
import  Home  from './pages/Home'
import Signup  from './pages/Signup'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'

function App() {

  return (
    <>
      <div className=''>
        <Router>
          <Routes>
            <Route path ="/" element={<Home/>}/>
            <Route path ="/signup" element={<Signup/>}/>
            <Route path ="/login" element={<Login/>}/>
            <Route path ="/dashboard" element={<Dashboard/>}/>
          </Routes>
        </Router>
      </div>
      
    </>
  )
}

export default App
