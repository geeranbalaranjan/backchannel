import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SessionControls } from "./session-controls";

export default async function SessionPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/instructor");

  const { data: course } = await supabase
    .from("courses")
    .select("id, name")
    .eq("id", courseId)
    .single();
  if (!course) notFound();

  const { data: member } = await supabase
    .from("course_members")
    .select("role")
    .eq("course_id", courseId)
    .eq("user_id", user.id)
    .single();
  if (!member || member.role !== "instructor") redirect("/instructor");

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 flex items-center gap-4">
          <Link href={`/instructor/courses/${courseId}`}>
            <Button variant="outline">← Course</Button>
          </Link>
          <h1 className="text-2xl font-bold">{course.name} — Session</h1>
        </div>
        <SessionControls courseId={courseId} courseName={course.name} />
      </div>
    </div>
  );
}
