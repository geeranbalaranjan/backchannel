import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import JoinClient from "./join-client";

export default async function JoinPage({
  params,
  searchParams,
}: {
  params: Promise<{ sessionId: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const { sessionId } = await params;
  const { token } = await searchParams;
  if (!token) {
    redirect("/?error=missing_token");
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const service = createServiceRoleClient();
  const { data: session, error } = await service
    .from("lecture_sessions")
    .select("id, course_id, is_active, is_locked, join_secret")
    .eq("id", sessionId)
    .single();

  if (error || !session || session.join_secret !== token || !session.is_active || session.is_locked) {
    redirect("/?error=invalid_session");
  }

  if (user) {
    redirect(`/onboarding/${sessionId}?token=${encodeURIComponent(token)}`);
  }

  return (
    <JoinClient
      sessionId={sessionId}
      token={token}
      next={`/onboarding/${sessionId}?token=${encodeURIComponent(token)}`}
    />
  );
}
