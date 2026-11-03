import type React from "react";
import { Navigate, Outlet, useLocation } from "react-router";
import { Spinner } from "@/components/ui";
import { useAuth } from "@/lib/auth";

// Everything but /login sits behind this. The API enforces the login too;
// this only decides what to show.
const ProtectedRoute: React.FC = () => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <Spinner fullscreen />;
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  return <Outlet />;
};

export default ProtectedRoute;
