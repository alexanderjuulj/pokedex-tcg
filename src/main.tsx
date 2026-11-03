import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import {
  MutationCache,
  QueryCache,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import { Toast } from "@base-ui/react/toast";
import { RouterProvider } from "react-router/dom";
import { isUnauthorized } from "@/lib/api";
import { SESSION_KEY } from "@/lib/auth";
import { toast, toastManager } from "@/lib/toast";
import { Toaster } from "@/components/ui";
import { router } from "@/router";
import "@fontsource-variable/figtree";
import "@/utils/scss/main.scss";

// A 401 anywhere means the session is gone: mark it, and ProtectedRoute
// sends the user to the login screen instead of showing an error.
const onUnauthorized = () => queryClient.setQueryData(SESSION_KEY, null);

const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error) => {
      if (isUnauthorized(error)) onUnauthorized();
    },
  }),
  // Mutations opt into toasts with `meta` (see @/lib/toast).
  mutationCache: new MutationCache({
    onSuccess: (_data, _variables, _context, mutation) => {
      const message = mutation.meta?.successMessage;
      if (message) toast.success(message);
    },
    onError: (error, _variables, _context, mutation) => {
      if (isUnauthorized(error)) {
        onUnauthorized();
        return;
      }
      const message = mutation.meta?.errorMessage;
      if (message) toast.error(message, error.message);
    },
  }),
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: (failures, error) => !isUnauthorized(error) && failures < 1,
    },
  },
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <Toast.Provider toastManager={toastManager}>
        <RouterProvider router={router} />
        <Toaster />
      </Toast.Provider>
    </QueryClientProvider>
  </StrictMode>,
);
