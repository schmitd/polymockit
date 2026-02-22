import { createShooConvexAuth } from "@shoojs/react";
import type { StartSignInOptions } from "@shoojs/react";

const configuredShooBaseUrl = import.meta.env.VITE_SHOO_BASE_URL?.trim() || "https://shoo.dev";

const shooAuth = createShooConvexAuth({
  callbackPath: "/auth/callback",
  shooBaseUrl: configuredShooBaseUrl,
  requestPii: true,
});

export const { useAuth, signOut } = shooAuth;

export const signIn = async (opts?: StartSignInOptions) =>
  shooAuth.signIn({
    ...opts,
    requestPii: true,
  });
