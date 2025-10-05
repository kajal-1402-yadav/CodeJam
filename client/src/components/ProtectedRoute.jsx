import { Navigate } from "react-router-dom";
import useAuthContext from "../hooks/useAuthContext";

const ProtectedRoute = ({ children }) => {
  const { user, isLoading } = useAuthContext();

  // Show loading while auth is being determined
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#1E1E1E]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#A78BFA]"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default ProtectedRoute;
