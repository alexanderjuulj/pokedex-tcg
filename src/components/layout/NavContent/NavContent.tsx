import type React from "react";
import { Flex } from "@/components/ui";
import NavItem from "../NavItem/NavItem";
import { NAV_ITEMS } from "@/constants/nav";

/**
 * Shared navigation content rendered by both the desktop Sidebar and the
 * mobile offcanvas drawer.
 */
const NavContent: React.FC = () => (
  <Flex direction="column" gap="1" px="3">
    {NAV_ITEMS.map((item) => (
      <NavItem key={item.label} item={item} />
    ))}
  </Flex>
);

export default NavContent;
