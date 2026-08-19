import { describe, it, expect } from "vitest";
import { derivePresentUsers, displayNameFromEmail, type PresenceUser } from "@/lib/presence";

function user(overrides: Partial<PresenceUser> = {}): PresenceUser {
  return { userId: "u1", email: "a@example.com", joinedAt: "2026-08-19T10:00:00.000Z", ...overrides };
}

describe("derivePresentUsers", () => {
  it("returns one entry per distinct user from a simple one-connection-each state", () => {
    const state = {
      ref1: [user({ userId: "u1" })],
      ref2: [user({ userId: "u2" })],
    };
    const result = derivePresentUsers(state, "self");
    expect(result.map((u) => u.userId).sort()).toEqual(["u1", "u2"]);
  });

  it("de-duplicates the same person present via two connections (two open tabs)", () => {
    const state = {
      ref1: [user({ userId: "u1", joinedAt: "2026-08-19T10:00:00.000Z" })],
      ref2: [user({ userId: "u1", joinedAt: "2026-08-19T10:05:00.000Z" })],
    };
    const result = derivePresentUsers(state, "self");
    expect(result).toHaveLength(1);
  });

  it("keeps the earlier joinedAt when the same person appears more than once", () => {
    const state = {
      ref1: [user({ userId: "u1", joinedAt: "2026-08-19T10:05:00.000Z" })],
      ref2: [user({ userId: "u1", joinedAt: "2026-08-19T10:00:00.000Z" })], // earlier, arrives second in iteration
    };
    const result = derivePresentUsers(state, "self");
    expect(result[0].joinedAt).toBe("2026-08-19T10:00:00.000Z");
  });

  it("never includes the current user themselves, even if present in the raw state", () => {
    const state = {
      ref1: [user({ userId: "self" })],
      ref2: [user({ userId: "u2" })],
    };
    const result = derivePresentUsers(state, "self");
    expect(result.map((u) => u.userId)).toEqual(["u2"]);
  });

  it("sorts by joinedAt ascending, oldest first", () => {
    const state = {
      ref1: [user({ userId: "u2", joinedAt: "2026-08-19T10:10:00.000Z" })],
      ref2: [user({ userId: "u1", joinedAt: "2026-08-19T10:00:00.000Z" })],
    };
    const result = derivePresentUsers(state, "self");
    expect(result.map((u) => u.userId)).toEqual(["u1", "u2"]);
  });

  it("handles an empty presence state", () => {
    expect(derivePresentUsers({}, "self")).toEqual([]);
  });

  it("handles a presence ref with an empty array (a connection with no tracked payload yet)", () => {
    const state = { ref1: [] };
    expect(derivePresentUsers(state, "self")).toEqual([]);
  });

  it("handles more than two connections for the same person without producing duplicates", () => {
    const state = {
      ref1: [user({ userId: "u1", joinedAt: "2026-08-19T10:00:00.000Z" })],
      ref2: [user({ userId: "u1", joinedAt: "2026-08-19T10:01:00.000Z" })],
      ref3: [user({ userId: "u1", joinedAt: "2026-08-19T10:02:00.000Z" })],
    };
    expect(derivePresentUsers(state, "self")).toHaveLength(1);
  });
});

describe("displayNameFromEmail", () => {
  it("returns the local part before the @", () => {
    expect(displayNameFromEmail("jordan@company.com")).toBe("jordan");
  });

  it("falls back to the full string for something with no @ at all", () => {
    expect(displayNameFromEmail("not-an-email")).toBe("not-an-email");
  });

  it("never includes the domain in the output", () => {
    expect(displayNameFromEmail("jordan@company.com")).not.toContain("company.com");
  });
});
