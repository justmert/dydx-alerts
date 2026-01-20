import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const secureCookie = process.env.NODE_ENV === "production";

export async function POST() {
  const cookieStore = cookies();
  cookieStore.set("auth_token", "", {
    httpOnly: true,
    sameSite: "lax",
    secure: secureCookie,
    domain: process.env.NODE_ENV === "production" ? ".dxalerts.app" : undefined,
    expires: new Date(0),
    path: "/",
  });

  return NextResponse.json({ message: "Logged out" });
}
