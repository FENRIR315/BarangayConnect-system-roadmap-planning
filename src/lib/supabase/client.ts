import { QueryChain } from "@/lib/local/builder";
import type { Query } from "@/lib/local/sql";

export interface LocalUser {
  id: string;
  email: string | null;
  user_metadata: Record<string, unknown>;
  app_metadata: Record<string, unknown>;
}

type AuthListener = (event: string, session: { user: LocalUser } | null) => void;
const listeners = new Set<AuthListener>();

function notify(event: string, user: LocalUser | null) {
  const session = user ? { user } : null;
  listeners.forEach((l) => l(event, session));
}

async function post<T = any>(url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    credentials: "same-origin",
  });
  return res.json();
}

function execLocal(q: Query) {
  return post<{ data: unknown; count: number | null; error: { message: string } | null }>(
    "/api/local/db",
    { query: q }
  );
}

function storageAdapter(bucket: string) {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return {
    upload: async (path: string, file: File, _opts?: { cacheControl?: string; upsert?: boolean }) => {
      const fd = new FormData();
      fd.append("bucket", bucket);
      fd.append("paths", JSON.stringify([path]));
      fd.append("files", file);
      const res = await fetch("/api/local/files", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) return { data: null, error: { message: json?.error?.message ?? "Upload failed" } };
      return { data: { path }, error: null };
    },
    getPublicUrl: (path: string) => ({
      data: { publicUrl: `${origin}/api/local/files/${bucket}/${path}` },
    }),
    getPublicUrls: (paths: string[]) => ({
      data: { publicUrls: paths.map((p) => `${origin}/api/local/files/${bucket}/${p}`) },
    }),
    remove: async (paths: string[]) => {
      const res = await fetch("/api/local/files", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bucket, paths }),
      });
      const out = await res.json();
      return { data: out?.data ?? {}, error: out?.error ?? null };
    },
  };
}

export type LocalSupabase = ReturnType<typeof createClient>;

export function createClient() {
  return {
    from: (table: string) => new QueryChain(table, execLocal),
    rpc: () => ({ data: null, error: { message: "rpc is not supported in offline mode" } }),
    auth: {
      async getSession() {
        const res = await post<{ session: { user: LocalUser } | null; error: unknown }>("/api/local/auth");
        return { data: { session: res.session }, error: res.error ?? null };
      },
      async getUser() {
        const res = await post<{ session: { user: LocalUser } | null; error: unknown }>("/api/local/auth");
        return { data: { user: res.session?.user ?? null }, error: res.error ?? null };
      },
      async signInWithPassword({ email, password }: { email: string; password: string }) {
        const res = await post<{
          data: { user: LocalUser | null; session: unknown };
          error: { message: string } | null;
        }>("/api/local/auth", { action: "login", email, password });
        if (res.data?.user) notify("SIGNED_IN", res.data.user);
        return res;
      },
      async signUp(input: { email: string; password: string; options?: { data?: Record<string, unknown> } }) {
        const res = await post<{
          data: { user: LocalUser | null };
          error: { message: string } | null;
        }>("/api/local/auth", {
          action: "register",
          email: input.email,
          password: input.password,
          options: input.options,
        });
        return res;
      },
      async signOut() {
        await post("/api/local/auth", { action: "logout" });
        notify("SIGNED_OUT", null);
        return { error: null };
      },
      async resetPasswordForEmail(email: string, _options?: { redirectTo?: string }) {
        return post<{ data: unknown; error: { message: string } | null }>("/api/local/auth", {
          action: "reset-password",
          email,
        });
      },
      onAuthStateChange(callback: AuthListener) {
        listeners.add(callback);
        return {
          data: {
            subscription: { unsubscribe: () => { listeners.delete(callback); } },
          },
        };
      },
    },
    storage: { from: (bucket: string) => storageAdapter(bucket) },
  };
}