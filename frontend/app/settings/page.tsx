"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchCurrentUser, fetchUserIdentities, updateUserPreferences } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import { Header } from "@/components/header";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertCircle, Clock, Check, Mail, Github, Link as LinkIcon } from "lucide-react";
import {
  getUserTimezone,
  setUserTimezone,
  getCommonTimezones,
  getTimezoneAbbreviation,
  formatDateInUserTimezone,
  initializeTimezoneFromDatabase,
} from "@/lib/timezone";
import { Banner as BannerComponent, BannerKind } from "@/components/banner";

export const dynamic = 'force-dynamic';

type Banner = { kind: BannerKind; message: string } | null;

export default function SettingsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const {
    data: currentUser,
    error: currentUserError,
  } = useQuery({ queryKey: ["current-user"], queryFn: fetchCurrentUser, retry: false });

  const updatePreferencesMutation = useMutation({
    mutationFn: updateUserPreferences,
    onSuccess: (data) => {
      queryClient.setQueryData(["current-user"], data);
      setHasChanges(false);
      setGlobalBanner({ kind: "success", message: "Settings saved successfully!" });
    },
    onError: (error: any) => {
      setGlobalBanner({ kind: "error", message: error.message || "Failed to save settings" });
    },
  });

  const { data: identities = [], refetch: refetchIdentities, error: identitiesError } = useQuery({
    queryKey: ["user-identities"],
    queryFn: fetchUserIdentities,
    retry: false,
  });

  const [globalBanner, setGlobalBanner] = useState<Banner>(null);
  const [timezone, setTimezone] = useState<string>("UTC");
  const [hasChanges, setHasChanges] = useState(false);
  const [isLinking, setIsLinking] = useState(false);

  useEffect(() => {
    // Initialize timezone from database if available, otherwise use localStorage/browser default
    if (currentUser?.timezone) {
      initializeTimezoneFromDatabase(currentUser.timezone);
      setTimezone(currentUser.timezone);
    } else {
      const userTz = getUserTimezone();
      setTimezone(userTz);
    }
  }, [currentUser]);

  useEffect(() => {
    // Refetch identities after OAuth redirect
    const hash = window.location.hash;
    if (hash && hash.includes('access_token')) {
      // User returned from OAuth, refetch identities
      setTimeout(() => {
        refetchIdentities();
        setGlobalBanner({ kind: "success", message: "Account linked successfully!" });
      }, 1000);
    }
  }, [refetchIdentities]);

  useEffect(() => {
    if (!currentUserError) return;
    setGlobalBanner((prev) => {
      if (prev?.message === "Authentication expired. Please sign in again.") {
        return prev;
      }
      return { kind: "error", message: "Authentication expired. Please sign in again." };
    });
  }, [currentUserError]);

  const handleLogout = async () => {
    setGlobalBanner(null);
    try {
      await fetch("/api/session/logout", { method: "POST", credentials: "include" });
    } catch (error) {
      console.error("Logout error:", error);
      setGlobalBanner({ kind: "error", message: "Failed to log out." });
    }

    // Clear localStorage token
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
      }
    } catch (e) {
      console.error("Error clearing localStorage:", e);
    }

    // Always redirect to login
    window.location.href = "/login";
  };

  const handleTimezoneChange = (value: string) => {
    setTimezone(value);
    setHasChanges(true);
  };

  const handleSave = () => {
    // Save to localStorage for immediate use
    setUserTimezone(timezone);

    // Save to database for cross-device sync
    updatePreferencesMutation.mutate(timezone);
  };

  const handleReset = () => {
    const userTz = getUserTimezone();
    setTimezone(userTz);
    setHasChanges(false);
  };

  const handleLinkGitHub = async () => {
    setIsLinking(true);
    try {
      // First check if we have a valid session
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        setGlobalBanner({ kind: "error", message: "No active session. Please log in again." });
        setIsLinking(false);
        return;
      }

      const { data, error } = await supabase.auth.linkIdentity({
        provider: 'github',
        options: {
          redirectTo: `${window.location.origin}/settings`,
        },
      });

      if (error) {
        setGlobalBanner({ kind: "error", message: error.message });
        setIsLinking(false);
      } else {
        // User will be redirected to GitHub OAuth flow
        // On return, identities will be refetched automatically
      }
    } catch (error: any) {
      setGlobalBanner({ kind: "error", message: error.message || "Failed to link GitHub account" });
      setIsLinking(false);
    }
  };

  // Check which providers are already linked
  const hasEmail = identities.some(i => i.provider === 'email');
  const hasGitHub = identities.some(i => i.provider === 'github');

  const commonTimezones = getCommonTimezones();
  const currentTime = new Date();
  const tzAbbrev = getTimezoneAbbreviation(timezone);

  return (
    <div className="min-h-screen flex flex-col">
      <Header user={currentUser} onLogout={handleLogout} />

      <main className="flex-1 p-4 md:p-6 space-y-4 overflow-auto max-w-3xl w-full mx-auto">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Configure your preferences and display options
          </p>
        </div>

        {globalBanner && (
          <BannerComponent kind={globalBanner.kind} message={globalBanner.message} />
        )}

        {/* Timezone Settings */}
        <Card>
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-border">
              <Clock className="h-5 w-5 text-primary" />
              <h2 className="text-sm font-semibold">Timezone</h2>
            </div>

            <div className="space-y-3">
              <div>
                <Label htmlFor="timezone" className="text-xs font-medium">
                  Display Timezone
                </Label>
                <p className="text-xs text-muted-foreground mt-0.5 mb-2">
                  All dates and times will be displayed in your selected timezone
                </p>
                <Select value={timezone} onValueChange={handleTimezoneChange}>
                  <SelectTrigger id="timezone" className="text-sm h-9">
                    <SelectValue placeholder="Select timezone" />
                  </SelectTrigger>
                  <SelectContent>
                    {commonTimezones.map((tz) => (
                      <SelectItem key={tz.value} value={tz.value} className="text-sm">
                        {tz.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Preview */}
              <div className="p-3 rounded-lg bg-muted/30 border border-border space-y-1.5">
                <p className="text-xs font-medium">Preview</p>
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Current time:</span>
                    <span className="font-mono">
                      {formatDateInUserTimezone(currentTime, {
                        timeZone: timezone,
                        hour: "numeric",
                        minute: "numeric",
                        second: "numeric",
                        hour12: true,
                      })}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Timezone:</span>
                    <span className="font-mono">
                      {timezone} {tzAbbrev && `(${tzAbbrev})`}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Full format:</span>
                    <span className="font-mono">
                      {formatDateInUserTimezone(currentTime, { timeZone: timezone })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Info */}
              <div className="flex items-start gap-2 p-2 rounded bg-blue-500/10 border border-blue-500/20">
                <AlertCircle className="h-4 w-4 text-blue-500 mt-0.5" />
                <p className="text-xs text-blue-600 dark:text-blue-400">
                  Timezone preference is synced to your account and will apply across all devices.
                  All dates displayed in the app including alerts, subaccounts, and activity logs
                  will use your selected timezone.
                </p>
              </div>
            </div>

            {/* Actions */}
            {hasChanges && (
              <div className="flex items-center gap-2 pt-2 border-t border-border">
                <Button
                  size="sm"
                  onClick={handleSave}
                  className="flex items-center gap-1.5"
                  disabled={updatePreferencesMutation.isPending}
                >
                  <Check className="h-4 w-4" />
                  {updatePreferencesMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleReset}
                  disabled={updatePreferencesMutation.isPending}
                >
                  Cancel
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Account Connections */}
        <Card>
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-border">
              <LinkIcon className="h-5 w-5 text-primary" />
              <h2 className="text-sm font-semibold">Account Connections</h2>
            </div>

            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Link multiple sign-in methods to your account for more flexible access
              </p>

              {/* Email Connection */}
              <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/30">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Mail className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Email</p>
                    <p className="text-xs text-muted-foreground">
                      {hasEmail ? currentUser?.email : "Not connected"}
                    </p>
                  </div>
                </div>
                {hasEmail ? (
                  <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-success/10 text-success">
                    <Check className="h-3 w-3" />
                    <span className="text-xs font-medium">Connected</span>
                  </div>
                ) : (
                  <Button size="sm" variant="outline" disabled>
                    Connect
                  </Button>
                )}
              </div>

              {/* GitHub Connection */}
              <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/30">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Github className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">GitHub</p>
                    <p className="text-xs text-muted-foreground">
                      {hasGitHub ? "Sign in with GitHub" : "Not connected"}
                    </p>
                  </div>
                </div>
                {hasGitHub ? (
                  <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-success/10 text-success">
                    <Check className="h-3 w-3" />
                    <span className="text-xs font-medium">Connected</span>
                  </div>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleLinkGitHub}
                    disabled={isLinking}
                  >
                    {isLinking ? "Linking..." : "Connect"}
                  </Button>
                )}
              </div>

              {/* Info Message */}
              <div className="flex items-start gap-2 p-2 rounded bg-blue-500/10 border border-blue-500/20">
                <AlertCircle className="h-4 w-4 text-blue-500 mt-0.5" />
                <div className="text-xs text-blue-600 dark:text-blue-400 space-y-1">
                  <p className="font-medium">Account Linking</p>
                  <p>
                    Link multiple authentication methods to access your account with either email or GitHub.
                    Once linked, you can sign in using any connected method.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
