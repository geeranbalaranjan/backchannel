import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/server";

/**
 * Instructor-only: get real identity (email, name) for a user in a course.
 * Never expose this to students; call only from teacher view.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const courseId = searchParams.get("courseId");
    if (!userId || !courseId) return NextResponse.json({ error: "userId and courseId required" }, { status: 400 });

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: member } = await supabase
      .from("course_members")
      .select("role")
      .eq("course_id", courseId)
      .eq("user_id", user.id)
      .single();
    if (!member || member.role !== "instructor") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const service = createServiceRoleClient();
    const { data: profile } = await service.auth.admin.getUserById(userId);
    if (!profile?.user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    return NextResponse.json({
      id: profile.user.id,
      email: profile.user.email ?? null,
      name: (profile.user.user_metadata?.full_name ?? profile.user.user_metadata?.name ?? null) as string | null,
    });
  } catch (e) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
