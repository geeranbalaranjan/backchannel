import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const courseId = typeof body.courseId === "string" ? body.courseId : "";
    const targetUserId = typeof body.targetUserId === "string" ? body.targetUserId : "";
    const durationMinutes = typeof body.durationMinutes === "number" ? body.durationMinutes : 60;
    const reason = typeof body.reason === "string" ? body.reason : null;
    if (!courseId || !targetUserId) return NextResponse.json({ error: "courseId and targetUserId required" }, { status: 400 });

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

    const mutedUntil = new Date(Date.now() + durationMinutes * 60 * 1000).toISOString();

    const { error: updateError } = await supabase
      .from("course_members")
      .update({ muted_until: mutedUntil })
      .eq("course_id", courseId)
      .eq("user_id", targetUserId);
    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

    const { error: actionError } = await supabase.from("moderation_actions").insert({
      course_id: courseId,
      target_user_id: targetUserId,
      action: "mute",
      reason,
      created_by: user.id,
    });
    if (actionError) return NextResponse.json({ error: actionError.message }, { status: 500 });

    return NextResponse.json({ mutedUntil, durationMinutes });
  } catch (e) {
    if (e instanceof Response) throw e;
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
