import React from "react";
import Logo from "../Logo/Logo";
import { Box, Flex } from "@/components/ui";
import LogoutButton from "../LogoutButton/LogoutButton";
import NavContent from "../NavContent/NavContent";
import styles from "./Sidebar.module.scss";

// Primary navigation from the `sm` breakpoint (tablet) up; below it the
// Header's drawer takes over.
const Sidebar: React.FC = () => {
  return (
    <Box
      className={styles.sidebar}
      position="fixed"
      inset="0 auto 0 0"
      width="260px"
      pt="5"
      pb="5"
      display={{ initial: "none", sm: "block" }}
    >
      <Flex direction="column" justify="between" minHeight="100%">
        <Flex direction="column" gap="6" width="100%">
          <Box px="5">
            <Logo />
          </Box>
          <NavContent />
        </Flex>
        <Box px="3">
          <LogoutButton />
        </Box>
      </Flex>
    </Box>
  );
};

export default Sidebar;
