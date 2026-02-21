import { ConvexProviderWithAuth } from "convex/react";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { convexClient } from "./effect/runtime";
import { useAuth } from "./shoo";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {convexClient ? (
      <ConvexProviderWithAuth client={convexClient} useAuth={useAuth}>
        <App />
      </ConvexProviderWithAuth>
    ) : (
      <App />
    )}
  </StrictMode>,
);
