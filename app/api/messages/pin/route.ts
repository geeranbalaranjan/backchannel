import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const messageId = typeof body.messageId === "string" ? body.messageId : "";
    const pin = body.pin !== false;
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
      .select("role")
      .eq("course_id", message.course_id)
      .eq("user_id", user.id)
      .single();
    if (!member || member.role !== "instructor") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { error } = await supabase
      .from("messages")
      .update({
        pinned_at: pin ? new Date().toISOString() : null,
        pinned_by: pin ? user.id : null,
      })
      .eq("id", messageId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ pinned: pin });
  } catch (e) {
    if (e instanceof Response) throw e;
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
