"use client";

import { useFormState } from "react-dom";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { magicLinkAction, githubLoginAction, FormState } from "@/app/actions/supabase-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Activity, AlertCircle, Mail } from "lucide-react";
import { Github } from "lucide-react";

const initialState: FormState = { error: undefined, success: undefined };

export default function LoginPage() {
  const router = useRouter();
  const [state, formAction] = useFormState<FormState, FormData>(magicLinkAction, initialState);
  const [isGithubLoading, setIsGithubLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showGithubSuccess, setShowGithubSuccess] = useState(false);

  // Handle OAuth callback with hash fragments
  useEffect(() => {
    const handleOAuthCallback = async () => {
      const hash = window.location.hash;
      if (hash && hash.includes('access_token')) {
        // Show success message immediately
        setShowGithubSuccess(true);

        try {
          const hashParams = new URLSearchParams(hash.substring(1));
          const accessToken = hashParams.get('access_token');
          const refreshToken = hashParams.get('refresh_token');

          if (accessToken && refreshToken) {
            // Store the token in cookie and localStorage
            const response = await fetch('/api/session/set-token', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ token: accessToken }),
            });

            if (response.ok) {
              // Also store in localStorage for Authorization header
              localStorage.setItem('token', accessToken);
            }

            // Wait a moment to show the success message
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Clear the hash and redirect
            window.location.href = '/';
          }
        } catch (error) {
          console.error('OAuth callback error:', error);
          setShowGithubSuccess(false);
        }
      }
    };

    handleOAuthCallback();
  }, []);

  const handleGithubLogin = async () => {
    setIsGithubLoading(true);
    const result = await githubLoginAction();
    if (result.url) {
      window.location.href = result.url;
    } else if (result.error) {
      alert(result.error);
      setIsGithubLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden p-4">
      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-purple-500/5 to-background">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(120,119,198,0.15),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(147,51,234,0.1),transparent_50%)]" />
      </div>

      {/* Floating orbs */}
      <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-primary/20 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-purple-500/20 rounded-full blur-3xl animate-pulse [animation-delay:1s]" />

      <div className="w-full max-w-md relative z-10">
        {/* Logo and Brand */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary mb-6">
            <Activity className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold mb-2 text-foreground">
            dYdX Alert
          </h1>
          <p className="text-muted-foreground">
            Real-time liquidation protection
          </p>
        </div>

        {/* Login Card with glass effect */}
        <Card className="backdrop-blur-xl bg-card/70 border-primary/20 shadow-2xl">
          <CardHeader className="space-y-2 pb-6 px-6 pt-6">
            <CardTitle className="text-2xl">Welcome back</CardTitle>
            <CardDescription className="text-base">
              Sign in to start monitoring your positions
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 px-6 pb-6">
            {state.success ? (
              <div className="py-8 text-center space-y-4">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-2">
                  <Mail className="h-8 w-8 text-primary" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold">Check your email</h3>
                  <p className="text-sm text-muted-foreground">
                    We sent you a magic link to sign in. Click the link in your email to continue.
                  </p>
                </div>
              </div>
            ) : showGithubSuccess ? (
              <div className="py-8 text-center space-y-4">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-2">
                  <Github className="h-8 w-8 text-primary" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold">Signing you in</h3>
                  <p className="text-sm text-muted-foreground">
                    Authenticating with GitHub...
                  </p>
                </div>
              </div>
            ) : (
              <>
                <form
                  action={formAction}
                  className="space-y-5"
                  onSubmit={() => setIsSubmitting(true)}
                >
                  <div className="space-y-2.5">
                    <Label htmlFor="email" className="text-sm font-medium">Email</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      required
                      autoComplete="email"
                      placeholder="you@example.com"
                      disabled={isSubmitting}
                    />
                  </div>

                  {state.error && (
                    <div className="rounded-xl border-2 border-destructive/50 bg-destructive/5 px-4 py-3.5 flex items-start gap-3 backdrop-blur-sm">
                      <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-destructive font-medium">{state.error}</p>
                    </div>
                  )}

                  <Button
                    type="submit"
                    className="w-full h-11 bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90 text-white font-medium shadow-lg shadow-primary/25 transition-all hover:shadow-xl hover:shadow-primary/30"
                    size="lg"
                    disabled={isSubmitting}
                  >
                    <Mail className="mr-2 h-5 w-5" />
                    {isSubmitting ? "Sending..." : "Send magic link"}
                  </Button>
                </form>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-primary/10" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-3 text-muted-foreground font-medium">Or continue with</span>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-11 border-primary/20 hover:border-primary/40 hover:bg-primary/5 transition-all"
                  size="lg"
                  onClick={handleGithubLogin}
                  disabled={isGithubLoading}
                >
                  <Github className="mr-2 h-5 w-5" />
                  <span className="font-medium">{isGithubLoading ? "Connecting..." : "GitHub"}</span>
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
