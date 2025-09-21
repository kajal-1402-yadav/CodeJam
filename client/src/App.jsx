import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'

//pages and components
import  Home  from './pages/Home'
import  Navbar  from './components/Navbar'

function App() {

  return (
    <>
      <div className=''>
        <Navbar/>
        <Router>
          <Routes>
            <Route path ="/" element={<Home/>}/>
          </Routes>
        </Router>
      </div>
      
    </>
  )
}

export default App
