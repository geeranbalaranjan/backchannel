import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function InstructorDashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/instructor");

  const { data: members } = await supabase
    .from("course_members")
    .select("course_id")
    .eq("user_id", user.id)
    .eq("role", "instructor");
  const courseIds = (members ?? []).map((m) => m.course_id);
  let courses: { id: string; name: string; created_at: string }[] = [];
  if (courseIds.length > 0) {
    const { data } = await supabase
      .from("courses")
      .select("id, name, created_at")
      .in("id", courseIds)
      .order("created_at", { ascending: false });
    courses = (data ?? []) as { id: string; name: string; created_at: string }[];
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-2xl font-bold">Instructor dashboard</h1>
          <Link href="/">
            <Button variant="outline">Home</Button>
          </Link>
        </div>
        <CreateCourseForm />
        <div className="mt-8 space-y-4">
          <h2 className="text-lg font-medium">Your courses</h2>
          {courses.length === 0 ? (
            <p className="text-muted-foreground">No courses yet. Create one above.</p>
          ) : (
            <ul className="space-y-2">
              {courses.map((c) => (
                <li key={c.id}>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 py-4">
                      <CardTitle className="text-base">{c.name}</CardTitle>
                      <div className="flex gap-2">
                        <Link href={`/instructor/courses/${c.id}`}>
                          <Button variant="outline" size="sm">Manage</Button>
                        </Link>
                        <Link href={`/instructor/courses/${c.id}/session`}>
                          <Button size="sm">Start session</Button>
                        </Link>
                      </div>
                    </CardHeader>
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

import { CreateCourseForm } from "./create-course-form";
