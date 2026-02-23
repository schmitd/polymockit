import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    subject: v.string(),
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    email: v.optional(v.string()),
    emailVerificationTime: v.optional(v.number()),
    phone: v.optional(v.string()),
    phoneVerificationTime: v.optional(v.number()),
    isAnonymous: v.optional(v.boolean()),
    username: v.optional(v.string()),
    displayName: v.optional(v.string()),
    accentColor: v.optional(v.string()),
    createdAt: v.optional(v.number()),
    updatedAt: v.optional(v.number()),
  })
    .index("by_subject", ["subject"])
    .index("by_username", ["username"])
    .index("email", ["email"])
    .index("phone", ["phone"]),

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
    side: v.optional(v.union(v.literal("buy"), v.literal("sell"))),
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
