import {
  FantasyLeagueClient,
  PolymarketClient,
  SessionStore,
  makeBrowserSessionStoreLayer,
  makeFantasyLeagueClientLayer,
  makePolymarketClientLayer,
} from "@polymockit/effect-services";
import { ConvexClient } from "convex/browser";
import type { FunctionReference } from "convex/server";
import { Effect, Layer, ManagedRuntime } from "effect";

const configuredConvexUrl = import.meta.env.VITE_CONVEX_URL?.trim() || import.meta.env.CONVEX_URL?.trim() || "";

const runtimeConfigError = configuredConvexUrl
  ? null
  : "Missing Convex URL. Set VITE_CONVEX_URL (or CONVEX_URL) in repo .env.local or apps/web/.env.";

const runtime = runtimeConfigError
  ? null
  : ManagedRuntime.make(
      Layer.mergeAll(
        makeFantasyLeagueClientLayer(configuredConvexUrl),
        makePolymarketClientLayer(configuredConvexUrl),
        makeBrowserSessionStoreLayer(window.localStorage),
      ),
    );
const liveClient = runtimeConfigError ? null : new ConvexClient(configuredConvexUrl);

export type AppServices = FantasyLeagueClient | PolymarketClient | SessionStore;

export const getRuntimeConfigError = () => runtimeConfigError;
export const getConfiguredConvexUrl = () => (configuredConvexUrl ? configuredConvexUrl : null);
const asQuery = (name: string) => name as unknown as FunctionReference<"query">;

export const runAppEffect = <A>(effect: Effect.Effect<A, unknown, AppServices>) => {
  if (!runtime || runtimeConfigError) {
    return Promise.reject(new Error(runtimeConfigError ?? "Runtime is not configured."));
  }
  return runtime.runPromise(effect);
};

export const subscribeLiveQuery = <T>(
  queryName: string,
  args: Record<string, unknown>,
  onValue: (value: T) => void,
  onError?: (error: Error) => void,
) => {
  if (!liveClient || runtimeConfigError) {
    throw new Error(runtimeConfigError ?? "Live runtime is not configured.");
  }
  return liveClient.onUpdate(asQuery(queryName), args, onValue as (value: unknown) => unknown, onError).unsubscribe;
};
