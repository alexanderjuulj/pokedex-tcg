import { Toast } from "@base-ui/react/toast";

// Module-level manager so toasts can be raised from anywhere — hooks, the
// QueryClient's MutationCache, plain async helpers — not just components
// inside <Toast.Provider>. <Toaster> renders what this manager holds.
export const toastManager = Toast.createToastManager();

export type ToastType = "success" | "error";

export const toast = {
  success: (title: string, description?: string) =>
    toastManager.add({ title, description, type: "success" }),
  // Errors linger longer and are announced assertively.
  error: (title: string, description?: string) =>
    toastManager.add({
      title,
      description,
      type: "error",
      timeout: 8000,
      priority: "high",
    }),
};

// Mutations opt into toasts via `meta`; the MutationCache in main.tsx reads
// these. No meta → no toast (e.g. deletes, which useConfirmDelete toasts
// itself so it can add its hint).
declare module "@tanstack/react-query" {
  interface Register {
    mutationMeta: {
      successMessage?: string;
      errorMessage?: string;
    };
  }
}
