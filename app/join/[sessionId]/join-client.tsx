"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function JoinClient({
  sessionId,
  token,
  next,
}: {
  sessionId: string;
  token: string;
  next: string;
}) {
  const loginUrl = `/login?next=${encodeURIComponent(next)}`;
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Join this session</CardTitle>
          <CardContent className="p-0 pt-2">
            <p className="text-muted-foreground">
              Sign in with your Laurier email (@mylaurier.ca) to join the lecture chat. You’ll get a sign-in link by email and choose a display name (alias) after signing in.
            </p>
            <Button asChild className="mt-4 w-full" size="lg">
              <Link href={loginUrl}>Continue with Laurier email</Link>
            </Button>
            <p className="mt-4 text-center text-sm text-muted-foreground">
              <Link href="/" className="hover:underline">Back to home</Link>
            </p>
          </CardContent>
        </CardHeader>
      </Card>
    </div>
  );
}
