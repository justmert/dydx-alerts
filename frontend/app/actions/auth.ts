"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const API_BASE = (process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000").replace(/\/$/, "");
const secureCookie = process.env.NODE_ENV === "production";

export interface FormState {
  error?: string;
}

async function postToBackend(path: string, payload: Record<string, unknown>) {
  const response = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = (data && (data.detail || data.message)) || "Authentication failed.";
    throw new Error(message);
  }

  return data as {
    access_token: string;
    email: string;
    name?: string;
    issued_at?: string;
    expires_at?: string;
  };
}

export async function loginAction(_state: FormState, formData: FormData): Promise<FormState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const redirectTo = String(formData.get("redirectTo") ?? "/");

  if (!email || !password) {
    return { error: "Email and password are required." };
  }

  try {
    const data = await postToBackend("/api/auth/login", { email, password });
    const cookieStore = cookies();
    cookieStore.set("auth_token", data.access_token, {
      httpOnly: true,
      sameSite: "lax",
      secure: secureCookie,
      path: "/",
    });
    redirect(redirectTo || "/");
  } catch (error) {
    return { error: (error as Error).message };
  }

  return { error: undefined };
}

export async function registerAction(_state: FormState, formData: FormData): Promise<FormState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const name = formData.get("name") ? String(formData.get("name")) : undefined;

  if (!email || !password) {
    return { error: "Email and password are required." };
  }

  try {
    const data = await postToBackend("/api/auth/register", { email, password, name });
    const cookieStore = cookies();
    cookieStore.set("auth_token", data.access_token, {
      httpOnly: true,
      sameSite: "lax",
      secure: secureCookie,
      path: "/",
    });
    redirect("/");
  } catch (error) {
    return { error: (error as Error).message };
  }

  return { error: undefined };
}

export async function logoutAction() {
  const cookieStore = cookies();
  cookieStore.set("auth_token", "", {
    httpOnly: true,
    sameSite: "lax",
    secure: secureCookie,
    expires: new Date(0),
    path: "/",
  });
}
