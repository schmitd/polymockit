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

export function hashPin(pin: string): string {
  const normalized = pin.trim();
  if (normalized.length < 4 || normalized.length > 16) {
    throw new ConvexError("PIN must be 4-16 characters.");
  }

  // Deterministic hash used only for lightweight fantasy auth.
  let hash = 2166136261;
  for (let i = 0; i < normalized.length; i += 1) {
    hash ^= normalized.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return (hash >>> 0).toString(16);
}

export function createSessionToken(): string {
  return `${Math.random().toString(36).slice(2)}${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;
}

export function randomAccentColor(): string {
  const palette = ["#0A9396", "#EE9B00", "#BB3E03", "#005F73", "#CA6702", "#8A5CF6", "#2A9D8F"];
  return palette[Math.floor(Math.random() * palette.length)] ?? "#0A9396";
}

export async function requireUserByToken(ctx: any, token: string) {
  const session = await ctx.db.query("sessions").withIndex("by_token", (q: any) => q.eq("token", token)).first();
  if (!session) {
    throw new ConvexError("Session expired. Please sign in again.");
  }

  const user = await ctx.db.get(session.userId);
  if (!user) {
    throw new ConvexError("User account was not found.");
  }

  return { user, session };
}

export async function optionalUserByToken(ctx: any, token: string | undefined) {
  if (!token) {
    return null;
  }

  const session = await ctx.db.query("sessions").withIndex("by_token", (q: any) => q.eq("token", token)).first();
  if (!session) {
    return null;
  }

  const user = await ctx.db.get(session.userId);
  if (!user) {
    return null;
  }

  return { user, session };
}
