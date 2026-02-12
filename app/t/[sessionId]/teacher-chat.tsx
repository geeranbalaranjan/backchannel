"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

type MessageRow = {
  id: string;
  user_id: string;
  alias_snapshot: string;
  body: string;
  kind: string;
  t_offset_ms: number;
  created_at: string;
  pinned_at: string | null;
  course_id: string;
  vote_count?: number;
  reactions?: { reaction: string; count: number }[];
  user_has_voted?: boolean;
  user_reactions?: string[];
};

type Identity = { id: string; email: string | null; name: string | null };

export function TeacherChat({
  sessionId,
  courseId,
  courseName,
  startsAt,
}: {
  sessionId: string;
  courseId: string;
  courseName: string;
  startsAt: string;
}) {
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [pinnedOnly, setPinnedOnly] = useState(false);
  const [filter, setFilter] = useState<"all" | "questions">("all");
  const [identityCache, setIdentityCache] = useState<Record<string, Identity>>({});
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();
  const startsAtMs = new Date(startsAt).getTime();

  const formatTime = useCallback((tOffsetMs: number) => {
    const totalSec = Math.floor(tOffsetMs / 1000);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  }, []);

  const fetchIdentity = useCallback(async (userId: string): Promise<Identity> => {
    if (identityCache[userId]) return identityCache[userId];
    const res = await fetch(`/api/identity?userId=${encodeURIComponent(userId)}&courseId=${encodeURIComponent(courseId)}`);
    if (!res.ok) return { id: userId, email: null, name: null };
    const data = await res.json();
    const id: Identity = { id: userId, email: data.email ?? null, name: data.name ?? null };
    setIdentityCache((c) => ({ ...c, [userId]: id }));
    return id;
  }, [courseId, identityCache]);

  const loadMessages = useCallback(async () => {
    const { data: msgData } = await supabase
      .from("messages")
      .select("id, user_id, alias_snapshot, body, kind, t_offset_ms, created_at, pinned_at, course_id")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true });
    if (!msgData?.length) {
      setMessages([]);
      setLoading(false);
      return;
    }
    const ids = msgData.map((m) => m.id);
    const { data: votes } = await supabase
      .from("message_votes")
      .select("message_id, user_id")
      .in("message_id", ids);
    const { data: { user } } = await supabase.auth.getUser();
    const voteCounts: Record<string, number> = {};
    const userVoted: Record<string, boolean> = {};
    (votes ?? []).forEach((v: { message_id: string; user_id: string }) => {
      voteCounts[v.message_id] = (voteCounts[v.message_id] ?? 0) + 1;
      if (user && v.user_id === user.id) userVoted[v.message_id] = true;
    });
    const { data: reactions } = await supabase
      .from("message_reactions")
      .select("message_id, reaction, user_id")
      .in("message_id", ids);
    const reactionCounts: Record<string, Record<string, number>> = {};
    const userReactions: Record<string, string[]> = {};
    (reactions ?? []).forEach((r: { message_id: string; reaction: string; user_id: string }) => {
      if (!reactionCounts[r.message_id]) reactionCounts[r.message_id] = {};
      reactionCounts[r.message_id][r.reaction] = (reactionCounts[r.message_id][r.reaction] ?? 0) + 1;
      if (user && r.user_id === user.id) {
        if (!userReactions[r.message_id]) userReactions[r.message_id] = [];
        if (!userReactions[r.message_id].includes(r.reaction)) userReactions[r.message_id].push(r.reaction);
      }
    });
    const rows: MessageRow[] = msgData.map((m) => ({
      id: m.id,
      user_id: m.user_id,
      alias_snapshot: m.alias_snapshot,
      body: m.body,
      kind: m.kind,
      t_offset_ms: m.t_offset_ms,
      created_at: m.created_at,
      pinned_at: m.pinned_at,
      course_id: m.course_id,
      vote_count: voteCounts[m.id] ?? 0,
      user_has_voted: userVoted[m.id] ?? false,
      reactions: reactionCounts[m.id]
        ? Object.entries(reactionCounts[m.id]).map(([reaction, count]) => ({ reaction, count }))
        : [],
      user_reactions: userReactions[m.id] ?? [],
    }));
    setMessages(rows);
    setLoading(false);
  }, [sessionId, supabase]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  useEffect(() => {
    const channel = supabase
      .channel(`session:${sessionId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages", filter: `session_id=eq.${sessionId}` },
        () => loadMessages()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "message_votes", filter: `course_id=eq.${courseId}` },
        () => loadMessages()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "message_reactions", filter: `course_id=eq.${courseId}` },
        () => loadMessages()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId, courseId, supabase, loadMessages]);

  const pin = async (messageId: string, pinned: boolean) => {
    try {
      await fetch("/api/messages/pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId, pin: !pinned }),
      });
      await loadMessages();
    } catch {
      // ignore
    }
  };

  const hide = async (messageId: string) => {
    try {
      await fetch("/api/messages/hide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId }),
      });
      await loadMessages();
    } catch {
      // ignore
    }
  };

  const mute = async (userId: string) => {
    const min = window.prompt("Mute duration (minutes):", "60");
    if (min == null) return;
    const durationMinutes = parseInt(min, 10) || 60;
    try {
      await fetch("/api/users/mute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId, targetUserId: userId, durationMinutes }),
      });
      await loadMessages();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to mute");
    }
  };

  const filtered = messages.filter((m) => {
    if (pinnedOnly && !m.pinned_at) return false;
    if (filter === "questions" && m.kind !== "question") return false;
    return true;
  });

  const pinned = messages.filter((m) => m.pinned_at);

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="mx-auto max-w-4xl">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold">Teacher view — {courseName}</h1>
          <div className="flex gap-2">
            <Button
              variant={pinnedOnly ? "default" : "outline"}
              size="sm"
              onClick={() => setPinnedOnly(!pinnedOnly)}
            >
              Pinned
            </Button>
            <Button
              variant={filter === "questions" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter(filter === "questions" ? "all" : "questions")}
            >
              Questions
            </Button>
          </div>
        </div>
        {pinned.length > 0 && (
          <Card className="mb-4">
            <CardHeader className="py-3">
              <h2 className="text-sm font-medium">Pinned questions</h2>
            </CardHeader>
            <CardContent className="py-0">
              <ul className="space-y-2">
                {pinned.map((m) => (
                  <li key={m.id} className="rounded border p-2 text-sm">
                    <span className="font-medium">{m.alias_snapshot}</span>: {m.body}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
        <div ref={scrollRef} className="max-h-[70vh] overflow-y-auto rounded-md border bg-card p-4">
          {loading ? (
            <p className="text-muted-foreground">Loading…</p>
          ) : filtered.length === 0 ? (
            <p className="text-muted-foreground">No messages yet.</p>
          ) : (
            <ul className="space-y-3">
              {filtered.map((m) => (
                <li key={m.id} className="rounded border p-3">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="font-medium">{m.alias_snapshot}</span>
                    <span className="text-xs text-muted-foreground">{formatTime(m.t_offset_ms)}</span>
                  </div>
                  <p className="mt-1 text-sm">{m.body}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <IdentityTooltip userId={m.user_id} courseId={courseId} fetchIdentity={fetchIdentity} />
                    <Button
                      variant={m.pinned_at ? "default" : "outline"}
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => pin(m.id, !!m.pinned_at)}
                    >
                      {m.pinned_at ? "Unpin" : "Pin"}
                    </Button>
                    <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => hide(m.id)}>
                      Hide
                    </Button>
                    <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => mute(m.user_id)}>
                      Mute user
                    </Button>
                    <span className="text-xs text-muted-foreground">↑ {m.vote_count ?? 0}</span>
                    {(m.reactions ?? []).map(({ reaction, count }) => (
                      <span key={reaction} className="text-xs">
                        {reaction} {count}
                      </span>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function IdentityTooltip({
  userId,
  courseId,
  fetchIdentity,
}: {
  userId: string;
  courseId: string;
  fetchIdentity: (userId: string) => Promise<Identity>;
}) {
  const [open, setOpen] = useState(false);
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || identity) return;
    setLoading(true);
    fetchIdentity(userId).then((id) => {
      setIdentity(id);
      setLoading(false);
    });
  }, [open, userId, fetchIdentity, identity]);

  return (
    <div className="relative">
      <Button
        variant="outline"
        size="sm"
        className="h-7 text-xs"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
      >
        Reveal identity
      </Button>
      {open && (
        <div
          className="absolute left-0 top-full z-10 mt-1 min-w-[200px] rounded border bg-popover p-2 text-sm shadow-md"
          onMouseEnter={() => setOpen(true)}
          onMouseLeave={() => setOpen(false)}
        >
          {loading ? (
            <p className="text-muted-foreground">Loading…</p>
          ) : identity ? (
            <div>
              <p className="font-medium">{identity.name ?? "(no name)"}</p>
              <p className="text-muted-foreground">{identity.email ?? "(no email)"}</p>
            </div>
          ) : (
            <p className="text-muted-foreground">—</p>
          )}
        </div>
      )}
    </div>
  );
}
