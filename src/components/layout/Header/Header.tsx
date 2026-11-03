import { FC, useEffect, useState } from "react";
import { useLocation } from "react-router";
import { Drawer } from "@base-ui/react/drawer";
import { Menu, X } from "lucide-react";
import { Box, Flex } from "@/components/ui";
import LogoutButton from "../LogoutButton/LogoutButton";
import NavContent from "../NavContent/NavContent";
import styles from "./Header.module.scss";
import Logo from "../Logo/Logo";

/**
 * Mobile header shown below the `sm` breakpoint (where the Sidebar is
 * hidden). Renders the logo and a menu trigger that opens the primary
 * navigation in an offcanvas drawer sliding in from the right.
 */
const Header: FC = () => {
  const [open, setOpen] = useState(false);
  const location = useLocation();

  // Close the drawer whenever the route changes (nav item or logo click).
  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  return (
    <header className={styles.header}>
      <Logo size="small" />

      <Drawer.Root open={open} onOpenChange={setOpen} swipeDirection="right">
        <Drawer.Trigger
          className={styles.icon_button}
          aria-label="Open navigation menu"
        >
          <Menu size={24} strokeWidth={1.75} />
        </Drawer.Trigger>

        <Drawer.Portal>
          <Drawer.Backdrop className={styles.backdrop} />
          <Drawer.Viewport className={styles.viewport}>
            <Drawer.Popup className={styles.popup} aria-label="Navigation">
              <Flex justify="end" pr="3" pt="3">
                <Drawer.Close
                  className={styles.icon_button}
                  aria-label="Close navigation menu"
                >
                  <X size={24} strokeWidth={1.75} />
                </Drawer.Close>
              </Flex>

              <Flex
                direction="column"
                justify="between"
                flexGrow="1"
                pt="2"
                pb="5"
              >
                <NavContent />
                <Box px="3">
                  <LogoutButton />
                </Box>
              </Flex>
            </Drawer.Popup>
          </Drawer.Viewport>
        </Drawer.Portal>
      </Drawer.Root>
    </header>
  );
};

export default Header;
