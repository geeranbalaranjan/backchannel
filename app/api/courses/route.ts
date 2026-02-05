import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth-helpers";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = await request.json();
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name) return NextResponse.json({ error: "Course name required" }, { status: 400 });

    const supabase = await createClient();
    const { data: course, error: courseError } = await supabase
      .from("courses")
      .insert({ name, created_by: user.id })
      .select("id, name, created_at")
      .single();
    if (courseError) return NextResponse.json({ error: courseError.message }, { status: 500 });

    const { error: memberError } = await supabase.from("course_members").insert({
      course_id: course.id,
      user_id: user.id,
      role: "instructor",
    });
    if (memberError) return NextResponse.json({ error: memberError.message }, { status: 500 });

    return NextResponse.json(course);
  } catch (e) {
    if (e instanceof Response) throw e;
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const user = await requireUser();
    const supabase = await createClient();
    const { data: members, error } = await supabase
      .from("course_members")
      .select("course_id")
      .eq("user_id", user.id)
      .eq("role", "instructor");
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    const courseIds = (members ?? []).map((m: { course_id: string }) => m.course_id);
    if (courseIds.length === 0) return NextResponse.json([]);
    const { data: courses, error: coursesError } = await supabase
      .from("courses")
      .select("id, name, created_at")
      .in("id", courseIds)
      .order("created_at", { ascending: false });
    if (coursesError) return NextResponse.json({ error: coursesError.message }, { status: 500 });
    return NextResponse.json(courses ?? []);
  } catch (e) {
    if (e instanceof Response) throw e;
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
