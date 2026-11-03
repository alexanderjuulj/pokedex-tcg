import type React from "react";
import { NavLink } from "react-router";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import styles from "./NavItem.module.scss";
import { Flex, Text } from "@/components/ui";

export type NavItem = {
  to: string;
  label: string;
  icon: LucideIcon;
};

const NavItem: React.FC<{ item: NavItem }> = ({ item }) => (
  <NavLink
    to={item.to}
    end={item.to === "/"}
    className={({ isActive }) =>
      cn(styles.nav_item, isActive && styles.nav_item__active)
    }
  >
    <Flex align="center" gap="3">
      <item.icon size={22} strokeWidth={1.75} aria-hidden />
      <Text>{item.label}</Text>
    </Flex>
  </NavLink>
);

export default NavItem;
