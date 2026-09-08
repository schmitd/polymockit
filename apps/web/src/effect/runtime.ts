import {
  FantasyLeagueClient,
  PolymarketClient,
  makeFantasyLeagueClientLayer,
  makePolymarketClientLayer,
} from "@polymockit/effect-services";
import { ConvexReactClient } from "convex/react";
import { Effect, Layer, ManagedRuntime } from "effect";

const configuredConvexUrl = import.meta.env.VITE_CONVEX_URL?.trim() || import.meta.env.CONVEX_URL?.trim() || "";
const configuredAuth0Domain = import.meta.env.VITE_AUTH0_DOMAIN?.trim() || "";
const configuredAuth0ClientId = import.meta.env.VITE_AUTH0_CLIENT_ID?.trim() || "";

const missingConfig = [
  !configuredConvexUrl ? "VITE_CONVEX_URL" : null,
  !configuredAuth0Domain ? "VITE_AUTH0_DOMAIN" : null,
  !configuredAuth0ClientId ? "VITE_AUTH0_CLIENT_ID" : null,
].filter((key): key is string => key !== null);

const runtimeConfigError = missingConfig.length
  ? `Missing frontend configuration: ${missingConfig.join(", ")}. Set the values in repo .env.local or apps/web/.env.`
  : null;
export const convexClient = configuredConvexUrl ? new ConvexReactClient(configuredConvexUrl) : null;
const configuredClient = convexClient;

const runtime = runtimeConfigError
  ? null
  : ManagedRuntime.make(
      Layer.mergeAll(
        makeFantasyLeagueClientLayer(configuredClient!),
        makePolymarketClientLayer(configuredClient!),
      ),
    );

export type AppServices = FantasyLeagueClient | PolymarketClient;

export const getRuntimeConfigError = () => runtimeConfigError;
export const getConfiguredConvexUrl = () => (configuredConvexUrl ? configuredConvexUrl : null);
export const getAuth0Config = () =>
  configuredAuth0Domain && configuredAuth0ClientId
    ? { domain: configuredAuth0Domain, clientId: configuredAuth0ClientId }
    : null;

export const runAppEffect = <A>(effect: Effect.Effect<A, unknown, AppServices>) => {
  if (!runtime || runtimeConfigError) {
    return Promise.reject(new Error(runtimeConfigError ?? "Runtime is not configured."));
  }
  return runtime.runPromise(effect);
};
