import { createBrowserRouter, Navigate } from "react-router";
import AppLayout from "@/components/layout/AppLayout/AppLayout";
import ProtectedRoute from "@/components/layout/ProtectedRoute/ProtectedRoute";
import {
  BinderSinglePage,
  BindersOverviewPage,
  CardSinglePage,
  CardsOverviewPage,
  LoginPage,
  PokedexOverviewPage,
  PokemonSinglePage,
  PurchaseSinglePage,
  SetSinglePage,
  SetsOverviewPage,
  SetupGate,
  SetupPage,
  SpendingOverviewPage,
} from "@/features";

export const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },
  {
    element: <ProtectedRoute />,
    children: [
      // The first run, until the collection has a Pokédex binder.
      { path: "/setup", element: <SetupPage /> },
      {
        element: <SetupGate />,
        children: [
          {
            element: <AppLayout />,
            children: [
              { path: "/", element: <Navigate to="/pokedex" replace /> },
              { path: "/pokedex", element: <PokedexOverviewPage /> },
              { path: "/pokedex/:id", element: <PokemonSinglePage /> },
              { path: "/sets", element: <SetsOverviewPage /> },
              { path: "/sets/:id", element: <SetSinglePage /> },
              { path: "/cards", element: <CardsOverviewPage /> },
              { path: "/cards/:id", element: <CardSinglePage /> },
              { path: "/binders", element: <BindersOverviewPage /> },
              { path: "/binders/:id", element: <BinderSinglePage /> },
              { path: "/spending", element: <SpendingOverviewPage /> },
              { path: "/spending/:id", element: <PurchaseSinglePage /> },
            ],
          },
        ],
      },
    ],
  },
]);
