"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { Card, CardContent } from "@/components/ui/card";
import { Activity, Loader2 } from "lucide-react";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export default function ConfirmPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleAuth = async () => {
      try {
        const supabase = createClient(supabaseUrl, supabaseAnonKey);

        // Get the hash fragment (e.g., #access_token=...)
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get("access_token");
        const refreshToken = hashParams.get("refresh_token");

        if (accessToken && refreshToken) {
          // Set the session using the tokens from the hash
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (error) {
            setError(error.message);
            return;
          }

          if (data.session) {
            // Store access token in cookie
            await fetch("/api/session/set-token", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ token: data.session.access_token }),
            });

            // Also store in localStorage for Authorization header
            localStorage.setItem('token', data.session.access_token);

            // Force full page reload to ensure cookie is included
            window.location.href = "/";
            return;
          }
        }

        setError("Invalid authentication link");
      } catch (err) {
        setError((err as Error).message);
      }
    };

    handleAuth();
  }, [router]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <div className="text-destructive mb-4">
              <p className="font-semibold">Authentication Failed</p>
              <p className="text-sm mt-2">{error}</p>
            </div>
            <a href="/login" className="text-primary text-sm hover:underline">
              Return to login
            </a>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="p-8 text-center space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary mb-4">
            <Activity className="h-8 w-8 text-white" />
          </div>
          <h2 className="text-xl font-semibold">Signing you in...</h2>
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
        </CardContent>
      </Card>
    </div>
  );
}
