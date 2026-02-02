import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const LAURIER_DOMAIN = "@mylaurier.ca";

function isLaurierEmail(email: string | undefined): boolean {
  if (!email) return false;
  return email.trim().toLowerCase().endsWith(LAURIER_DOMAIN.toLowerCase());
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const next = searchParams.get("next") ?? "/instructor";

  const supabase = await createClient();

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: type as "magiclink",
    });
    if (error) {
      return NextResponse.redirect(`${origin}/login?error=auth&next=${encodeURIComponent(next)}`);
    }
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return NextResponse.redirect(`${origin}/login?error=auth&next=${encodeURIComponent(next)}`);
    }
  } else {
    return NextResponse.redirect(`${origin}/login?error=auth&next=${encodeURIComponent(next)}`);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) {
    return NextResponse.redirect(`${origin}/login?error=auth&next=${encodeURIComponent(next)}`);
  }

  if (!isLaurierEmail(user.email)) {
    await supabase.auth.signOut();
    return NextResponse.redirect(
      `${origin}/login?error=domain_not_allowed&next=${encodeURIComponent(next)}`
    );
  }

  return NextResponse.redirect(`${origin}${next}`);
}
