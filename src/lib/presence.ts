/** What each connected client tracks about itself in a project's presence
 * channel. Kept deliberately minimal — enough to render an avatar and a
 * name, nothing that needs its own privacy consideration. */
export interface PresenceUser {
  userId: string;
  email: string;
  joinedAt: string;
}

/** Supabase's own presence sync event hands back state shaped as
 * Record<presenceRef, T[]> — one array per realtime connection, not per
 * person, since the same person can have two tabs open (two connections,
 * two presence refs) or briefly show up more than once during a
 * reconnect. This turns that raw shape into what the UI actually wants:
 * one entry per distinct person, oldest-joined first, with `self` never
 * included (nobody needs to see their own avatar in a "who else is here"
 * list). Pure and synchronous specifically so this logic — the part most
 * likely to have a de-duplication bug — is testable without a live
 * WebSocket connection, which this sandbox has no way to establish or
 * verify against a real Supabase project anyway. */
export function derivePresentUsers(
  state: Record<string, PresenceUser[]>,
  selfUserId: string
): PresenceUser[] {
  const byUserId = new Map<string, PresenceUser>();

  for (const entries of Object.values(state)) {
    for (const entry of entries) {
      if (entry.userId === selfUserId) continue;
      const existing = byUserId.get(entry.userId);
      // If the same person shows up more than once (two tabs, a
      // reconnect), keep whichever entry has the earlier joinedAt — the
      // one that best answers "how long has this person actually been
      // here," not whichever happened to be iterated last.
      if (!existing || entry.joinedAt < existing.joinedAt) {
        byUserId.set(entry.userId, entry);
      }
    }
  }

  return [...byUserId.values()].sort((a, b) => (a.joinedAt < b.joinedAt ? -1 : a.joinedAt > b.joinedAt ? 1 : 0));
}

/** A short, stable, non-identifying display label from an email address —
 * "jordan@company.com" becomes "jordan", never the full address, since
 * this renders in a small avatar tooltip other project collaborators see,
 * not a private context. */
export function displayNameFromEmail(email: string): string {
  const [local] = email.split("@");
  return local && local.length > 0 ? local : email;
}
