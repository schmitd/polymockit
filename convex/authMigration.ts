import { internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { normalizeIdentityEmail } from "./lib/identity_linking";

export const inventory = internalQuery({
  args: {},
  returns: v.object({
    userCount: v.number(),
    identityCount: v.number(),
    unmappedUserIds: v.array(v.id("users")),
    usersWithoutEmail: v.array(v.id("users")),
    duplicateVerifiedEmailCandidates: v.array(v.object({ email: v.string(), userIds: v.array(v.string()) })),
  }),
  handler: async (ctx) => {
    const [users, identities] = await Promise.all([
      ctx.db.query("users").take(2001),
      ctx.db.query("authIdentities").take(2001),
    ]);
    if (users.length > 2000 || identities.length > 2000) {
      throw new Error("Migration inventory exceeds the safety limit. Use a paginated export for review before cutover.");
    }
    const mappedUserIds = new Set(identities.map((identity) => identity.userId));
    const usersByEmail = new Map<string, string[]>();

    for (const user of users) {
      const email = user.normalizedEmail ?? normalizeIdentityEmail(user.email);
      if (!email) {
        continue;
      }
      const ids = usersByEmail.get(email) ?? [];
      ids.push(user._id);
      usersByEmail.set(email, ids);
    }

    return {
      userCount: users.length,
      identityCount: identities.length,
      unmappedUserIds: users.filter((user) => !mappedUserIds.has(user._id)).map((user) => user._id),
      usersWithoutEmail: users.filter((user) => !normalizeIdentityEmail(user.email)).map((user) => user._id),
      duplicateVerifiedEmailCandidates: Array.from(usersByEmail.entries())
        .filter(([, userIds]) => userIds.length > 1)
        .map(([email, userIds]) => ({ email, userIds })),
    };
  },
});

export const backfillNormalizedEmails = internalMutation({
  args: { cursor: v.optional(v.union(v.string(), v.null())) },
  returns: v.object({ examined: v.number(), updated: v.number(), hasMore: v.boolean(), cursor: v.string() }),
  handler: async (ctx, args) => {
    const result = await ctx.db
      .query("users")
      .paginate({ numItems: 100, cursor: args.cursor ?? null });
    let updated = 0;

    for (const user of result.page) {
      const normalizedEmail = normalizeIdentityEmail(user.email);
      if (normalizedEmail && normalizedEmail !== user.normalizedEmail) {
        await ctx.db.patch(user._id, { normalizedEmail });
        updated += 1;
      }
    }

    return {
      examined: result.page.length,
      updated,
      hasMore: !result.isDone,
      cursor: result.continueCursor,
    };
  },
});
