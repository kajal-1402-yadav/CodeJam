import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { lazy, Suspense } from "react";
import useAuthContext from "./hooks/useAuthContext";
import Sidebar from "./components/Sidebar";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Signup from "./pages/Signup";

// Lazy load heavy components for better performance
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Rooms = lazy(() => import("./pages/Rooms"));
const RoomEditor = lazy(() => import("./pages/RoomEditor"));
const Contributors = lazy(() => import("./pages/Contributors"));
const Templates = lazy(() => import("./pages/Templates"));
const Notifications = lazy(() => import("./pages/Notifications"));
const ManageAccount = lazy(() => import("./pages/ManageAccount"));

import ProtectedRoute from "./components/ProtectedRoute";

// Loading component for Suspense fallback
const PageLoader = () => (
  <div className="flex h-screen overflow-hidden bg-[#1E1E1E] text-gray-200">
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#A78BFA] mx-auto mb-4"></div>
        <div className="text-lg mb-2">Loading...</div>
      </div>
    </div>
  </div>
);

// Component to handle routing logic inside Router context
function AppContent() {
  const { user } = useAuthContext();
  const location = useLocation();

  // Don't show global sidebar on room pages
  const showGlobalSidebar = user && !location.pathname.startsWith('/room/');

  return (
    <div className="flex">
      {showGlobalSidebar && <Sidebar />}
      <div className="w-full">
        <Suspense fallback={null}>
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
        </Suspense>
      </div>
    </div>
  );
}

function App() {
  const { user } = useAuthContext();

  return (
    <div className="App">
      <Router>
        <AppContent />
      </Router>
    </div>
  );
}

export default App;
