import type React from "react";
import { Navigate, useLocation } from "react-router";
import { Spinner } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { LoginUI } from "./components";

const LoginPage: React.FC = () => {
  const { user, loading } = useAuth();
  const location = useLocation();
  // Where ProtectedRoute sent the user from. Redirecting here (not in the
  // form) is what happens the moment a login sets the session.
  const from = (location.state as { from?: { pathname: string } } | null)?.from
    ?.pathname;

  if (loading) return <Spinner fullscreen />;
  if (user) return <Navigate to={from ?? "/"} replace />;
  return <LoginUI />;
};

export default LoginPage;
