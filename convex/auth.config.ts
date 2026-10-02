import type { AuthConfig } from "convex/server";

const domain = (process.env.AUTH0_DOMAIN ?? "").trim();
const applicationID = (process.env.AUTH0_CLIENT_ID ?? "").trim();

if (!domain || !applicationID) {
  throw new Error("Missing Auth0 configuration. Set AUTH0_DOMAIN and AUTH0_CLIENT_ID on this Convex deployment.");
}

export default {
  providers: [
    {
      domain,
      applicationID,
    },
    // Temporary cutover compatibility, removed after the frontend is live.
    ...(process.env.AUTH_MIGRATION_ALLOW_SHOO === "true" ? [{
      type: "customJwt" as const,
      issuer: "https://shoo.dev",
      jwks: "https://shoo.dev/.well-known/jwks.json",
      algorithm: "ES256" as const,
      applicationID: `origin:${(process.env.SITE_URL ?? "").replace(/\/+$/, "")}`,
    }] : []),
  ],
} satisfies AuthConfig;
