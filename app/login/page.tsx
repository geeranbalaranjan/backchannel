"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const LAURIER_DOMAIN = "@mylaurier.ca";

function isLaurierEmail(email: string): boolean {
  const trimmed = email.trim().toLowerCase();
  return trimmed.endsWith(LAURIER_DOMAIN.toLowerCase());
}

export default function LoginPage() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/instructor";
  const urlError = searchParams.get("error");

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) {
      setError("Please enter your email.");
      return;
    }
    if (!isLaurierEmail(trimmed)) {
      setError("Please use your Laurier email (@mylaurier.ca).");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const baseUrl =
      typeof process.env.NEXT_PUBLIC_APP_URL !== "undefined"
        ? process.env.NEXT_PUBLIC_APP_URL
        : (typeof window !== "undefined" ? window.location.origin : "");
    const redirectTo = `${baseUrl}/auth/callback?next=${encodeURIComponent(next)}`;

    const { error: signInError } = await supabase.auth.signInWithOtp({
      email: trimmed,
      options: {
        emailRedirectTo: redirectTo,
      },
    });

    setLoading(false);
    if (signInError) {
      setError(signInError.message || "Something went wrong. Please try again.");
      return;
    }
    setSuccess(true);
  }

  if (success) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4">
        <h1 className="text-2xl font-semibold">Check your inbox</h1>
        <p className="text-center text-muted-foreground">
          We sent a sign-in link to <strong>{email.trim()}</strong>. Click the link to sign in.
        </p>
        <p className="text-sm text-muted-foreground">
          Didn’t get it? Check spam or{" "}
          <Link href="/login" className="underline">
            try again
          </Link>
          .
        </p>
        <Link href="/" className="text-sm text-muted-foreground hover:underline">
          Back to home
        </Link>
      </div>
    );
  }

  const displayError =
    urlError === "domain_not_allowed"
      ? "Only Laurier (@mylaurier.ca) emails are allowed."
      : urlError === "auth"
        ? "Sign-in failed. Please try again."
        : error;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4">
      <h1 className="text-2xl font-semibold">Sign in to Backchannel</h1>
      <p className="text-center text-sm text-muted-foreground">
        Use your Laurier email (@mylaurier.ca). We’ll email you a sign-in link.
      </p>
      <form onSubmit={handleSubmit} className="flex w-full max-w-sm flex-col gap-4">
        <Input
          type="email"
          placeholder="you@mylaurier.ca"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={loading}
          autoComplete="email"
          className="w-full"
        />
        {displayError && (
          <p className="text-sm text-destructive">{displayError}</p>
        )}
        <Button type="submit" size="lg" disabled={loading} className="w-full">
          {loading ? "Sending…" : "Send sign-in link"}
        </Button>
      </form>
      <Link href="/" className="text-sm text-muted-foreground hover:underline">
        Back to home
      </Link>
    </div>
  );
}
