import type { NavItem } from "@/components/layout/NavItem/NavItem";
import { BookOpen, Layers, LayoutGrid, Package, PackageSearch, Wallet } from "lucide-react";

export const NAV_ITEMS: NavItem[] = [
  { to: "/pokedex", label: "Pokédex", icon: LayoutGrid },
  { to: "/sets", label: "Sets", icon: Package },
  { to: "/packs", label: "Which pack?", icon: PackageSearch },
  { to: "/cards", label: "Cards", icon: Layers },
  { to: "/binders", label: "Binders", icon: BookOpen },
  { to: "/spending", label: "Spending", icon: Wallet },
];
