import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, isUnauthorized } from "@/lib/api";

// The session lives in an HttpOnly cookie the page can't read, so this asks
// the API. null = logged out. Any other request answering 401 sets it to
// null too (the QueryClient in main.tsx), and ProtectedRoute then sends the
// user to /login.
export const SESSION_KEY = ["session"];

export function useAuth() {
  const session = useQuery({
    queryKey: SESSION_KEY,
    queryFn: async () => {
      try {
        return await api.session();
      } catch (error) {
        if (isUnauthorized(error)) return null;
        throw error;
      }
    },
    staleTime: Infinity,
    retry: false,
  });
  return {
    user: session.data?.user ?? null,
    loading: session.isLoading,
    error: session.error,
  };
}

export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (credentials: { username: string; password: string }) =>
      api.login(credentials.username, credentials.password),
    onSuccess: (session) => queryClient.setQueryData(SESSION_KEY, session),
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.logout(),
    onSuccess: () => {
      // Not clear(): that would also drop the session query ProtectedRoute
      // is watching, and it would never see the logout.
      queryClient.setQueryData(SESSION_KEY, null);
      // Nothing stays cached on the device.
      queryClient.removeQueries({
        predicate: (query) => query.queryKey[0] !== SESSION_KEY[0],
      });
    },
    meta: { errorMessage: "Could not log out" },
  });
}
