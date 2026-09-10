import { runQuery } from "@/lib/local/sql";
import { QueryChain } from "@/lib/local/builder";

/**
 * Privileged client for server-side work (print/export routes, audits,
 * notifications). Executes directly against local PostgreSQL — no service
 * role key required in offline mode.
 */
export function createAdminClient() {
  return {
    from: (table: string) => new QueryChain(table, runQuery),
  };
}