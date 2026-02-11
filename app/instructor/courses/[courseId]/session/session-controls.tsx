"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type SessionState = {
  sessionId: string;
  joinUrl: string;
  qrPayload: string;
  startsAt: string;
  isLocked?: boolean;
} | null;

export function SessionControls({
  courseId,
  courseName,
}: {
  courseId: string;
  courseName: string;
}) {
  const router = useRouter();
  const [session, setSession] = useState<SessionState>(null);
  const [loading, setLoading] = useState(false);
  const [lockLoading, setLockLoading] = useState(false);
  const [slideIndex, setSlideIndex] = useState<string>("");
  const [slideLoading, setSlideLoading] = useState(false);

  async function startSession() {
    setLoading(true);
    try {
      const res = await fetch("/api/sessions/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to start session");
      setSession({
        sessionId: data.sessionId,
        joinUrl: data.joinUrl,
        qrPayload: data.qrPayload,
        startsAt: data.startsAt,
      });
      router.refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to start session");
    } finally {
      setLoading(false);
    }
  }

  async function lockSession() {
    if (!session) return;
    setLockLoading(true);
    try {
      const res = await fetch(`/api/sessions/${session.sessionId}/lock`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to lock");
      setSession((s) => (s ? { ...s, isLocked: true } : null));
      router.refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to lock");
    } finally {
      setLockLoading(false);
    }
  }

  async function setSlide() {
    if (!session) return;
    setSlideLoading(true);
    try {
      const num = slideIndex === "" ? null : parseInt(slideIndex, 10);
      if (num !== null && (isNaN(num) || num < 0)) {
        setSlideLoading(false);
        return;
      }
      const res = await fetch(`/api/sessions/${session.sessionId}/slide`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slideIndex: num }),
      });
      if (!res.ok) throw new Error("Failed to set slide");
      router.refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to set slide");
    } finally {
      setSlideLoading(false);
    }
  }

  if (!session) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Start a lecture session</CardTitle>
          <CardContent>
            <p className="mb-4 text-muted-foreground">
              Students will join via the QR code or link. You can lock the session later to stop new joins.
            </p>
            <Button onClick={startSession} disabled={loading}>
              {loading ? "Starting…" : "Start session"}
            </Button>
          </CardContent>
        </CardHeader>
      </Card>
    );
  }

  const teacherUrl = typeof window !== "undefined" ? `${window.location.origin}/t/${session.sessionId}` : "";
  const studentUrl = session.joinUrl;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Session live</CardTitle>
          <CardContent className="space-y-4">
            <div>
              <p className="mb-1 text-sm font-medium">Join URL (share or show QR)</p>
              <div className="flex gap-2">
                <Input readOnly value={studentUrl} className="font-mono text-sm" />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigator.clipboard.writeText(studentUrl)}
                >
                  Copy
                </Button>
              </div>
            </div>
            <div>
              <p className="mb-1 text-sm font-medium">QR code</p>
              <div className="inline-block rounded border bg-white p-2">
                <QRCodeSVG value={session.qrPayload} size={180} />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                onClick={() => window.open(teacherUrl, "_blank")}
              >
                Open teacher view
              </Button>
              {!session.isLocked && (
                <Button variant="destructive" onClick={lockSession} disabled={lockLoading}>
                  {lockLoading ? "Locking…" : "Lock session (no new joins)"}
                </Button>
              )}
              {session.isLocked && (
                <span className="flex items-center text-sm text-muted-foreground">Session is locked</span>
              )}
            </div>
          </CardContent>
        </CardHeader>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Current slide</CardTitle>
          <CardContent className="flex gap-2">
            <Input
              type="number"
              min={0}
              placeholder="Slide index"
              value={slideIndex}
              onChange={(e) => setSlideIndex(e.target.value)}
            />
            <Button onClick={setSlide} disabled={slideLoading}>
              {slideLoading ? "Setting…" : "Set"}
            </Button>
          </CardContent>
        </CardHeader>
      </Card>
    </div>
  );
}

function QRCodeSVG({ value, size }: { value: string; size: number }) {
  const [src, setSrc] = useState<string>("");
  useEffect(() => {
    const url = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(value)}`;
    setSrc(url);
  }, [value, size]);
  if (!src) return <div className="h-[180px] w-[180px] animate-pulse bg-muted" />;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="QR code" width={size} height={size} className="block" />
  );
}
