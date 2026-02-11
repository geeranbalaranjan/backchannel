import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const sessionId = typeof body.sessionId === "string" ? body.sessionId : "";
    const bodyText = typeof body.body === "string" ? body.body.trim() : "";
    const kind = body.kind === "question" ? "question" : "chat";
    if (!sessionId || !bodyText) return NextResponse.json({ error: "sessionId and body required" }, { status: 400 });
  if (bodyText.length > 2000) return NextResponse.json({ error: "Message too long" }, { status: 400 });

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: session } = await supabase
      .from("lecture_sessions")
      .select("id, course_id, starts_at, current_slide_index")
      .eq("id", sessionId)
      .single();
    if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });

    const { data: member } = await supabase
      .from("course_members")
      .select("alias, muted_until")
      .eq("course_id", session.course_id)
      .eq("user_id", user.id)
      .single();
    if (!member) return NextResponse.json({ error: "Not a member of this course" }, { status: 403 });
    if (member.muted_until && new Date(member.muted_until) > new Date())
      return NextResponse.json({ error: "You are muted" }, { status: 403 });
    if (!member.alias) return NextResponse.json({ error: "Set your alias first" }, { status: 400 });

    const startsAt = new Date(session.starts_at).getTime();
    const tOffsetMs = Math.max(0, Date.now() - startsAt);

    const { data: message, error } = await supabase
      .from("messages")
      .insert({
        session_id: sessionId,
        course_id: session.course_id,
        user_id: user.id,
        alias_snapshot: member.alias,
        body: bodyText,
        kind,
        slide_index: session.current_slide_index,
        t_offset_ms: tOffsetMs,
      })
      .select("id, created_at, t_offset_ms")
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ id: message.id, created_at: message.created_at, t_offset_ms: message.t_offset_ms });
  } catch (e) {
    if (e instanceof Response) throw e;
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
