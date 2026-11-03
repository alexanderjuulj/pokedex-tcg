import type React from "react";
import { LogOut } from "lucide-react";
import { Flex, Text } from "@/components/ui";
import { useLogout } from "@/lib/auth";
import styles from "../NavItem/NavItem.module.scss";

// On success the session is cleared and ProtectedRoute redirects to /login.
const LogoutButton: React.FC = () => {
  const logout = useLogout();

  return (
    <button
      type="button"
      className={styles.nav_item}
      onClick={() => logout.mutate()}
      disabled={logout.isPending}
    >
      <Flex align="center" gap="3">
        <LogOut size={22} strokeWidth={1.75} aria-hidden />
        <Text>Log out</Text>
      </Flex>
    </button>
  );
};

export default LogoutButton;
