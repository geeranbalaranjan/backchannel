import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const messageId = typeof body.messageId === "string" ? body.messageId : "";
    const value = body.value === 0 ? 0 : 1;
    if (!messageId) return NextResponse.json({ error: "messageId required" }, { status: 400 });

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: message } = await supabase
      .from("messages")
      .select("id, course_id")
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

    if (value === 0) {
      await supabase.from("message_votes").delete().eq("message_id", messageId).eq("user_id", user.id);
      return NextResponse.json({ value: 0 });
    }
    const { error } = await supabase.from("message_votes").upsert(
      { message_id: messageId, course_id: message.course_id, user_id: user.id, value: 1 },
      { onConflict: "message_id,user_id" }
    );
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ value: 1 });
  } catch (e) {
    if (e instanceof Response) throw e;
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
