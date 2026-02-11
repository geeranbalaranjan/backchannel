import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import OnboardingForm from "./onboarding-form";

export default async function OnboardingPage({
  params,
  searchParams,
}: {
  params: Promise<{ sessionId: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const { sessionId } = await params;
  const { token } = await searchParams;
  if (!token) redirect("/?error=missing_token");

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/onboarding/${sessionId}?token=${encodeURIComponent(token)}`)}`);

  const { createServiceRoleClient } = await import("@/lib/supabase/server");
  const service = createServiceRoleClient();
  const { data: session, error } = await service
    .from("lecture_sessions")
    .select("id, course_id, is_active, is_locked, join_secret")
    .eq("id", sessionId)
    .single();
  if (error || !session || session.join_secret !== token || !session.is_active || session.is_locked) {
    redirect("/?error=invalid_session");
  }
  const validateData = { courseId: session.course_id };

  const { data: member } = await supabase
    .from("course_members")
    .select("alias")
    .eq("course_id", validateData.courseId)
    .eq("user_id", user.id)
    .single();

  if (member?.alias) {
    redirect(`/s/${sessionId}`);
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <OnboardingForm sessionId={sessionId} token={token} courseId={validateData.courseId} />
    </div>
  );
}
