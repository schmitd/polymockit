import { createShooConvexAuth } from "@shoojs/react";

const configuredShooBaseUrl = import.meta.env.VITE_SHOO_BASE_URL?.trim() || "https://shoo.dev";

export const { useAuth, signIn, signOut } = createShooConvexAuth({
  callbackPath: "/auth/callback",
  shooBaseUrl: configuredShooBaseUrl,
});
