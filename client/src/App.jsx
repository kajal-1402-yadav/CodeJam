import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import useAuthContext from "./hooks/useAuthContext";
import Sidebar from "./components/Sidebar";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import Rooms from "./pages/Rooms";
import RoomEditor from "./pages/RoomEditor";
import Contributors from "./pages/Contributors";
import Templates from "./pages/Templates";
import Notifications from "./pages/Notifications";
import ManageAccount from "./pages/ManageAccount";
import ProtectedRoute from "./components/ProtectedRoute";

function App() {
  const { user } = useAuthContext();

  return (
    <div className="App">
      <Router>
        <div className="flex">
          {user && <Sidebar />}
          <div className="w-full">
            <Routes>
              <Route path="/" element={!user ? <Home /> : <Navigate to="/dashboard" />} />
              <Route path="/login" element={!user ? <Login /> : <Navigate to="/dashboard" />} />
              <Route path="/signup" element={!user ? <Signup /> : <Navigate to="/dashboard" />} />
              <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/rooms" element={<ProtectedRoute><Rooms /></ProtectedRoute>} />
              <Route path="/room/:id" element={<ProtectedRoute><RoomEditor /></ProtectedRoute>} />
              <Route path="/contributors" element={<ProtectedRoute><Contributors /></ProtectedRoute>} />
              <Route path="/templates" element={<ProtectedRoute><Templates /></ProtectedRoute>} />
              <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
              <Route path="/account" element={<ProtectedRoute><ManageAccount /></ProtectedRoute>} />
              <Route path="*" element={<Navigate to={user ? "/dashboard" : "/"} />} />
            </Routes>
          </div>
        </div>
      </Router>
    </div>
  );
}

export default App;
