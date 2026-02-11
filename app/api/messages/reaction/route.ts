import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const ALLOWED_REACTIONS = ["???", "W", "L", "THIS", "👍", "👎", "❤️"];

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const messageId = typeof body.messageId === "string" ? body.messageId : "";
    const reaction = typeof body.reaction === "string" ? body.reaction.trim() : "";
    if (!messageId || !reaction) return NextResponse.json({ error: "messageId and reaction required" }, { status: 400 });
    if (!ALLOWED_REACTIONS.includes(reaction)) return NextResponse.json({ error: "Invalid reaction" }, { status: 400 });

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

    const { error } = await supabase.from("message_reactions").upsert(
      { message_id: messageId, course_id: message.course_id, user_id: user.id, reaction },
      { onConflict: "message_id,user_id,reaction" }
    );
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof Response) throw e;
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const messageId = searchParams.get("messageId");
    const reaction = searchParams.get("reaction");
    if (!messageId || !reaction) return NextResponse.json({ error: "messageId and reaction required" }, { status: 400 });

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { error } = await supabase
      .from("message_reactions")
      .delete()
      .eq("message_id", messageId)
      .eq("user_id", user.id)
      .eq("reaction", reaction);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof Response) throw e;
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
