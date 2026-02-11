import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const sessionId = typeof body.sessionId === "string" ? body.sessionId : "";
    const token = typeof body.token === "string" ? body.token : "";
    if (!sessionId || !token) return NextResponse.json({ error: "sessionId and token required" }, { status: 400 });

    const supabase = createServiceRoleClient();
    const { data: session, error } = await supabase
      .from("lecture_sessions")
      .select("id, course_id, starts_at, is_active, is_locked, join_secret")
      .eq("id", sessionId)
      .single();
    if (error || !session) return NextResponse.json({ error: "Session not found" }, { status: 404 });

    if (session.join_secret !== token) return NextResponse.json({ error: "Invalid token" }, { status: 403 });
    if (!session.is_active) return NextResponse.json({ error: "Session ended" }, { status: 403 });
    if (session.is_locked) return NextResponse.json({ error: "Session is locked" }, { status: 403 });

    return NextResponse.json({
      sessionId: session.id,
      courseId: session.course_id,
      isActive: session.is_active,
      startsAt: session.starts_at,
    });
  } catch (e) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
