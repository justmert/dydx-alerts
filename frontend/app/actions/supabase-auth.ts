"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export interface FormState {
  error?: string;
  success?: string;
}

export async function magicLinkAction(_state: FormState, formData: FormData): Promise<FormState> {
  const email = String(formData.get("email") ?? "").trim();

  if (!email) {
    return { error: "Email is required." };
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:8022"}/auth/callback`,
    },
  });

  if (error) {
    return { error: error.message };
  }

  return { success: "Check your email for the magic link!" };
}

export async function logoutAction() {
  const cookieStore = cookies();
  cookieStore.set("auth_token", "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    expires: new Date(0),
    path: "/",
  });
}

export async function githubLoginAction(): Promise<{ url?: string; error?: string }> {
  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Always use production URL for OAuth redirects to avoid deploy preview URLs
    const redirectUrl = process.env.NODE_ENV === 'production'
      ? 'https://alertsdydx.com/login'
      : `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:8022"}/login`;

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "github",
      options: {
        redirectTo: redirectUrl,
      },
    });

    if (error) {
      return { error: error.message };
    }

    if (!data?.url) {
      return { error: "Failed to generate OAuth URL" };
    }

    return { url: data.url };
  } catch (error) {
    return { error: (error as Error).message };
  }
}
