"use client";

import { useEffect, useState } from "react";
import { Users } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { derivePresentUsers, displayNameFromEmail, type PresenceUser } from "@/lib/presence";

const AVATAR_COLORS = ["#5B6CFF", "#00D4B8", "#8B5CF6", "#FB7185", "#F59E0B"];

function colorFor(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) hash = (hash * 31 + userId.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

/** Shows who else currently has this project's generator open — real
 * presence via Supabase Realtime's presence channels, not a build-it-
 * yourself WebSocket layer. This is deliberately scoped to presence only:
 * "who's here," not "what are they doing" — no live cursors, no
 * conflict-free simultaneous editing, no operational-transform/CRDT
 * conflict resolution. That remains the genuinely large, unbuilt part of
 * "real-time collaboration." Presence is a real, bounded, honestly
 * separate piece that Supabase's own infrastructure already provides —
 * this component just wires it up correctly, it doesn't build a realtime
 * transport from scratch.
 *
 * HONEST CAVEAT: the derivation logic (presence.ts) is fully unit tested,
 * but the actual live WebSocket channel behavior — subscribe, track,
 * sync/join/leave events firing correctly across two real browser tabs —
 * has not been exercised against a live Supabase project in this
 * environment, the same category of limitation as github.ts and
 * image-gen.ts. Written correctly against Supabase's documented Presence
 * API, not run against the real thing. */
export function PresenceIndicator({ projectId }: { projectId: string | null }) {
  const [others, setOthers] = useState<PresenceUser[]>([]);

  useEffect(() => {
    if (!projectId) return;

    const supabase = createClient();
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let cancelled = false;

    supabase.auth.getUser().then(({ data }) => {
      const user = data.user;
      if (!user || cancelled) return;

      channel = supabase.channel(`presence:project:${projectId}`, {
        config: { presence: { key: user.id } },
      });

      channel
        .on("presence", { event: "sync" }, () => {
          const state = channel!.presenceState<PresenceUser>();
          setOthers(derivePresentUsers(state, user.id));
        })
        .subscribe(async (status) => {
          if (status === "SUBSCRIBED") {
            await channel!.track({
              userId: user.id,
              email: user.email ?? "unknown",
              joinedAt: new Date().toISOString(),
            } satisfies PresenceUser);
          }
        });
    });

    return () => {
      cancelled = true;
      if (channel) {
        channel.untrack();
        supabase.removeChannel(channel);
      }
    };
  }, [projectId]);

  if (others.length === 0) return null;

  return (
    <div className="flex items-center gap-1.5" title={others.map((o) => displayNameFromEmail(o.email)).join(", ")}>
      <Users size={13} className="text-ink/35" />
      <div className="flex -space-x-1.5">
        {others.slice(0, 4).map((o) => (
          <div
            key={o.userId}
            className="flex h-5 w-5 items-center justify-center rounded-full border border-paper text-[9px] font-medium text-white"
            style={{ backgroundColor: colorFor(o.userId) }}
          >
            {displayNameFromEmail(o.email).charAt(0).toUpperCase()}
          </div>
        ))}
      </div>
      {others.length > 4 && <span className="font-mono text-[10px] text-ink/35">+{others.length - 4}</span>}
    </div>
  );
}
