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
  ],
} satisfies AuthConfig;
