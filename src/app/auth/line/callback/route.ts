import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const CHANNEL_ID = process.env.LINE_CHANNEL_ID!;
const CHANNEL_SECRET = process.env.LINE_CHANNEL_SECRET!;
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.xn--72ch7bybxexd0cc.com";

async function exchangeLineCode(code: string, redirectUri: string) {
  const res = await fetch("https://api.line.me/oauth2/v2.1/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      client_id: CHANNEL_ID,
      client_secret: CHANNEL_SECRET,
    }),
  });
  if (!res.ok) throw new Error(`LINE token error: ${res.status}`);
  return res.json() as Promise<{ access_token: string }>;
}

async function getLineProfile(accessToken: string) {
  const res = await fetch("https://api.line.me/v2/profile", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`LINE profile error: ${res.status}`);
  return res.json() as Promise<{ userId: string; displayName: string; pictureUrl?: string }>;
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state") ?? "";
  const isMobile = state.startsWith("mobile_");
  const redirectUri = `${SITE_URL}/auth/line/callback`;

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=line_no_code`);
  }

  try {
    const { access_token } = await exchangeLineCode(code, redirectUri);
    const profile = await getLineProfile(access_token);

    // Synthetic credentials — LINE UID is stable, never changes
    const email = `line_${profile.userId}@sengran-line.user`;
    const password = `LINE_${profile.userId}_${CHANNEL_SECRET.slice(0, 12)}`;

    const admin = createAdminClient();
    const supabase = await createClient();

    // Try sign in (existing user)
    let { data: session, error: signInError } = await supabase.auth.signInWithPassword({ email, password });

    if (signInError) {
      // First time — create user then sign in
      const { data: created, error: createError } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          provider: "line",
          line_uid: profile.userId,
          full_name: profile.displayName,
          avatar_url: profile.pictureUrl ?? null,
        },
      });
      if (createError) throw createError;

      const { data: signIn } = await supabase.auth.signInWithPassword({ email, password });
      session = signIn;

      // Set display name + avatar in profiles table
      if (created.user) {
        await admin.from("profiles").upsert({
          id: created.user.id,
          display_name: profile.displayName,
          avatar_url: profile.pictureUrl ?? null,
          updated_at: new Date().toISOString(),
        });
      }
    }

    if (!session?.session) throw new Error("No session after LINE login");

    if (isMobile) {
      const at = encodeURIComponent(session.session.access_token);
      const rt = encodeURIComponent(session.session.refresh_token);
      return NextResponse.redirect(`sengran://auth?access_token=${at}&refresh_token=${rt}`);
    }

    return NextResponse.redirect(`${origin}/`);
  } catch (err) {
    console.error("LINE callback error:", err);
    return NextResponse.redirect(`${origin}/login?error=line_failed`);
  }
}
