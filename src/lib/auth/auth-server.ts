import "server-only";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { magicLink } from "better-auth/plugins";
import { headers } from "next/headers";
import { cache } from "react";
import { db } from "@/db/database-client";
import * as schema from "@/db/auth-schema";
import { env, isGithubAuthEnabled } from "@/lib/env";
import { sendMagicLinkEmail } from "./send-magic-link-email";

export const auth = betterAuth({
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, { provider: "pg", schema }),
  socialProviders: isGithubAuthEnabled
    ? { github: { clientId: env.GITHUB_CLIENT_ID!, clientSecret: env.GITHUB_CLIENT_SECRET! } }
    : {},
  rateLimit: {
    // Each request emails someone — keep it tight to prevent inbox flooding.
    customRules: { "/sign-in/magic-link": { window: 60, max: 3 } },
  },
  plugins: [
    magicLink({
      expiresIn: 60 * 10,
      // Tokens are sign-in credentials; a leaked DB row must not be usable.
      storeToken: "hashed",
      sendMagicLink: async ({ email, url }) => {
        await sendMagicLinkEmail({ email, url });
      },
    }),
    // Must be last: lets server actions set auth cookies.
    nextCookies(),
  ],
});

export type AuthSession = typeof auth.$Infer.Session;

/**
 * Current session for server components/actions, or null when signed out.
 * Wrapped in React `cache` so the header and page share one lookup per request.
 */
export const getCurrentSession = cache(async () => auth.api.getSession({ headers: await headers() }));
