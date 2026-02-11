import { NextResponse } from "next/server";
import { requireInstructor } from "@/lib/auth-helpers";
import { createClient } from "@/lib/supabase/server";
import { randomBytes } from "crypto";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const courseId = typeof body.courseId === "string" ? body.courseId : "";
    if (!courseId) return NextResponse.json({ error: "courseId required" }, { status: 400 });

    const user = await requireInstructor(courseId);
    const joinSecret = randomBytes(32).toString("hex");

    const supabase = await createClient();
    const { data: session, error } = await supabase
      .from("lecture_sessions")
      .insert({
        course_id: courseId,
        created_by: user.id,
        join_secret: joinSecret,
        is_active: true,
        is_locked: false,
      })
      .select("id, course_id, starts_at, is_active")
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? (request.headers.get("x-forwarded-host") ? `https://${request.headers.get("x-forwarded-host")}` : "http://localhost:3000");
    const joinUrl = `${baseUrl}/join/${session.id}?token=${joinSecret}`;

    return NextResponse.json({
      sessionId: session.id,
      joinUrl,
      qrPayload: joinUrl,
      startsAt: session.starts_at,
    });
  } catch (e) {
    if (e instanceof Response) throw e;
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
