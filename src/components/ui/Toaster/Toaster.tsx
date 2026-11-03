import type React from "react";
import { Toast } from "@base-ui/react/toast";
import { CircleAlert, CircleCheck, X } from "lucide-react";
import styles from "./Toaster.module.scss";
import Flex from "../Flex";

// Renders the toasts raised through `toast` in @/lib/toast. Mount once,
// inside <Toast.Provider toastManager={toastManager}>.
const Toaster: React.FC = () => {
  const { toasts } = Toast.useToastManager();

  return (
    <Toast.Portal>
      <Toast.Viewport className={styles.viewport}>
        {toasts.map((toast) => (
          <Toast.Root key={toast.id} toast={toast} className={styles.toast}>
            <Toast.Content className={styles.content}>
              <Flex gap="2" justify="between" width="100%">
                <Flex align="center" gap="2">
                  <span className={styles.icon} aria-hidden>
                    {toast.type === "error" ? (
                      <CircleAlert size={18} strokeWidth={1.5} />
                    ) : (
                      <CircleCheck size={18} strokeWidth={1.5} />
                    )}
                  </span>
                  <div className={styles.text}>
                    <Toast.Title className={styles.title} />
                    <Toast.Description className={styles.description} />
                  </div>
                </Flex>
                <Toast.Close className={styles.close} aria-label="Close">
                  <X size={16} strokeWidth={1.5} />
                </Toast.Close>
              </Flex>
            </Toast.Content>
          </Toast.Root>
        ))}
      </Toast.Viewport>
    </Toast.Portal>
  );
};

export default Toaster;
