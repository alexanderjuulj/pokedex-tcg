import type React from "react";
import { Navigate, Outlet } from "react-router";
import { Spinner } from "@/components/ui";
import { useGoal } from "@/features/pokedex/hooks";

// A collection without a Pokédex binder has no goal yet: the app opens on the
// setup (/setup) until it has one. An error lets the pages show it.
const SetupGate: React.FC = () => {
  const goal = useGoal();
  if (goal.isLoading) return <Spinner fullscreen />;
  if (!goal.error && !goal.isSetUp) return <Navigate to="/setup" replace />;
  return <Outlet />;
};

export default SetupGate;
