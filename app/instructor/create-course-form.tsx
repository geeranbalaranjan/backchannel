"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export function CreateCourseForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create course");
      setName("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create course");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create course</CardTitle>
        <CardContent className="p-0 pt-2">
          <form onSubmit={submit} className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Course name"
              disabled={loading}
              className="flex-1"
            />
            <Button type="submit" disabled={loading}>{loading ? "Creating…" : "Create"}</Button>
          </form>
          {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
        </CardContent>
      </CardHeader>
    </Card>
  );
}
