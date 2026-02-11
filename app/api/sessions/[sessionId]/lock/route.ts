import { NextResponse } from "next/server";
import { requireInstructor } from "@/lib/auth-helpers";
import { createClient } from "@/lib/supabase/server";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const supabase = await createClient();
    const { data: session } = await supabase
      .from("lecture_sessions")
      .select("course_id")
      .eq("id", sessionId)
      .single();
    if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });

    await requireInstructor(session.course_id);

    const { error } = await supabase
      .from("lecture_sessions")
      .update({ is_locked: true })
      .eq("id", sessionId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ locked: true });
  } catch (e) {
    if (e instanceof Response) throw e;
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
