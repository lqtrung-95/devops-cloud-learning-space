import "server-only";
import { z } from "zod";

const PLACEHOLDER_SECRET = "replace-with-a-long-random-string";
const isProduction = process.env.NODE_ENV === "production";

// Validates server environment once at startup so misconfiguration fails fast with a clear message.
const envSchema = z
  .object({
    DATABASE_URL: z.string().url(),
    BETTER_AUTH_SECRET: z
      .string()
      .min(32, "BETTER_AUTH_SECRET must be at least 32 characters (openssl rand -base64 32)")
      .refine((value) => value !== PLACEHOLDER_SECRET, "BETTER_AUTH_SECRET still has the .env.example placeholder"),
    BETTER_AUTH_URL: z.string().url().optional(),
    SMTP_HOST: z.string().default("localhost"),
    SMTP_PORT: z.coerce.number().int().default(1025),
    SMTP_USER: z.string().optional(),
    SMTP_PASSWORD: z.string().optional(),
    EMAIL_FROM: z.string().default("Learning Space <no-reply@learning-space.local>"),
    GITHUB_CLIENT_ID: z.string().optional(),
    GITHUB_CLIENT_SECRET: z.string().optional(),
  })
  .superRefine((value, context) => {
    // Magic links and origin checks use this URL — a localhost default in production silently breaks sign-in.
    if (isProduction && (!value.BETTER_AUTH_URL || new URL(value.BETTER_AUTH_URL).hostname === "localhost")) {
      context.addIssue({ code: "custom", path: ["BETTER_AUTH_URL"], message: "BETTER_AUTH_URL must be the public app URL in production" });
    }
  });

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  throw new Error(
    `Invalid environment variables:\n${z.prettifyError(parsed.error)}\nCopy .env.example to .env and fill in values.`,
  );
}

export const env = { ...parsed.data, BETTER_AUTH_URL: parsed.data.BETTER_AUTH_URL ?? "http://localhost:3000" };

export const isGithubAuthEnabled = Boolean(env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET);
