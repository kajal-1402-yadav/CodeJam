import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import useAuthContext from "./hooks/useAuthContext";
import Sidebar from "./components/Sidebar";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import ManageAccount from "./pages/ManageAccount";

function App() {
  const { user } = useAuthContext();

  return (
    <div className="App">
      <Router>
        <div className="flex">
          {user && <Sidebar />}
          <div className={`${user ? 'ml-64' : ''} w-full`}>
            <Routes>
              <Route path="/" element={!user ? <Home /> : <Navigate to="/dashboard" />} />
              <Route path="/login" element={!user ? <Login /> : <Navigate to="/dashboard" />} />
              <Route path="/signup" element={!user ? <Signup /> : <Navigate to="/dashboard" />} />
              <Route path="/dashboard" element={user ? <Dashboard /> : <Navigate to="/login" />} />
              <Route path="/account" element={user ? <ManageAccount /> : <Navigate to="/login" />} />
              <Route path="*" element={<Navigate to={user ? "/dashboard" : "/"} />} />
            </Routes>
          </div>
        </div>
      </Router>
    </div>
  );
}

export default App;
