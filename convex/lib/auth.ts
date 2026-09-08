import { ConvexError } from "convex/values";
import { normalizeIdentityEmail, requireSingleVerifiedEmailMatch } from "./identity_linking";

const USERNAME_REGEX = /^[a-z0-9_]{3,24}$/;

export function normalizeUsername(raw: string): string {
  const cleaned = raw.trim().toLowerCase().replace(/[^a-z0-9_]/g, "");
  if (!USERNAME_REGEX.test(cleaned)) {
    throw new ConvexError(
      "Username must be 3-24 chars and only contain lowercase letters, numbers, or underscores.",
    );
  }
  return cleaned;
}

export function normalizeDisplayName(raw: string): string {
  const trimmed = raw.trim().replace(/\s+/g, " ").slice(0, 32);
  if (!trimmed) {
    throw new ConvexError("Display name is required.");
  }
  return trimmed;
}

export function randomAccentColor(): string {
  const palette = ["#0A9396", "#EE9B00", "#BB3E03", "#005F73", "#CA6702", "#8A5CF6", "#2A9D8F"];
  return palette[Math.floor(Math.random() * palette.length)] ?? "#0A9396";
}

function pickDisplayName(identity: { name?: string | null; email?: string | null }): string {
  const fallback = identity.email?.split("@")[0] ?? "Player";
  return normalizeDisplayName(identity.name ?? fallback);
}

function pickUsernameSeed(identity: { nickname?: string | null; preferredUsername?: string | null; email?: string | null }) {
  const raw = identity.nickname ?? identity.preferredUsername ?? identity.email?.split("@")[0] ?? "player";
  const seed = raw.toLowerCase().replace(/[^a-z0-9_]/g, "");
  return (seed.length >= 3 ? seed : `player${seed}`).slice(0, 24);
}

async function ensureUniqueUsername(ctx: any, seed: string, excludeUserId?: string) {
  for (let index = 0; index < 100; index += 1) {
    const suffix = index === 0 ? "" : String(index + 1);
    const candidate = `${seed.slice(0, Math.max(24 - suffix.length, 3))}${suffix}`;
    const existing = await ctx.db.query("users").withIndex("by_username", (q: any) => q.eq("username", candidate)).first();
    if (!existing || existing._id === excludeUserId) {
      return candidate;
    }
  }

  return `${seed.slice(0, 18)}_${Math.floor(Math.random() * 100_000)}`;
}

export async function requireAuthUser(ctx: any) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new ConvexError("Please sign in to continue.");
  }

  const now = Date.now();
  const canWrite = typeof ctx.db.patch === "function" && typeof ctx.db.insert === "function";
  const tokenIdentifier = identity.tokenIdentifier;
  const normalizedEmail = normalizeIdentityEmail(identity.email);
  const existingIdentity = await ctx.db
    .query("authIdentities")
    .withIndex("by_token_identifier", (q: any) => q.eq("tokenIdentifier", tokenIdentifier))
    .unique();

  let user = existingIdentity ? await ctx.db.get(existingIdentity.userId) : null;
  if (existingIdentity && !user) {
    throw new ConvexError("Your identity link is invalid. Contact support before continuing.");
  }

  if (existingIdentity && canWrite) {
    await ctx.db.patch(existingIdentity._id, {
      email: identity.email,
      emailVerified: identity.emailVerified === true,
      lastSeenAt: now,
    });
  }

  if (!user) {
    if (!canWrite) {
      throw new ConvexError("Your account is still being prepared. Try again in a moment.");
    }

    const matchingUsers = normalizedEmail
      ? await ctx.db
          .query("users")
          .withIndex("by_normalized_email", (q: any) => q.eq("normalizedEmail", normalizedEmail))
          .collect()
      : [];

    if (normalizedEmail) {
      const legacyEmailMatches = await Promise.all([
        ctx.db.query("users").withIndex("email", (q: any) => q.eq("email", identity.email)).collect(),
        ctx.db.query("users").withIndex("email", (q: any) => q.eq("email", normalizedEmail)).collect(),
      ]);
      matchingUsers.push(...legacyEmailMatches.flat());
    }

    let matchedUserId;
    try {
      matchedUserId = requireSingleVerifiedEmailMatch({
        emailVerified: identity.emailVerified === true,
        matchingUserIds: matchingUsers.map((candidate: any) => candidate._id),
      });
    } catch (error) {
      throw new ConvexError(error instanceof Error ? error.message : "Account linking failed.");
    }

    if (matchedUserId) {
      const issuerConflict = await ctx.db
        .query("authIdentities")
        .withIndex("by_user_issuer", (q: any) => q.eq("userId", matchedUserId).eq("issuer", identity.issuer))
        .first();
      if (issuerConflict) {
        throw new ConvexError("This account is already linked to a different identity. Contact support.");
      }

      user = await ctx.db.get(matchedUserId);
      if (!user) {
        throw new ConvexError("The account selected for linking no longer exists.");
      }

      await ctx.db.insert("authIdentities", {
        tokenIdentifier,
        issuer: identity.issuer,
        subject: identity.subject,
        userId: user._id,
        email: identity.email,
        emailVerified: true,
        createdAt: now,
        lastSeenAt: now,
      });
      await ctx.db.insert("authLinkAudits", {
        userId: user._id,
        tokenIdentifier,
        issuer: identity.issuer,
        action: "linked_verified_email",
        createdAt: now,
      });
    } else {
      const displayName = pickDisplayName(identity);
      const username = await ensureUniqueUsername(ctx, pickUsernameSeed(identity));
      const userId = await ctx.db.insert("users", {
        subject: tokenIdentifier,
        email: identity.email,
        normalizedEmail: normalizedEmail ?? undefined,
        emailVerificationTime: identity.emailVerified === true ? now : undefined,
        name: identity.name ?? displayName,
        image: identity.pictureUrl,
        username,
        displayName,
        accentColor: randomAccentColor(),
        createdAt: now,
        updatedAt: now,
      });

      user = await ctx.db.get(userId);
      if (!user) {
        throw new ConvexError("User account was not found.");
      }
      await ctx.db.insert("authIdentities", {
        tokenIdentifier,
        issuer: identity.issuer,
        subject: identity.subject,
        userId,
        email: identity.email,
        emailVerified: identity.emailVerified === true,
        createdAt: now,
        lastSeenAt: now,
      });
      await ctx.db.insert("authLinkAudits", {
        userId,
        tokenIdentifier,
        issuer: identity.issuer,
        action: "created",
        createdAt: now,
      });
    }
  }

  const patch: Record<string, unknown> = {};
  if (!user.username) {
    patch.username = await ensureUniqueUsername(ctx, pickUsernameSeed(identity), user._id);
  }
  if (!user.displayName) {
    const displayName = pickDisplayName(identity);
    patch.displayName = displayName;
    patch.name = displayName;
  }
  if (!user.accentColor) {
    patch.accentColor = randomAccentColor();
  }
  if (!user.createdAt) {
    patch.createdAt = now;
  }
  if (identity.email && user.email !== identity.email) {
    patch.email = identity.email;
  }
  if (normalizedEmail && user.normalizedEmail !== normalizedEmail) {
    patch.normalizedEmail = normalizedEmail;
  }
  if (identity.emailVerified === true && !user.emailVerificationTime) {
    patch.emailVerificationTime = now;
  }
  if (identity.pictureUrl && user.image !== identity.pictureUrl) {
    patch.image = identity.pictureUrl;
  }

  if (Object.keys(patch).length > 0) {
    if (canWrite) {
      patch.updatedAt = now;
      await ctx.db.patch(user._id, patch);
    }
    user = { ...user, ...patch };
  }

  return user;
}
