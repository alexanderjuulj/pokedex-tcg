import type {
  TableName,
  Tables,
  TablesInsert,
  TablesUpdate,
  ViewName,
} from "@/lib/database.types";

// Typed client for the API in server/. Throws an ApiError carrying the
// server's message (e.g. "UNIQUE constraint failed: items.name"), which the
// mutation toasts show as their description.

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

// The session is gone (expired, logged out elsewhere, login changed).
export const isUnauthorized = (error: unknown) =>
  error instanceof ApiError && error.status === 401;

type Column<T extends TableName | ViewName> = keyof Tables<T> & string;

export type ListOptions<T extends TableName | ViewName> = {
  // Sort columns in priority order; prefix with "-" for descending.
  order?: (Column<T> | `-${Column<T>}`)[];
  // Equality filters, ANDed together.
  where?: Partial<Record<Column<T>, string | number | boolean>>;
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api/${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;
    throw new ApiError(
      response.status,
      body?.error ?? `${response.status} ${response.statusText}`,
    );
  }
  return (response.status === 204 ? undefined : await response.json()) as T;
}

export const api = {
  list<T extends TableName | ViewName>(name: T, options: ListOptions<T> = {}) {
    const params = new URLSearchParams();
    if (options.order?.length) params.set("order", options.order.join(","));
    for (const [column, value] of Object.entries(options.where ?? {})) {
      params.set(column, String(value));
    }
    const query = params.size ? `?${params}` : "";
    return request<Tables<T>[]>(`${name}${query}`);
  },

  get<T extends TableName | ViewName>(name: T, id: number) {
    return request<Tables<T>>(`${name}/${id}`);
  },

  create<T extends TableName>(table: T, values: TablesInsert<T>) {
    return request<Tables<T>>(table, {
      method: "POST",
      body: JSON.stringify(values),
    });
  },

  update<T extends TableName>(table: T, id: number, values: TablesUpdate<T>) {
    return request<Tables<T>>(`${table}/${id}`, {
      method: "PATCH",
      body: JSON.stringify(values),
    });
  },

  remove(table: TableName, id: number) {
    return request<void>(`${table}/${id}`, { method: "DELETE" });
  },

  session() {
    return request<{ user: string }>("auth/session");
  },

  login(username: string, password: string) {
    return request<{ user: string }>("auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });
  },

  logout() {
    return request<void>("auth/logout", { method: "POST" });
  },

  // Dedicated multi-row writes in server/rpc.ts.
  rpc<T>(name: string, args: Record<string, unknown>) {
    return request<T>(`rpc/${name}`, {
      method: "POST",
      body: JSON.stringify(args),
    });
  },
};
