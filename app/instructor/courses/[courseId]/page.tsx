import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function CoursePage({
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

  const { data: members } = await supabase
    .from("course_members")
    .select("id, user_id, role, alias, created_at")
    .eq("course_id", courseId)
    .order("created_at", { ascending: false });

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 flex items-center gap-4">
          <Link href="/instructor">
            <Button variant="outline">← Dashboard</Button>
          </Link>
          <h1 className="text-2xl font-bold">{course.name}</h1>
        </div>
        <div className="mb-6">
          <Link href={`/instructor/courses/${courseId}/session`}>
            <Button>Start lecture session</Button>
          </Link>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Course members</CardTitle>
            <CardContent className="p-0 pt-2">
              {!members?.length ? (
                <p className="text-muted-foreground">No members yet. Students join when they scan the session QR.</p>
              ) : (
                <ul className="divide-y">
                  {members.map((m) => (
                    <li key={m.id} className="flex items-center justify-between py-2">
                      <span className="text-sm">
                        {m.alias ?? "(no alias)"} — <span className="text-muted-foreground">{m.role}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </CardHeader>
        </Card>
      </div>
    </div>
  );
}
