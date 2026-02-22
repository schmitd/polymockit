import {
  FantasyLeagueClient,
  PolymarketClient,
  makeFantasyLeagueClientLayer,
  makePolymarketClientLayer,
} from "@polymockit/effect-services";
import { ConvexReactClient } from "convex/react";
import { Effect, Layer, ManagedRuntime } from "effect";

const configuredConvexUrl = import.meta.env.VITE_CONVEX_URL?.trim() || import.meta.env.CONVEX_URL?.trim() || "";

const runtimeConfigError = configuredConvexUrl
  ? null
  : "Missing Convex URL. Set VITE_CONVEX_URL (or CONVEX_URL) in repo .env.local or apps/web/.env.";
export const convexClient = runtimeConfigError ? null : new ConvexReactClient(configuredConvexUrl);
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

export const runAppEffect = <A>(effect: Effect.Effect<A, unknown, AppServices>) => {
  if (!runtime || runtimeConfigError) {
    return Promise.reject(new Error(runtimeConfigError ?? "Runtime is not configured."));
  }
  return runtime.runPromise(effect);
};
