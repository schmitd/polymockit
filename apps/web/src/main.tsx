import { Auth0Provider } from "@auth0/auth0-react";
import { ConvexProviderWithAuth0 } from "convex/react-auth0";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { RuntimeConfigErrorPanel } from "./components/AuthScreens";
import { AuthLifecycleHarness } from "./AuthLifecycleHarness";
import { RealAuthLifecycleProbe } from "./RealAuthLifecycleProbe";
import { convexClient, getAuth0Config, getRuntimeConfigError } from "./effect/runtime";
import "./styles.css";

const auth0Config = getAuth0Config();
const showAuthLifecycleHarness = import.meta.env.DEV && window.location.pathname === "/__auth-harness";
const showRealAuthProbe = import.meta.env.DEV && window.location.pathname === "/__real-auth-probe";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {showAuthLifecycleHarness ? (
      <AuthLifecycleHarness />
    ) : convexClient && auth0Config ? (
      <Auth0Provider
        domain={auth0Config.domain}
        clientId={auth0Config.clientId}
        authorizationParams={{
          redirect_uri: window.location.origin,
          connection: "google-oauth2",
          scope: "openid profile email",
        }}
        cacheLocation="localstorage"
        useRefreshTokens
        useRefreshTokensFallback
      >
        <ConvexProviderWithAuth0 client={convexClient}>
          {showRealAuthProbe ? <RealAuthLifecycleProbe /> : <App />}
        </ConvexProviderWithAuth0>
      </Auth0Provider>
    ) : (
      <RuntimeConfigErrorPanel runtimeConfigError={getRuntimeConfigError() ?? "Authentication is not configured."} />
    )}
  </StrictMode>,
);
