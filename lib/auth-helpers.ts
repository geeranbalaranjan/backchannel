import { createClient } from "@/lib/supabase/server";

export async function getCurrentUser() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  return user;
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) throw new Response("Unauthorized", { status: 401 });
  return user;
}

export async function getMemberRole(courseId: string, userId: string): Promise<"instructor" | "student" | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("course_members")
    .select("role")
    .eq("course_id", courseId)
    .eq("user_id", userId)
    .single();
  return (data?.role as "instructor" | "student") ?? null;
}

export async function requireInstructor(courseId: string) {
  const user = await requireUser();
  const role = await getMemberRole(courseId, user.id);
  if (role !== "instructor") throw new Response("Forbidden", { status: 403 });
  return user;
}

export async function requireMember(courseId: string) {
  const user = await requireUser();
  const role = await getMemberRole(courseId, user.id);
  if (!role) throw new Response("Forbidden", { status: 403 });
  return { user, role };
}
