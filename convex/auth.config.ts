const configuredOrigin = (process.env.SITE_URL ?? process.env.CONVEX_SITE_URL ?? "").trim().replace(/\/+$/, "");

export default {
  providers: [
    {
      type: "customJwt",
      issuer: "https://shoo.dev",
      jwks: "https://api.shoo.dev/.well-known/jwks.json",
      algorithm: "ES256",
      ...(configuredOrigin ? { applicationID: `origin:${configuredOrigin}` } : {}),
    },
  ],
};
