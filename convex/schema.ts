import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    username: v.string(),
    displayName: v.string(),
    pinHash: v.string(),
    accentColor: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_username", ["username"]),

  sessions: defineTable({
    token: v.string(),
    userId: v.id("users"),
    createdAt: v.number(),
    lastSeenAt: v.number(),
  }).index("by_token", ["token"]),

  leagues: defineTable({
    name: v.string(),
    code: v.string(),
    ownerId: v.id("users"),
    startingBankroll: v.number(),
    createdAt: v.number(),
  }).index("by_code", ["code"]),

  leagueMembers: defineTable({
    leagueId: v.id("leagues"),
    userId: v.id("users"),
    cash: v.number(),
    joinedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_league", ["leagueId"])
    .index("by_league_user", ["leagueId", "userId"]),

  bets: defineTable({
    leagueId: v.id("leagues"),
    userId: v.id("users"),
    marketId: v.string(),
    marketSlug: v.optional(v.string()),
    marketQuestion: v.string(),
    outcome: v.string(),
    price: v.number(),
    stake: v.number(),
    shares: v.number(),
    createdAt: v.number(),
  })
    .index("by_league_created", ["leagueId", "createdAt"])
    .index("by_user_created", ["userId", "createdAt"]),

  positions: defineTable({
    leagueId: v.id("leagues"),
    userId: v.id("users"),
    marketId: v.string(),
    marketSlug: v.optional(v.string()),
    marketQuestion: v.string(),
    outcome: v.string(),
    shares: v.number(),
    totalCost: v.number(),
    averagePrice: v.number(),
    lastPrice: v.number(),
    updatedAt: v.number(),
  })
    .index("by_league", ["leagueId"])
    .index("by_user", ["userId"])
    .index("by_member_market_outcome", ["leagueId", "userId", "marketId", "outcome"]),
});
