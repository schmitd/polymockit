const siteUrl = (process.env.SITE_URL ?? "").trim().replace(/\/+$/, "");

if (!siteUrl) {
  throw new Error(
    "Missing SITE_URL. Set SITE_URL to your app origin (for example https://polymockit.davidschmitt.com).",
  );
}

export default {
  providers: [
    {
      type: "customJwt",
      issuer: "https://shoo.dev",
      jwks: "https://shoo.dev/.well-known/jwks.json",
      algorithm: "ES256",
      applicationID: `origin:${siteUrl}`,
    },
  ],
};
