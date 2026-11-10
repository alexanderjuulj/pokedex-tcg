import type React from "react";
import { Navigate, Outlet } from "react-router";
import { Spinner } from "@/components/ui";
import { useBinders } from "@/hooks/queries";

// A collection without a Pokédex binder has no goal yet: the app opens on the
// setup (/setup) until it has one. An error lets the pages show it.
const SetupGate: React.FC = () => {
  const binders = useBinders();
  const isSetUp = (binders.data ?? []).some((binder) => binder.kind === "pokedex");
  if (binders.isLoading) return <Spinner fullscreen />;
  if (!binders.error && !isSetUp) return <Navigate to="/setup" replace />;
  return <Outlet />;
};

export default SetupGate;
