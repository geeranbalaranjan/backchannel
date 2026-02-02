import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { validateAlias, sanitizeAlias } from "@/lib/alias";

const MAX_ALIAS_CHANGES = 1;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const sessionId = typeof body.sessionId === "string" ? body.sessionId : "";
    const token = typeof body.token === "string" ? body.token : "";
    const rawAlias = typeof body.alias === "string" ? body.alias : "";
    if (!sessionId || !token || !rawAlias)
      return NextResponse.json({ error: "sessionId, token, and alias required" }, { status: 400 });

    const alias = sanitizeAlias(rawAlias);
    const validation = validateAlias(alias);
    if (!validation.ok) return NextResponse.json({ error: validation.error }, { status: 400 });

    const supabaseAnon = await createClient();
    const { data: { user } } = await supabaseAnon.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const service = createServiceRoleClient();
    const { data: session, error: sessionError } = await service
      .from("lecture_sessions")
      .select("id, course_id, is_active, is_locked, join_secret")
      .eq("id", sessionId)
      .single();
    if (sessionError || !session) return NextResponse.json({ error: "Session not found" }, { status: 404 });
    if (session.join_secret !== token) return NextResponse.json({ error: "Invalid token" }, { status: 403 });
    if (!session.is_active) return NextResponse.json({ error: "Session ended" }, { status: 403 });
    if (session.is_locked) return NextResponse.json({ error: "Session is locked" }, { status: 403 });

    const courseId = session.course_id;

    const { data: existingMember } = await service
      .from("course_members")
      .select("id, alias, alias_locked, alias_changed_count")
      .eq("course_id", courseId)
      .eq("user_id", user.id)
      .single();

    const aliasLower = alias.trim().toLowerCase();
    const { data: aliasTaken } = await service
      .from("course_members")
      .select("id")
      .eq("course_id", courseId)
      .ilike("alias", alias.trim())
      .limit(1)
      .maybeSingle();
    if (aliasTaken && aliasTaken.id !== existingMember?.id)
      return NextResponse.json({ error: "That alias is already taken in this course" }, { status: 400 });

    if (existingMember?.alias_locked)
      return NextResponse.json({ error: "Your alias is locked" }, { status: 403 });
    if (existingMember && existingMember.alias_changed_count >= MAX_ALIAS_CHANGES && existingMember.alias)
      return NextResponse.json({ error: "You can only change your alias once per course" }, { status: 400 });

    if (existingMember) {
      const { error: updateError } = await service
        .from("course_members")
        .update({
          alias: alias.trim(),
          alias_changed_count: (existingMember.alias_changed_count ?? 0) + 1,
        })
        .eq("id", existingMember.id);
      if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });
    } else {
      const { error: insertError } = await service.from("course_members").insert({
        course_id: courseId,
        user_id: user.id,
        role: "student",
        alias: alias.trim(),
        alias_changed_count: 0,
      });
      if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, alias: alias.trim() });
  } catch (e) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
