import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const messageId = typeof body.messageId === "string" ? body.messageId : "";
    const reason = typeof body.reason === "string" ? body.reason.trim() : null;
    if (!messageId) return NextResponse.json({ error: "messageId required" }, { status: 400 });

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: message } = await supabase
      .from("messages")
      .select("id, course_id, session_id")
      .eq("id", messageId)
      .single();
    if (!message) return NextResponse.json({ error: "Message not found" }, { status: 404 });

    const { data: member } = await supabase
      .from("course_members")
      .select("id")
      .eq("course_id", message.course_id)
      .eq("user_id", user.id)
      .single();
    if (!member) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { error } = await supabase.from("reports").insert({
      course_id: message.course_id,
      session_id: message.session_id,
      message_id: messageId,
      reporter_user_id: user.id,
      reason,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof Response) throw e;
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
