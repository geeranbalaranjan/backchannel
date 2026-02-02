import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <main className="flex max-w-2xl flex-col items-center gap-8 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
          Backchannel
        </h1>
        <p className="text-lg text-muted-foreground">
          Live chat for your class. Join with a QR code, pick a pseudonym, ask questions, and react in real time. Instructors see identities; students stay anonymous.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4">
          <Button asChild size="lg">
            <Link href="/login">Sign in</Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/instructor">Instructor dashboard</Link>
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          Instructors: sign in to create courses and start sessions. Students: scan the QR from your instructor to join.
        </p>
      </main>
    </div>
  );
}
