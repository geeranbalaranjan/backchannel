import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { StudentChat } from "./student-chat";

export default async function StudentSessionPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/s/${sessionId}`)}`);

  const { data: session } = await supabase
    .from("lecture_sessions")
    .select("id, course_id, starts_at")
    .eq("id", sessionId)
    .single();
  if (!session) notFound();

  const { data: course } = await supabase
    .from("courses")
    .select("name")
    .eq("id", session.course_id)
    .single();
  const { data: member } = await supabase
    .from("course_members")
    .select("alias")
    .eq("course_id", session.course_id)
    .eq("user_id", user.id)
    .single();
  if (!member?.alias) redirect(`/onboarding/${sessionId}`);

  return (
    <StudentChat
      sessionId={sessionId}
      courseId={session.course_id}
      courseName={course?.name ?? "Lecture"}
      startsAt={session.starts_at}
    />
  );
}
