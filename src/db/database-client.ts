import "server-only";
import { neon } from "@neondatabase/serverless";
import { drizzle as drizzleNeonHttp } from "drizzle-orm/neon-http";
import { drizzle as drizzlePostgresJs } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "@/lib/env";
import * as schema from "./schema";

// `VERCEL` is set automatically on Vercel's build/runtime, never locally — a reliable
// signal that we're talking to hosted Neon Postgres, as opposed to the plain
// Postgres in docker-compose.yml for local development.
const isHostedDeployment = Boolean(process.env.VERCEL);

// On Vercel, each request can land on a different (often cold) serverless invocation, so a
// TCP+TLS client (postgres-js) pays a fresh connection handshake to Neon every time. Neon's
// HTTP driver instead sends each query as a single HTTPS request, which avoids that per-request
// handshake entirely — the fix for the multi-hundred-ms navigation latency this caused in prod.
// The app has no multi-statement `db.transaction()` calls, so the HTTP driver's lack of
// interactive-transaction support isn't a limitation here.
function createHostedDb() {
  return drizzleNeonHttp(neon(env.DATABASE_URL), { schema });
}

// Reuse one connection pool across hot reloads in local development.
const globalForDb = globalThis as unknown as { pgClient?: ReturnType<typeof postgres> };

function createLocalDb() {
  const pgClient = globalForDb.pgClient ?? postgres(env.DATABASE_URL, { max: 10 });
  globalForDb.pgClient = pgClient;
  return drizzlePostgresJs(pgClient, { schema });
}

export const db = isHostedDeployment ? createHostedDb() : createLocalDb();
