"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader } from "@/components/ui/card";

const QUICK_REACTIONS = ["???", "W", "L", "THIS"];

type MessageRow = {
  id: string;
  alias_snapshot: string;
  body: string;
  kind: string;
  t_offset_ms: number;
  created_at: string;
  pinned_at: string | null;
  vote_count?: number;
  reactions?: { reaction: string; count: number }[];
  user_has_voted?: boolean;
  user_reactions?: string[];
};

export function StudentChat({
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
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
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

  const loadMessages = useCallback(async () => {
    const { data: msgData } = await supabase
      .from("messages")
      .select("id, alias_snapshot, body, kind, t_offset_ms, created_at, pinned_at")
      .eq("session_id", sessionId)
      .eq("is_hidden", false)
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
      alias_snapshot: m.alias_snapshot,
      body: m.body,
      kind: m.kind,
      t_offset_ms: m.t_offset_ms,
      created_at: m.created_at,
      pinned_at: m.pinned_at,
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

  const sendMessage = async (kind: "chat" | "question" = "chat") => {
    const body = kind === "question" ? input.trim() : input.trim();
    if (!body) return;
    setSending(true);
    try {
      const res = await fetch("/api/messages/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, body, kind }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to send");
      setInput("");
      await loadMessages();
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to send");
    } finally {
      setSending(false);
    }
  };

  const vote = async (messageId: string, hasVoted: boolean) => {
    try {
      await fetch("/api/messages/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId, value: hasVoted ? 0 : 1 }),
      });
      await loadMessages();
    } catch {
      // optimistic; ignore
    }
  };

  const react = async (messageId: string, reaction: string, hasReacted: boolean) => {
    try {
      if (hasReacted) {
        await fetch(`/api/messages/reaction?messageId=${messageId}&reaction=${encodeURIComponent(reaction)}`, { method: "DELETE" });
      } else {
        await fetch("/api/messages/reaction", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messageId, reaction }),
        });
      }
      await loadMessages();
    } catch {
      // ignore
    }
  };

  const report = async (messageId: string) => {
    const reason = window.prompt("Reason (optional):");
    try {
      await fetch("/api/reports/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId, reason: reason ?? null }),
      });
      alert("Report submitted.");
    } catch (e) {
      alert("Failed to report.");
    }
  };

  const filtered = messages.filter((m) => {
    if (pinnedOnly && !m.pinned_at) return false;
    if (filter === "questions" && m.kind !== "question") return false;
    return true;
  });

  const pinned = messages.filter((m) => m.pinned_at);

  return (
    <div className="fixed right-0 top-0 flex h-screen w-full max-w-md flex-col border-l bg-card shadow-lg md:max-w-sm">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b py-4">
        <h2 className="font-semibold">{courseName}</h2>
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
      </CardHeader>
      {pinned.length > 0 && (
        <div className="border-b bg-muted/50 px-3 py-2">
          <p className="text-xs font-medium text-muted-foreground">Pinned</p>
          <ul className="mt-1 space-y-1 text-sm">
            {pinned.map((m) => (
              <li key={m.id} className="font-medium text-foreground">
                {m.alias_snapshot}: {m.body.slice(0, 60)}{m.body.length > 60 ? "…" : ""}
              </li>
            ))}
          </ul>
        </div>
      )}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3">
        {loading ? (
          <p className="text-muted-foreground">Loading…</p>
        ) : filtered.length === 0 ? (
          <p className="text-muted-foreground">No messages yet.</p>
        ) : (
          <ul className="space-y-3">
            {filtered.map((m) => (
              <li key={m.id} className="rounded-md border bg-background p-2">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-medium text-foreground">{m.alias_snapshot}</span>
                  <span className="text-xs text-muted-foreground">{formatTime(m.t_offset_ms)}</span>
                </div>
                <p className="mt-1 text-sm">{m.body}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Button
                    variant={m.user_has_voted ? "default" : "outline"}
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => vote(m.id, m.user_has_voted ?? false)}
                  >
                    ↑ {m.vote_count ?? 0}
                  </Button>
                  {(m.reactions ?? []).map(({ reaction, count }) => {
                    const hasReacted = (m.user_reactions ?? []).includes(reaction);
                    return (
                      <Button
                        key={reaction}
                        variant={hasReacted ? "default" : "outline"}
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => react(m.id, reaction, hasReacted)}
                      >
                        {reaction} {count}
                      </Button>
                    );
                  })}
                  <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => report(m.id)}>
                    Report
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="border-t p-3">
        <div className="mb-2 flex flex-wrap gap-1">
          {QUICK_REACTIONS.map((r) => (
            <Button
              key={r}
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={() => {
                setInput((prev) => (prev ? `${prev} ${r}` : r));
              }}
            >
              {r}
            </Button>
          ))}
        </div>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage("chat");
          }}
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Message…"
            disabled={sending}
            maxLength={2000}
          />
          <Button type="submit" disabled={sending}>
            Send
          </Button>
        </form>
        <Button
          variant="outline"
          size="sm"
          className="mt-2 w-full"
          onClick={() => {
            const q = window.prompt("Your question:");
            if (q?.trim()) {
              fetch("/api/messages/send", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ sessionId, body: q.trim(), kind: "question" }),
              }).then(() => loadMessages());
            }
          }}
        >
          Ask a question
        </Button>
      </div>
    </div>
  );
}
