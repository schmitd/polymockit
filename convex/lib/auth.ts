import { ConvexError } from "convex/values";

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
  const subject = identity.subject;
  let user = await ctx.db.query("users").withIndex("by_subject", (q: any) => q.eq("subject", subject)).first();

  if (!user) {
    const displayName = pickDisplayName(identity);
    const username = await ensureUniqueUsername(ctx, pickUsernameSeed(identity));
    const userId = await ctx.db.insert("users", {
      subject,
      email: identity.email,
      name: identity.name ?? displayName,
      image: identity.pictureUrl,
      username,
      displayName,
      accentColor: randomAccentColor(),
      createdAt: now,
      updatedAt: now,
    });

    const created = await ctx.db.get(userId);
    if (!created) {
      throw new ConvexError("User account was not found.");
    }
    return created;
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
  if (identity.pictureUrl && user.image !== identity.pictureUrl) {
    patch.image = identity.pictureUrl;
  }

  if (Object.keys(patch).length > 0) {
    patch.updatedAt = now;
    await ctx.db.patch(user._id, patch);
    user = { ...user, ...patch };
  }

  return user;
}
