"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function OnboardingForm({
  sessionId,
  token,
  courseId,
}: {
  sessionId: string;
  token: string;
  courseId: string;
}) {
  const router = useRouter();
  const [alias, setAlias] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!alias.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/alias/set", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, token, alias: alias.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to set alias");
      router.push(`/s/${sessionId}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to set alias");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Choose your display name</CardTitle>
        <CardContent className="p-0 pt-2">
          <p className="mb-4 text-muted-foreground">
            This name is shown to others in the chat. It’s unique per course and can’t be changed after your first choice.
          </p>
          <form onSubmit={submit} className="space-y-4">
            <Input
              value={alias}
              onChange={(e) => setAlias(e.target.value)}
              placeholder="e.g. CuriousStudent"
              minLength={3}
              maxLength={20}
              disabled={loading}
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Setting…" : "Continue to chat"}
            </Button>
          </form>
        </CardContent>
      </CardHeader>
    </Card>
  );
}
