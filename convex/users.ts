import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { normalizeDisplayName, normalizeUsername, randomAccentColor, requireAuthUser } from "./lib/auth";

export const current = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireAuthUser(ctx);
    return {
      id: user._id,
      username: user.username ?? user.email?.split("@")[0] ?? "player",
      displayName: user.displayName ?? user.name ?? user.username ?? "Player",
      accentColor: user.accentColor ?? randomAccentColor(),
    };
  },
});

export const upsertProfile = mutation({
  args: {
    username: v.string(),
    displayName: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireAuthUser(ctx);
    const username = normalizeUsername(args.username);
    const displayName = normalizeDisplayName(args.displayName);

    const existing = await ctx.db.query("users").withIndex("by_username", (q) => q.eq("username", username)).first();
    if (existing && existing._id !== user._id) {
      throw new ConvexError("Username is already taken.");
    }

    const now = Date.now();
    const accentColor = user.accentColor ?? randomAccentColor();
    await ctx.db.patch(user._id, {
      username,
      displayName,
      name: displayName,
      accentColor,
      updatedAt: now,
      createdAt: user.createdAt ?? now,
    });

    return {
      id: user._id,
      username,
      displayName,
      accentColor,
    };
  },
});
