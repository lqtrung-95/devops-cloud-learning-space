import "server-only";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "@/lib/env";
import * as schema from "./schema";

// `VERCEL` is set automatically on Vercel's build/runtime, never locally — a reliable
// signal that we're talking to a hosted Postgres (Neon/Supabase/etc.) that requires SSL,
// as opposed to the plain, no-SSL Postgres in docker-compose.yml for local development.
const isHostedDeployment = Boolean(process.env.VERCEL);

// Reuse one connection pool across hot reloads in local development.
const globalForDb = globalThis as unknown as { pgClient?: ReturnType<typeof postgres> };

const pgClient =
  globalForDb.pgClient ??
  postgres(env.DATABASE_URL, {
    // Each serverless invocation gets its own small pool; a large `max` here would
    // multiply across concurrent invocations and exhaust the database's connection limit.
    // Use a pooled ("-pooler") connection string in production so this stays effective.
    max: isHostedDeployment ? 1 : 10,
    ssl: isHostedDeployment ? "require" : undefined,
  });
if (!isHostedDeployment) globalForDb.pgClient = pgClient;

export const db = drizzle(pgClient, { schema });
