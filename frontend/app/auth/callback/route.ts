import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");

  // Handle OAuth code exchange (GitHub)
  if (code) {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      return NextResponse.redirect(new URL(`/login?error=${error.message}`, request.url));
    }

    if (data.session) {
      const cookieStore = cookies();
      cookieStore.set("auth_token", data.session.access_token, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 60 * 60 * 24 * 7, // 7 days
      });

      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  // If no code, assume it's a magic link (tokens are in hash fragment)
  // Redirect to client-side page that can read the hash
  return NextResponse.redirect(new URL("/auth/confirm", request.url));
}
