"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery, useQueries } from "@tanstack/react-query";
import {
  fetchAlerts,
  fetchChannels,
  fetchCurrentUser,
  fetchSubaccountStatus,
  fetchAlertRules,
} from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/header";
import { Card, CardContent } from "@/components/ui/card";
import { Banner as BannerComponent, BannerKind } from "@/components/banner";
import { Activity, AlertCircle, Bell, ArrowRight, DollarSign, ShieldAlert, TrendingUp, TrendingDown, Plus, ChevronDown, BarChart3 } from "lucide-react";
import { useData } from "@/lib/data-provider";
import { formatAlertDate, initializeTimezoneFromDatabase } from "@/lib/timezone";

type Banner = { kind: BannerKind; message: string } | null;

export default function DashboardPage() {
  const router = useRouter();

  // First check authentication
  const {
    data: currentUser,
    error: currentUserError,
    isLoading: isLoadingUser,
  } = useQuery({
    queryKey: ["current-user"],
    queryFn: fetchCurrentUser,
    retry: false,
  });

  // Only fetch data if user is authenticated
  const isAuthenticated = !!currentUser && !currentUserError;

  // Use shared data provider - only enabled if authenticated
  const { subaccounts, markets } = useData();

  const { data: channels = [] } = useQuery({
    queryKey: ["channels"],
    queryFn: fetchChannels,
    enabled: isAuthenticated,
  });

  const { data: alerts = [] } = useQuery({
    queryKey: ["alerts"],
    queryFn: fetchAlerts,
    staleTime: 10_000,
    enabled: isAuthenticated,
  });

  const { data: allAlertRules = [] } = useQuery({
    queryKey: ["alert-rules"],
    queryFn: fetchAlertRules,
    staleTime: 30_000,
    enabled: isAuthenticated,
  });

  // Filter out archived rules for dashboard count
  const alertRules = useMemo(() =>
    allAlertRules.filter(rule => !rule.archived),
    [allAlertRules]
  );

  const [globalBanner, setGlobalBanner] = useState<Banner>(null);

  // Initialize timezone from database on app load
  useEffect(() => {
    if (currentUser?.timezone) {
      initializeTimezoneFromDatabase(currentUser.timezone);
    }
  }, [currentUser?.timezone]);

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

  const activeSubaccounts = subaccounts.filter((s) => s.is_active);
  const recentAlerts = alerts.slice(0, 5);
  const criticalAlerts = alerts.filter((a) => a.severity.toLowerCase() === "critical").length;
  const warningAlerts = alerts.filter((a) => a.severity.toLowerCase() === "warning").length;
  const enabledRules = alertRules.filter((r) => r.enabled).length;

  return (
    <div className="min-h-screen flex flex-col">
      <Header user={currentUser} onLogout={handleLogout} />

      <main className="flex-1 p-4 md:p-6 space-y-4 overflow-auto max-w-7xl w-full mx-auto">
          {/* Page Header */}
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Monitor your positions, alerts, and account status in real-time
            </p>
          </div>

          {globalBanner && (
            <BannerComponent kind={globalBanner.kind} message={globalBanner.message} />
          )}

          {/* Portfolio Summary */}
          <Card>
            <CardContent className="p-4">
              <h2 className="text-sm font-semibold mb-3">Portfolio Overview</h2>
              <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
                <div>
                  <p className="text-xs text-muted-foreground">Active Subaccounts</p>
                  <p className="text-xl font-semibold mt-1">{activeSubaccounts.length}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Alert Rules</p>
                  <p className="text-xl font-semibold mt-1">{alertRules.length}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Critical Alerts</p>
                  <p className="text-xl font-semibold mt-1 text-destructive">{criticalAlerts}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Notification Channels</p>
                  <p className="text-xl font-semibold mt-1">{channels.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stats Grid - removed as we have Portfolio Overview card now */}

          {/* Subaccounts Overview */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <Link href="/subaccounts">
                  <h2 className="text-sm font-semibold hover:text-primary transition-colors cursor-pointer">Monitored Subaccounts</h2>
                </Link>
                <Link href="/subaccounts" className="text-xs text-primary hover:underline flex items-center gap-1">
                  View all
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
              {subaccounts.length === 0 ? (
                <div className="flex flex-col items-center py-12">
                  <div className="rounded-full bg-primary/10 p-4 mb-3">
                    <Activity className="h-8 w-8 text-primary" />
                  </div>
                  <p className="text-sm font-medium mb-1">No Subaccounts Yet</p>
                  <p className="text-xs text-muted-foreground mb-4">
                    Add your first subaccount to start monitoring positions
                  </p>
                  <Link href="/subaccounts">
                    <Button size="sm">
                      <Plus className="h-4 w-4 mr-1.5" />
                      Add Subaccount
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-2 max-h-[500px] overflow-y-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-muted [&::-webkit-scrollbar-thumb]:bg-muted-foreground/20 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:hover:bg-muted-foreground/30">
                  {subaccounts.map((sub) => (
                    <SubaccountRow key={sub.id} subaccount={sub} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Active Markets Card */}
          <ActiveMarketsCard subaccounts={subaccounts} markets={markets} />

          {/* Two Column Layout for Alerts and Rules */}
          <div className="grid gap-4 md:grid-cols-2">
            {/* Recent Alerts */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-semibold">Recent Alerts</h2>
                  <Link href="/alerts" className="text-xs text-primary hover:underline flex items-center gap-1">
                    View all
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>

                
                {recentAlerts.length === 0 ? (
                  <div className="text-center py-8 text-xs text-muted-foreground">
                    No alerts yet. All subaccounts are healthy.
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-[400px] overflow-y-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-muted [&::-webkit-scrollbar-thumb]:bg-muted-foreground/20 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:hover:bg-muted-foreground/30">
                    {recentAlerts.map((alert) => {
                      // Extract metadata
                      const ruleName = alert.alert_metadata?.rule_name as string | undefined;
                      const conditionType = alert.alert_metadata?.condition_type as string | undefined;

                      // Condition type labels
                      const conditionLabels: Record<string, string> = {
                        "liquidation_distance": "Liquidation Distance",
                        "margin_ratio": "Margin Ratio",
                        "equity_drop": "Equity",
                        "position_size": "Position Size",
                        "free_collateral": "Free Collateral",
                        "position_pnl_percent": "Position PnL %",
                        "position_pnl_usd": "Position PnL",
                        "position_size_usd": "Position Size",
                        "position_liquidation_distance": "Position Liquidation Distance",
                        "position_leverage": "Position Leverage",
                        "position_size_contracts": "Position Size (Contracts)",
                        "position_entry_price": "Entry Price",
                        "position_oracle_price": "Oracle Price",
                        "position_funding_payment": "Funding Payment"
                      };

                      const severity = alert.severity.toLowerCase();
                      const iconBgColor = severity === "critical"
                        ? "bg-destructive/20"
                        : severity === "warning"
                        ? "bg-warning/20"
                        : "bg-blue-500/20";
                      const iconColor = severity === "critical"
                        ? "text-destructive"
                        : severity === "warning"
                        ? "text-warning"
                        : "text-blue-500";

                      // Get scope and position market from metadata
                      const scope = alert.alert_metadata?.scope as string | undefined || "account";
                      const positionMarket = alert.alert_metadata?.position_market as string | undefined;

                      // Get subaccount name
                      const subaccount = subaccounts.find(s => s.id === alert.subaccount_id);
                      const subaccountName = subaccount
                        ? (subaccount.nickname || `${subaccount.address.slice(0, 8)}...${subaccount.address.slice(-6)}`)
                        : null;

                      return (
                        <div key={alert.id} className="flex items-start gap-2 p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors">
                          <div className={`rounded-lg p-1.5 flex-shrink-0 ${iconBgColor}`}>
                            <Bell className={`h-3.5 w-3.5 ${iconColor}`} />
                          </div>
                          <div className="flex-1 min-w-0 space-y-1">
                            {/* Rule name as title */}
                            {ruleName && (
                              <div className="text-sm font-semibold">
                                {ruleName}
                              </div>
                            )}

                            {/* Badges row */}
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {conditionType && (
                                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                                  {conditionLabels[conditionType] || conditionType}
                                </Badge>
                              )}
                              <Badge
                                variant={
                                  severity === "critical"
                                    ? "destructive"
                                    : severity === "warning"
                                    ? "warning"
                                    : "default"
                                }
                                className="text-[10px] px-1.5 py-0"
                              >
                                {severity}
                              </Badge>
                              <Badge
                                variant="outline"
                                className={`text-[10px] px-1.5 py-0 border ${
                                  scope === "position"
                                    ? "border-purple-600/30 text-foreground dark:border-purple-400/30"
                                    : "border-blue-600/30 text-foreground dark:border-blue-400/30"
                                }`}
                              >
                                {scope === "position" ? "Position Level" : "Account Level"}
                              </Badge>
                              {positionMarket && (
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0 flex items-center gap-1">
                                  <Activity className="h-2.5 w-2.5" />
                                  {positionMarket}
                                </Badge>
                              )}
                              {subaccountName && (
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                  {subaccountName}
                                </Badge>
                              )}
                            </div>

                            {/* Description */}
                            {alert.description && (
                              <div className="text-xs text-muted-foreground italic">
                                {alert.description}
                              </div>
                            )}

                            {/* Timestamp */}
                            <p className="text-xs text-muted-foreground">
                              {formatAlertDate(alert.created_at)}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Active Alert Rules */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-semibold">Active Alert Rules</h2>
                  <Link href="/alert-rules" className="text-xs text-primary hover:underline flex items-center gap-1">
                    View all
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
                {alertRules.filter(r => r.enabled && !r.archived).length === 0 ? (
                  <div className="text-center py-8 text-xs text-muted-foreground">
                    No active alert rules configured.
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-[400px] overflow-y-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-muted [&::-webkit-scrollbar-thumb]:bg-muted-foreground/20 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:hover:bg-muted-foreground/30">
                    {alertRules.filter(r => r.enabled && !r.archived).slice(0, 5).map((rule) => {
                      // Get subaccount name
                      const subaccount = subaccounts.find(s => s.id === rule.subaccount_id);
                      const subaccountName = subaccount
                        ? (subaccount.nickname || `${subaccount.address.slice(0, 8)}...${subaccount.address.slice(-6)}`)
                        : null;

                      // Condition type labels
                      const conditionLabels: Record<string, string> = {
                        "liquidation_distance": "Liquidation Distance",
                        "margin_ratio": "Margin Ratio",
                        "equity_drop": "Equity",
                        "position_size": "Position Size",
                        "free_collateral": "Free Collateral",
                        "position_pnl_percent": "Position PnL %",
                        "position_pnl_usd": "Position PnL",
                        "position_size_usd": "Position Size",
                        "position_liquidation_distance": "Position Liquidation Distance",
                        "position_leverage": "Position Leverage",
                        "position_size_contracts": "Position Size (Contracts)",
                        "position_entry_price": "Entry Price",
                        "position_oracle_price": "Oracle Price",
                        "position_funding_payment": "Funding Payment"
                      };

                      const getSeverityIcon = () => {
                        const severity = rule.alert_severity.toLowerCase();
                        if (severity === "critical") {
                          return (
                            <div className="rounded-lg bg-destructive/10 p-1.5 flex-shrink-0">
                              <ShieldAlert className="h-3.5 w-3.5 text-destructive" />
                            </div>
                          );
                        } else if (severity === "warning") {
                          return (
                            <div className="rounded-lg bg-warning/10 p-1.5 flex-shrink-0">
                              <AlertCircle className="h-3.5 w-3.5 text-warning" />
                            </div>
                          );
                        }
                        return (
                          <div className="rounded-lg bg-blue-500/10 p-1.5 flex-shrink-0">
                            <Bell className="h-3.5 w-3.5 text-blue-500" />
                          </div>
                        );
                      };

                      return (
                        // <Link key={rule.id} href="/alert-rules">
                          <div key={rule.id} className="flex items-start gap-2 p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors">
                            {getSeverityIcon()}
                            <div className="flex-1 min-w-0 space-y-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-sm font-semibold">{rule.name}</span>
                                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                                  {conditionLabels[rule.condition_type] || rule.condition_type}
                                </Badge>
                                <Badge
                                  variant="outline"
                                  className={`text-[10px] px-1.5 py-0 border ${
                                    rule.enabled
                                      ? "border-green-600/30 text-foreground dark:border-green-400/30"
                                      : "border-muted-foreground/30 text-muted-foreground"
                                  }`}
                                >
                                  {rule.enabled ? "Active" : "Paused"}
                                </Badge>
                                <Badge
                                  variant="outline"
                                  className={`text-[10px] px-1.5 py-0 border ${
                                    rule.scope === "position"
                                      ? "border-purple-600/30 text-foreground dark:border-purple-400/30"
                                      : "border-blue-600/30 text-foreground dark:border-blue-400/30"
                                  }`}
                                >
                                  {rule.scope === "position" ? "Position Level" : "Account Level"}
                                </Badge>
                                {rule.position_market && (
                                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 flex items-center gap-1">
                                    <Activity className="h-2.5 w-2.5" />
                                    {rule.position_market}
                                  </Badge>
                                )}
                                {subaccountName && (
                                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                    {subaccountName}
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground italic">
                                {rule.description || "No description available"}
                              </p>
                            </div>
                          </div>
                        // </Link>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Notification Channels */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold">Notification Channels</h2>
                <Link href="/channels" className="text-xs text-primary hover:underline flex items-center gap-1">
                  Manage
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
              {channels.length === 0 ? (
                <div className="text-center py-8 text-xs text-muted-foreground">
                  No notification channels configured.
                </div>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                  {(() => {
                    // Group channels by type
                    const grouped = channels.reduce((acc: Record<string, typeof channels>, channel) => {
                      if (!acc[channel.channel_type]) {
                        acc[channel.channel_type] = [];
                      }
                      acc[channel.channel_type].push(channel);
                      return acc;
                    }, {});

                    // Display unique channel types with counts
                    return Object.entries(grouped).map(([type, typeChannels]) => {
                      const totalCount = typeChannels.length;

                      return (
                        <div
                          key={type}
                          className="p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <Bell className="h-4 w-4 text-primary" />
                            <p className="text-xs font-medium capitalize truncate">{type}</p>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {totalCount === 1 ? "Configured" : `${totalCount} configured`}
                          </p>
                        </div>
                      );
                    });
                  })()}
                </div>
              )}
            </CardContent>
          </Card>
        </main>
    </div>
  );
}

function StatCard({
  label,
  value,
  subtitle,
  icon: Icon,
  variant,
  href,
}: {
  label: string;
  value: number;
  subtitle: string;
  icon: any;
  variant?: "destructive" | "warning";
  href?: string;
}) {
  const content = (
    <Card className="hover:bg-card/80 transition-colors cursor-pointer">
      <CardContent className="p-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-2xl font-semibold mt-1">{value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
          </div>
          <div className={`p-2 rounded-lg ${variant === "destructive" ? "bg-destructive/10" : variant === "warning" ? "bg-warning/10" : "bg-primary/10"}`}>
            <Icon className={`h-4 w-4 ${variant === "destructive" ? "text-destructive" : variant === "warning" ? "text-warning" : "text-primary"}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return href ? <Link href={href}>{content}</Link> : content;
}

function SubaccountRow({ subaccount }: { subaccount: any }) {
  const router = useRouter();
  const [isExpanded, setIsExpanded] = useState(true);

  const { data: status } = useQuery({
    queryKey: ["subaccount-status", subaccount.id],
    queryFn: () => fetchSubaccountStatus(subaccount.id),
    staleTime: 10_000,
    refetchInterval: 15_000,
  });

  const metrics = status?.metrics;
  const statusBadge = status?.status?.toLowerCase() ?? "unknown";
  const positionCount = metrics?.position_metrics ? Object.keys(metrics.position_metrics).length : 0;

  const formatCurrency = (val: number | null | undefined) => {
    if (val == null) return "—";
    return `$${val.toFixed(2)}`;
  };

  const formatPercent = (val: number | null | undefined) => {
    if (val == null) return "—";
    return `${val.toFixed(1)}%`;
  };

  const formatNumber = (val: number | string | null | undefined, decimals: number = 2) => {
    if (val == null) return "—";
    const num = typeof val === "string" ? parseFloat(val) : val;
    if (isNaN(num)) return "—";
    return num.toFixed(decimals);
  };

  // Get position details
  const positionDetails = metrics?.position_metrics
    ? Object.entries(metrics.position_metrics).map(([market, posMetrics]: [string, any]) => {
        const rawPosition: any = metrics.positions?.[market] ?? {};
        const size = typeof rawPosition.size === 'string' ? parseFloat(rawPosition.size) : (rawPosition.size ?? posMetrics?.size ?? 0);
        const side = size >= 0 ? "LONG" : "SHORT";
        const entryPrice = typeof rawPosition.entryPrice === 'string' ? parseFloat(rawPosition.entryPrice) : (rawPosition.entryPrice ?? posMetrics?.entry_price);
        const unrealizedPnl = typeof rawPosition.unrealizedPnl === 'string' ? parseFloat(rawPosition.unrealizedPnl) : (rawPosition.unrealizedPnl ?? posMetrics?.unrealized_pnl);
        const positionValue = posMetrics?.position_value ?? (Math.abs(size) * (entryPrice || 0));

        // Use appropriate liquidation price based on margin mode
        const marginMode = (posMetrics?.margin_mode || 'CROSS').toUpperCase();
        const liquidationPrice = marginMode === 'ISOLATED'
          ? posMetrics?.isolated_liquidation_price
          : posMetrics?.cross_liquidation_price;

        return {
          market,
          side,
          size: Math.abs(size),
          positionValue: Math.abs(positionValue),
          entryPrice,
          unrealizedPnl,
          leverage: posMetrics?.leverage_on_equity,
          liquidationPrice,
          marginMode,
        };
      })
    : [];

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <div
        onClick={() => router.push(`/subaccounts/${subaccount.id}`)}
        className="flex items-center justify-between p-3 hover:bg-muted/50 transition-colors cursor-pointer"
      >
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium truncate">{subaccount.nickname || "Unnamed"}</p>
            <Badge variant={statusBadge === "safe" ? "default" : statusBadge === "warning" ? "warning" : statusBadge === "critical" ? "destructive" : "secondary"} className="text-xs">
              {statusBadge}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground font-mono truncate">
            {subaccount.address.slice(0, 20)}...#{subaccount.subaccount_number}
          </p>
        </div>

        <div className="flex items-center gap-4 ml-4">
          <div className="text-right hidden sm:block">
            <p className="text-xs text-muted-foreground">Equity</p>
            <p className="text-xs font-medium">{formatCurrency(metrics?.equity)}</p>
          </div>
          <div className="text-right hidden md:block">
            <p className="text-xs text-muted-foreground">Margin Ratio</p>
            <p className="text-xs font-medium">{metrics?.margin_ratio != null ? `${metrics.margin_ratio.toFixed(2)}x` : "—"}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Liq. Distance</p>
            <p className="text-xs font-medium">{formatPercent(metrics?.liquidation_distance_percent)}</p>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (positionCount > 0) setIsExpanded(!isExpanded);
            }}
            className={`text-right flex items-center gap-1 ${positionCount > 0 ? 'hover:bg-muted rounded px-2 py-1' : ''}`}
            disabled={positionCount === 0}
          >
            <div>
              <p className="text-xs text-muted-foreground">Positions</p>
              <p className="text-xs font-medium">{positionCount}</p>
            </div>
            {positionCount > 0 && (
              <ChevronDown className={`h-3 w-3 text-muted-foreground transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
            )}
          </button>
          <Button
            size="sm"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/alert-rules?subaccount=${subaccount.id}`);
            }}
            className="text-xs h-8 px-2"
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Positions Section */}
      {isExpanded && positionCount > 0 && (
        <div className="bg-muted/20 border-t border-border p-3">
          <p className="text-xs font-medium text-muted-foreground mb-2">Open Positions</p>
          <div className="space-y-1.5">
            {positionDetails.map((position) => (
              <div key={position.market} className="flex items-center justify-between p-2 rounded bg-card border border-border text-xs">
                <div className="flex items-center gap-2 flex-1">
                  <Badge
                    variant={position.side === "LONG" ? "success" : "destructive"}
                    className="text-xs px-1.5 py-0"
                  >
                    {position.side}
                  </Badge>
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                    {position.marginMode}
                  </Badge>
                  <span className="font-medium">{position.market}</span>
                  <span className="text-muted-foreground">Size: {formatCurrency(position.positionValue)}</span>
                </div>
                <div className="flex items-center gap-4 text-right">
                  <div>
                    <span className="text-muted-foreground">Entry: </span>
                    <span>{formatCurrency(position.entryPrice)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Liq: </span>
                    <span>{formatCurrency(position.liquidationPrice)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Leverage: </span>
                    <span>{formatNumber(position.leverage, 2)}x</span>
                  </div>
                  <div className={position.unrealizedPnl && position.unrealizedPnl >= 0 ? "text-success" : "text-destructive"}>
                    <span className="text-muted-foreground">PnL: </span>
                    <span>{formatCurrency(position.unrealizedPnl)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ActiveMarketsCard({ subaccounts, markets }: { subaccounts: any[]; markets: any }) {
  // Fetch status for all subaccounts at component level using useQueries
  const statusQueries = useQueries({
    queries: subaccounts.map((subaccount) => ({
      queryKey: ["subaccount-status", subaccount.id],
      queryFn: () => fetchSubaccountStatus(subaccount.id),
      staleTime: 10_000,
      refetchInterval: 15_000,
    })),
  });

  // Collect all unique markets with positions across all subaccounts
  const activeMarkets = useMemo(() => {
    const marketMap = new Map<string, any[]>();

    subaccounts.forEach((subaccount, index) => {
      const status = statusQueries[index]?.data;

      if (status?.metrics?.position_metrics) {
        Object.entries(status.metrics.position_metrics).forEach(([market, _posMetrics]: [string, any]) => {
          if (!marketMap.has(market)) {
            marketMap.set(market, []);
          }
          marketMap.get(market)!.push({
            subaccount,
            metrics: _posMetrics,
            position: status.metrics?.positions?.[market],
          });
        });
      }
    });

    return Array.from(marketMap.entries()).map(([market, positions]) => {
      const marketData = markets?.[market];
      return {
        market,
        marketData,
        positions,
      };
    });
  }, [subaccounts, statusQueries, markets]);

  const formatCurrency = (val: number | string | null | undefined) => {
    if (val == null) return "—";
    const num = typeof val === "string" ? parseFloat(val) : val;
    if (isNaN(num)) return "—";
    return `$${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatPercent = (val: number | string | null | undefined) => {
    if (val == null) return "—";
    const num = typeof val === "string" ? parseFloat(val) : val;
    if (isNaN(num)) return "—";
    return `${num.toFixed(2)}%`;
  };

  if (activeMarkets.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <BarChart3 className="h-5 w-5 text-primary" />
          <h2 className="text-sm font-semibold">Active Markets</h2>
          <Badge variant="secondary" className="text-xs">{activeMarkets.length}</Badge>
        </div>
        <div className="space-y-2 max-h-[500px] overflow-y-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-muted [&::-webkit-scrollbar-thumb]:bg-muted-foreground/20 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:hover:bg-muted-foreground/30">
          {activeMarkets.map(({ market, marketData, positions }) => {
            const oraclePrice = marketData?.oraclePrice ? parseFloat(marketData.oraclePrice) : null;
            const priceChange = marketData?.priceChange24H ? parseFloat(marketData.priceChange24H) : null;
            const fundingRate = marketData?.nextFundingRate ? parseFloat(marketData.nextFundingRate) : null;

            // Calculate aggregate position data
            let totalPnL = 0;
            let totalLeverage = 0;
            let minLiquidationDistance: number | null = Infinity;
            positions.forEach(({ metrics }) => {
              if (metrics?.unrealized_pnl) totalPnL += metrics.unrealized_pnl;
              if (metrics?.leverage_on_equity) totalLeverage += metrics.leverage_on_equity;
              if (metrics?.liquidation_distance_percent !== null && metrics?.liquidation_distance_percent !== undefined) {
                minLiquidationDistance = Math.min(minLiquidationDistance as number, metrics.liquidation_distance_percent);
              }
            });
            if (minLiquidationDistance === Infinity) minLiquidationDistance = null;

            return (
              <div key={market} className="p-3 rounded-lg border border-border bg-muted/20">
                <div className="flex-1">
                  {/* Market header with market data */}
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-semibold">{market}</span>
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                      {positions.length} position{positions.length > 1 ? 's' : ''}
                    </Badge>
                  </div>

                  {/* Market data only */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-muted-foreground mb-2">
                    <div>
                      <span className="text-muted-foreground">Oracle: </span>
                      <span className="font-medium text-foreground">{formatCurrency(oraclePrice)}</span>
                    </div>
                    {priceChange !== null && (
                      <div>
                        <span className="text-muted-foreground">24h: </span>
                        <span className={`font-medium ${priceChange >= 0 ? 'text-success' : 'text-destructive'}`}>
                          {priceChange >= 0 ? '+' : ''}{formatPercent(priceChange)}
                        </span>
                      </div>
                    )}
                    {fundingRate !== null && (
                      <div>
                        <span className="text-muted-foreground">Funding: </span>
                        <span className={`font-medium ${fundingRate >= 0 ? 'text-success' : 'text-destructive'}`}>
                          {(fundingRate * 100).toFixed(4)}%
                        </span>
                      </div>
                    )}
                    {marketData?.volume24H && (
                      <div>
                        <span className="text-muted-foreground">24h Vol: </span>
                        <span className="font-medium text-foreground">{formatCurrency(parseFloat(marketData.volume24H))}</span>
                      </div>
                    )}
                  </div>

                  {/* Show individual positions with user data only */}
                  <div className="space-y-1">
                    {positions.map(({ subaccount, metrics, position }) => {
                      const size = typeof position?.size === 'string' ? parseFloat(position.size) : (position?.size || 0);
                      const side = size >= 0 ? 'LONG' : 'SHORT';
                      const entryPrice = metrics?.entry_price || null;
                      const unrealizedPnl = metrics?.unrealized_pnl || null;
                      const leverage = metrics?.leverage_on_equity || null;
                      const liqDist = metrics?.liquidation_distance_percent || null;

                      return (
                        <div key={`${subaccount.id}-${market}`} className="flex items-center justify-between text-xs py-1 px-2 rounded bg-muted/30">
                          <div className="flex items-center gap-2">
                            <Badge variant={side === 'LONG' ? 'success' : 'destructive'} className="text-[10px] px-1.5 py-0">
                              {side}
                            </Badge>
                            <span className="text-muted-foreground font-mono text-[10px]">
                              {subaccount.nickname || `${subaccount.address}#${subaccount.subaccount_number}`}
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            {entryPrice !== null && (
                              <div>
                                <span className="text-muted-foreground">Entry: </span>
                                <span>{formatCurrency(entryPrice)}</span>
                              </div>
                            )}
                            {unrealizedPnl !== null && (
                              <div className={unrealizedPnl >= 0 ? 'text-success' : 'text-destructive'}>
                                <span className="text-muted-foreground">PnL: </span>
                                <span>{formatCurrency(unrealizedPnl)}</span>
                              </div>
                            )}
                            {leverage !== null && (
                              <div>
                                <span className="text-muted-foreground">Lev: </span>
                                <span>{leverage.toFixed(2)}x</span>
                              </div>
                            )}
                            {liqDist !== null && (
                              <div className={liqDist <= 5 ? 'text-destructive' : liqDist <= 10 ? 'text-warning' : ''}>
                                <span className="text-muted-foreground">Liq Dist: </span>
                                <span>{liqDist.toFixed(1)}%</span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
