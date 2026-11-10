import type { NavItem } from "@/components/layout/NavItem/NavItem";
import { BookOpen, Layers, LayoutGrid, Package, Wallet } from "lucide-react";

export const NAV_ITEMS: NavItem[] = [
  { to: "/pokedex", label: "Pokédex", icon: LayoutGrid },
  { to: "/sets", label: "Sets", icon: Package },
  { to: "/cards", label: "Cards", icon: Layers },
  { to: "/binders", label: "Binders", icon: BookOpen },
  { to: "/spending", label: "Spending", icon: Wallet },
];
