import { v, ConvexError } from "convex/values";
import { mutation, query } from "./_generated/server";
import {
  createSessionToken,
  hashPin,
  normalizeDisplayName,
  normalizeUsername,
  optionalUserByToken,
  randomAccentColor,
} from "./lib/auth";

export const current = query({
  args: {
    token: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await optionalUserByToken(ctx, args.token);
    if (!identity) {
      return null;
    }

    return {
      id: identity.user._id,
      username: identity.user.username,
      displayName: identity.user.displayName,
      accentColor: identity.user.accentColor,
    };
  },
});

export const signIn = mutation({
  args: {
    username: v.string(),
    displayName: v.string(),
    pin: v.string(),
  },
  handler: async (ctx, args) => {
    const username = normalizeUsername(args.username);
    const displayName = normalizeDisplayName(args.displayName);
    const pinHash = hashPin(args.pin);

    const existing = await ctx.db.query("users").withIndex("by_username", (q) => q.eq("username", username)).first();

    let userId;
    let user;
    const now = Date.now();

    if (existing) {
      if (existing.pinHash !== pinHash) {
        throw new ConvexError("Incorrect PIN for this username.");
      }
      userId = existing._id;
      await ctx.db.patch(existing._id, {
        displayName,
        updatedAt: now,
      });
      user = { ...existing, displayName };
    } else {
      userId = await ctx.db.insert("users", {
        username,
        displayName,
        pinHash,
        accentColor: randomAccentColor(),
        createdAt: now,
        updatedAt: now,
      });
      user = await ctx.db.get(userId);
    }

    if (!user) {
      throw new ConvexError("Unable to create session.");
    }

    const token = createSessionToken();
    await ctx.db.insert("sessions", {
      token,
      userId,
      createdAt: now,
      lastSeenAt: now,
    });

    return {
      token,
      user: {
        id: userId,
        username: user.username,
        displayName: user.displayName,
        accentColor: user.accentColor,
      },
    };
  },
});

export const signOut = mutation({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.query("sessions").withIndex("by_token", (q) => q.eq("token", args.token)).first();
    if (!session) {
      return { ok: true };
    }

    await ctx.db.delete(session._id);
    return { ok: true };
  },
});
