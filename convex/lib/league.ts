import { ConvexError } from "convex/values";

export async function requireLeagueMember(ctx: any, leagueId: string, userId: string) {
  const membership = await ctx.db
    .query("leagueMembers")
    .withIndex("by_league_user", (q: any) => q.eq("leagueId", leagueId).eq("userId", userId))
    .first();

  if (!membership) {
    throw new ConvexError("You are not a member of this league.");
  }

  return membership;
}

export function makeInviteCode(): string {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

export function currency(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function quantity(value: number): number {
  return Math.round((value + Number.EPSILON) * 1_000_000) / 1_000_000;
}
