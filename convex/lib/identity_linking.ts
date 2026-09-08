export function normalizeIdentityEmail(email: string | null | undefined): string | null {
  const normalized = email?.trim().toLowerCase() ?? "";
  return normalized || null;
}

export function uniqueIds<T>(ids: readonly T[]): T[] {
  return Array.from(new Set(ids));
}

export function requireSingleVerifiedEmailMatch<T>(input: {
  emailVerified: boolean;
  matchingUserIds: readonly T[];
}): T | null {
  if (!input.emailVerified) {
    return null;
  }

  const candidates = uniqueIds(input.matchingUserIds);
  if (candidates.length > 1) {
    throw new Error("Multiple existing accounts use this verified email. Contact support before signing in.");
  }

  return candidates[0] ?? null;
}
