import { describe, expect, it } from "bun:test";
import { normalizeIdentityEmail, requireSingleVerifiedEmailMatch } from "./identity_linking";

describe("identity linking", () => {
  it("normalizes email without accepting an empty value", () => {
    expect(normalizeIdentityEmail(" Player@Example.COM ")).toBe("player@example.com");
    expect(normalizeIdentityEmail("  ")).toBeNull();
    expect(normalizeIdentityEmail(undefined)).toBeNull();
  });

  it("links only one verified-email candidate", () => {
    expect(
      requireSingleVerifiedEmailMatch({
        emailVerified: true,
        matchingUserIds: ["user-1"],
      }),
    ).toBe("user-1");
  });

  it("does not link an unverified email", () => {
    expect(
      requireSingleVerifiedEmailMatch({
        emailVerified: false,
        matchingUserIds: ["user-1"],
      }),
    ).toBeNull();
  });

  it("fails closed when a verified email is ambiguous", () => {
    expect(() =>
      requireSingleVerifiedEmailMatch({
        emailVerified: true,
        matchingUserIds: ["user-1", "user-2"],
      }),
    ).toThrow("Multiple existing accounts");
  });
});
