import { ConvexReactClient } from "convex/react";
import type { FunctionReference } from "convex/server";
import { Context, Effect, Layer } from "effect";
import type { AppUser, LeagueDetail, LeagueSummary } from "./types";

export interface FantasyLeagueClientApi {
  currentUser: () => Effect.Effect<AppUser, Error>;
  upsertProfile: (input: { username: string; displayName: string }) => Effect.Effect<AppUser, Error>;
  listLeagues: () => Effect.Effect<LeagueSummary[], Error>;
  createLeague: (input: { name: string; startingBankroll?: number }) => Effect.Effect<{ leagueId: string }, Error>;
  joinLeague: (input: { code: string }) => Effect.Effect<{ leagueId: string; alreadyJoined: boolean }, Error>;
  leagueDetail: (leagueId: string) => Effect.Effect<LeagueDetail, Error>;
  placeBet: (input: {
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

export const makeFantasyLeagueClientLayer = (client: ConvexReactClient) => {

  const api: FantasyLeagueClientApi = {
    currentUser: () =>
      Effect.tryPromise({
        try: async () => {
          return await client.mutation(asMutation("users:current"), {});
        },
        catch: normalizeError,
      }),

    upsertProfile: (input) =>
      Effect.tryPromise({
        try: async () => {
          return await client.mutation(asMutation("users:upsertProfile"), input);
        },
        catch: normalizeError,
      }),

    listLeagues: () =>
      Effect.tryPromise({
        try: async () => {
          return await client.query(asQuery("leagues:listForUser"), {});
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

    leagueDetail: (leagueId) =>
      Effect.tryPromise({
        try: async () => {
          return await client.query(asQuery("leagues:detail"), {
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
