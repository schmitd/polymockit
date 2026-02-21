import { ConvexHttpClient } from "convex/browser";
import type { FunctionReference } from "convex/server";
import { Context, Effect, Layer } from "effect";
import type { AppUser, AuthSession, LeagueDetail, LeagueSummary } from "./types";

export interface FantasyLeagueClientApi {
  currentUser: (token?: string) => Effect.Effect<AppUser | null, Error>;
  signIn: (input: { username: string; displayName: string; pin: string }) => Effect.Effect<AuthSession, Error>;
  signOut: (token: string) => Effect.Effect<void, Error>;
  listLeagues: (token: string) => Effect.Effect<LeagueSummary[], Error>;
  createLeague: (input: { token: string; name: string; startingBankroll?: number }) => Effect.Effect<{ leagueId: string }, Error>;
  joinLeague: (input: { token: string; code: string }) => Effect.Effect<{ leagueId: string; alreadyJoined: boolean }, Error>;
  leagueDetail: (token: string, leagueId: string) => Effect.Effect<LeagueDetail, Error>;
  placeBet: (input: {
    token: string;
    leagueId: string;
    marketId: string;
    marketSlug?: string;
    marketQuestion: string;
    outcome: string;
    price: number;
    stake: number;
  }) => Effect.Effect<{ ok: true; shares: number; remainingCash: number }, Error>;
}

export class FantasyLeagueClient extends Context.Tag("FantasyLeagueClient")<FantasyLeagueClient, FantasyLeagueClientApi>() {}

const asQuery = (name: string) => name as unknown as FunctionReference<"query">;
const asMutation = (name: string) => name as unknown as FunctionReference<"mutation">;

const normalizeError = (error: unknown): Error => {
  if (error instanceof Error) {
    return error;
  }
  return new Error("Unexpected request error.");
};

export const makeFantasyLeagueClientLayer = (convexUrl: string) => {
  const client = new ConvexHttpClient(convexUrl);

  const api: FantasyLeagueClientApi = {
    currentUser: (token?: string) =>
      Effect.tryPromise({
        try: async () => {
          return await client.query(asQuery("users:current"), { token });
        },
        catch: normalizeError,
      }),

    signIn: (input) =>
      Effect.tryPromise({
        try: async () => {
          return await client.mutation(asMutation("users:signIn"), input);
        },
        catch: normalizeError,
      }),

    signOut: (token) =>
      Effect.tryPromise({
        try: async () => {
          await client.mutation(asMutation("users:signOut"), { token });
        },
        catch: normalizeError,
      }),

    listLeagues: (token) =>
      Effect.tryPromise({
        try: async () => {
          return await client.query(asQuery("leagues:listForUser"), { token });
        },
        catch: normalizeError,
      }),

    createLeague: (input) =>
      Effect.tryPromise({
        try: async () => {
          return await client.mutation(asMutation("leagues:createLeague"), input);
        },
        catch: normalizeError,
      }),

    joinLeague: (input) =>
      Effect.tryPromise({
        try: async () => {
          return await client.mutation(asMutation("leagues:joinLeague"), input);
        },
        catch: normalizeError,
      }),

    leagueDetail: (token, leagueId) =>
      Effect.tryPromise({
        try: async () => {
          return await client.query(asQuery("leagues:detail"), {
            token,
            leagueId,
          });
        },
        catch: normalizeError,
      }),

    placeBet: (input) =>
      Effect.tryPromise({
        try: async () => {
          return await client.mutation(asMutation("leagues:placeBet"), input);
        },
        catch: normalizeError,
      }),
  };

  return Layer.succeed(FantasyLeagueClient, api);
};
