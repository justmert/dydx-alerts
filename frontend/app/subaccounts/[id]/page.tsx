"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchCurrentUser,
  fetchSubaccountStatus,
  updateSubaccount,
  deleteSubaccount,
  fetchAlertRules,
} from "@/lib/api";
import { Header } from "@/components/header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { AlertCircle, ArrowLeft, Plus, Bell, Pencil, Check, X, ChevronRight, Activity, ShieldAlert, Scale, TrendingDown, DollarSign, TrendingUp, Target, Package } from "lucide-react";
import { useData } from "@/lib/data-provider";
import Link from "next/link";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Banner as BannerComponent, BannerKind } from "@/components/banner";

type Banner = { kind: BannerKind; message: string } | null;

function parseNumber(value: any): number | undefined {
  if (value == null) return undefined;
  const num = typeof value === "string" ? parseFloat(value) : Number(value);
  return isNaN(num) ? undefined : num;
}

function formatCurrency(value: number | null | undefined): string {
  if (value == null) return "—";
  return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatNumber(value: number | null | undefined, decimals: number = 2): string {
  if (value == null) return "—";
  return value.toFixed(decimals);
}

function formatMetric(value: number | null | undefined, suffix: string): string {
  if (value == null) return "—";
  return `${value.toFixed(2)}${suffix}`;
}

export default function SubaccountDetailPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const router = useRouter();
  const queryClient = useQueryClient();
  const { markets: marketsData, subaccounts, removeSubaccount } = useData();

  const [globalBanner, setGlobalBanner] = useState<Banner>(null);
  const [isEditingNickname, setIsEditingNickname] = useState(false);
  const [banner, setBanner] = useState<Banner>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showArchivedRules, setShowArchivedRules] = useState(false);

  const subaccount = subaccounts.find((s) => s.id === id);

  const [nickname, setNickname] = useState(subaccount?.nickname ?? "");
  const [isActive, setIsActive] = useState(subaccount?.is_active ?? true);

  useEffect(() => {
    if (subaccount) {
      setNickname(subaccount.nickname ?? "");
      setIsActive(subaccount.is_active ?? true);
    }
  }, [subaccount]);

  const { data: status, isLoading: statusLoading } = useQuery({
    queryKey: ["subaccount-status", id],
    queryFn: () => fetchSubaccountStatus(id),
    staleTime: 10_000,
    refetchInterval: 15_000,
  });

  const { data: alertRules = [] } = useQuery({
    queryKey: ["alert-rules"],
    queryFn: fetchAlertRules,
    staleTime: 30_000,
  });

  const {
    data: currentUser,
    error: currentUserError,
  } = useQuery({ queryKey: ["current-user"], queryFn: fetchCurrentUser, retry: false });

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
      setGlobalBanner({ kind: "error", message: "Failed to log out." });
      return;
    }
    router.push("/login");
    router.refresh();
  };

  const updateMutation = useMutation({
    mutationFn: (payload: Parameters<typeof updateSubaccount>[1]) =>
      updateSubaccount(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subaccounts"] });
      setBanner({ kind: "success", message: "Subaccount updated." });
    },
    onError: (error: Error) =>
      setBanner({ kind: "error", message: error.message }),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteSubaccount(id),
    onSuccess: async () => {
      // Immediately remove from cache using data provider
      removeSubaccount(id);

      // Navigate away
      router.push("/subaccounts");

      // Invalidate to sync with server in background
      queryClient.invalidateQueries({ queryKey: ["subaccounts"] });
    },
    onError: (error: Error) =>
      setBanner({ kind: "error", message: error.message }),
  });

  const handleSaveNickname = () => {
    updateMutation.mutate({
      nickname: nickname.trim() || null,
      liquidation_threshold_percent: subaccount.liquidation_threshold_percent,
      is_active: subaccount.is_active,
    });
    setIsEditingNickname(false);
  };

  const handleCancelNickname = () => {
    setNickname(subaccount?.nickname ?? "");
    setIsEditingNickname(false);
  };

  const handleDelete = () => {
    setShowDeleteConfirm(true);
  };

  const confirmDelete = () => {
    deleteMutation.mutate();
    setShowDeleteConfirm(false);
  };

  if (!subaccount) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header user={currentUser} onLogout={handleLogout} />
        <main className="flex-1 p-4 md:p-6 max-w-7xl w-full mx-auto">
          <div className="text-center py-12">
            <p className="text-muted-foreground">Subaccount not found.</p>
            <Link href="/subaccounts">
              <Button className="mt-4" size="sm">Back to Subaccounts</Button>
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const metrics = status?.metrics;
  const statusBadge = status?.status?.toLowerCase() ?? "unknown";

  // Filter alert rules for this subaccount (both specific and global rules)
  const relevantRules = alertRules.filter(rule => {
    const matchesSubaccount = rule.subaccount_id === null || rule.subaccount_id === id;
    const matchesArchived = showArchivedRules || !rule.archived;
    return matchesSubaccount && matchesArchived;
  });

  return (
    <div className="min-h-screen flex flex-col">
      <Header user={currentUser} onLogout={handleLogout} />

      <main className="flex-1 p-4 md:p-6 space-y-4 overflow-auto max-w-7xl w-full mx-auto">
        {globalBanner && (
          <BannerComponent kind={globalBanner.kind} message={globalBanner.message} />
        )}

        {banner && (
          <BannerComponent kind={banner.kind} message={banner.message} />
        )}

        <div className="flex items-center gap-2">
          <Link href="/subaccounts">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
          </Link>
        </div>

        {/* Header Card */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                {isEditingNickname ? (
                  <div className="flex items-center gap-2">
                    <Input
                      value={nickname}
                      onChange={(e) => setNickname(e.target.value)}
                      placeholder="Enter nickname"
                      className="h-8 text-sm max-w-xs"
                      autoFocus
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0"
                      onClick={handleSaveNickname}
                      disabled={updateMutation.isPending}
                    >
                      <Check className="h-4 w-4 text-success" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0"
                      onClick={handleCancelNickname}
                    >
                      <X className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <p className="text-lg font-semibold truncate">{nickname || subaccount.nickname || "Unnamed"}</p>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0 opacity-60 hover:opacity-100"
                      onClick={() => setIsEditingNickname(true)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
                <p className="text-sm text-muted-foreground font-mono truncate">
                  {subaccount.address} #{subaccount.subaccount_number}
                </p>
              </div>
              <Badge variant={statusBadge === "safe" ? "success" : statusBadge === "warning" ? "warning" : statusBadge === "critical" ? "destructive" : "secondary"}>
                {statusBadge}
              </Badge>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-border">
              <div className="flex items-center gap-2">
                <Switch
                  id="active"
                  checked={isActive}
                  onCheckedChange={(checked) => {
                    setIsActive(checked);
                    updateMutation.mutate({
                      nickname: nickname.trim() || null,
                      liquidation_threshold_percent: subaccount.liquidation_threshold_percent,
                      is_active: checked,
                    });
                  }}
                />
                <Label htmlFor="active" className="text-sm">
                  {isActive ? "Active" : "Paused"}
                </Label>
              </div>
              <div className="flex gap-2">
                <Link href={`/alert-rules?subaccount=${id}`}>
                  <Button size="sm" variant="outline">
                    <Bell className="h-3.5 w-3.5 mr-1" />
                    Add Alert Rule
                  </Button>
                </Link>
                <Button size="sm" variant="destructive" onClick={handleDelete} disabled={deleteMutation.isPending}>
                  Delete
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Account Metrics */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <h2 className="text-sm font-semibold">Account Metrics</h2>
            {statusLoading ? (
              <div className="text-center py-4 text-xs text-muted-foreground">Loading metrics...</div>
            ) : metrics ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <MetricCard label="Equity" value={formatCurrency(metrics.equity)} />
                <MetricCard label="Free Collateral" value={formatCurrency(metrics.free_collateral)} />
                <MetricCard label="Initial Req." value={formatCurrency(metrics.initial_requirement)} />
                <MetricCard label="Maintenance Req." value={formatCurrency(metrics.maintenance_requirement)} />
                <MetricCard label="Margin Ratio" value={formatMetric(metrics.margin_ratio, "x")} />
                <MetricCard label="Liq. Distance" value={formatMetric(metrics.liquidation_distance_percent, "%")} />
                <MetricCard label="Initial Margin" value={metrics.initial_margin_percent != null ? `${metrics.initial_margin_percent.toFixed(2)}%` : "—"} />
                <MetricCard label="Maintenance Margin" value={metrics.maintenance_margin_percent != null ? `${metrics.maintenance_margin_percent.toFixed(2)}%` : "—"} />
              </div>
            ) : (
              <div className="text-center py-4 text-xs text-muted-foreground">No metrics available</div>
            )}
          </CardContent>
        </Card>

        {/* Open Positions */}
        {metrics?.position_metrics && Object.keys(metrics.position_metrics).length > 0 && (
          <Card>
            <CardContent className="p-4 space-y-3">
              <h2 className="text-sm font-semibold">Open Positions</h2>
              <div className="space-y-3">
                {Object.entries(metrics.position_metrics).map(([market, posMetrics]: [string, any]) => {
                  const rawPosition: any = metrics.positions?.[market] ?? {};
                  const size = parseNumber(rawPosition.size) ?? posMetrics?.size ?? 0;
                  const entryPrice = parseNumber(rawPosition.entryPrice) ?? posMetrics?.entry_price ?? 0;
                  const oraclePrice = posMetrics?.oracle_price ?? parseNumber(rawPosition.oraclePrice) ?? entryPrice;
                  const positionValue = posMetrics?.position_value ?? (oraclePrice && size ? Math.abs(size) * oraclePrice : undefined);
                  const side = size >= 0 ? "LONG" : "SHORT";
                  const unrealizedPnl = parseNumber(rawPosition.unrealizedPnl) ?? posMetrics?.unrealized_pnl;
                  const pnlPercent = unrealizedPnl !== undefined && metrics.equity && metrics.equity > 0
                    ? (unrealizedPnl / metrics.equity) * 100
                    : undefined;
                  const leverage = posMetrics?.leverage_on_equity;
                  const funding = parseNumber(rawPosition.netFunding) ?? posMetrics?.funding_payment;
                  const realizedPnl = parseNumber(rawPosition.realizedPnl) ?? posMetrics?.realized_pnl ?? 0;

                  // Use appropriate liquidation price based on margin mode
                  const marginMode = (posMetrics?.margin_mode || 'CROSS').toUpperCase();
                  const liquidationPrice = marginMode === 'ISOLATED'
                    ? posMetrics?.isolated_liquidation_price
                    : posMetrics?.cross_liquidation_price;

                  return (
                    <div key={market} className="bg-muted/30 rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-base font-semibold">{market}</span>
                          <Badge variant={side === "LONG" ? "success" : "destructive"}>
                            {side}
                          </Badge>
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                            {marginMode}
                          </Badge>
                        </div>
                        <div className="text-right">
                          <p className={`text-base font-semibold ${unrealizedPnl != null && unrealizedPnl >= 0 ? 'text-success' : 'text-destructive'}`}>
                            {unrealizedPnl != null ? (
                              <>
                                {unrealizedPnl >= 0 ? '+' : '−'}${Math.abs(unrealizedPnl).toFixed(2)}
                                {pnlPercent != null && (
                                  <span className="text-sm ml-1">
                                    ({pnlPercent >= 0 ? '+' : ''}{pnlPercent.toFixed(0)}%)
                                  </span>
                                )}
                              </>
                            ) : '—'}
                          </p>
                          <p className="text-xs text-muted-foreground">Unrealized PnL</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <MetricCard label="Leverage" value={leverage ? `${leverage.toFixed(2)}×` : '—'} />
                        <MetricCard label="Size" value={formatNumber(size, 3)} />
                        <MetricCard label="Value" value={formatCurrency(positionValue)} />
                        <MetricCard label="Avg. Open" value={formatCurrency(entryPrice)} />
                        <MetricCard label="Oracle" value={formatCurrency(oraclePrice)} />
                        <MetricCard label="Funding" value={funding != null ? `${funding >= 0 ? '+' : '−'}$${Math.abs(funding).toFixed(2)}` : '—'} />
                        <MetricCard label="Realized PnL" value={`${realizedPnl >= 0 ? '+' : ''}$${Math.abs(realizedPnl).toFixed(2)}`} />
                        <MetricCard label="Liquidation" value={formatCurrency(liquidationPrice)} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Alert Rules Section */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-semibold">Alert Rules</h2>
                <Badge variant="outline" className="text-xs">
                  {relevantRules.length} {relevantRules.length === 1 ? 'rule' : 'rules'}
                </Badge>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowArchivedRules(!showArchivedRules)}
                className="text-xs h-7"
              >
                {showArchivedRules ? "Hide Archived" : "Show Archived"}
              </Button>
            </div>

            {relevantRules.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-xs text-muted-foreground mb-3">
                  {showArchivedRules ? "No archived alert rules" : "No alert rules configured for this subaccount"}
                </p>
                <Link href={`/alert-rules?subaccount=${id}`}>
                  <Button size="sm" variant="outline">
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    Create Alert Rule
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-muted [&::-webkit-scrollbar-thumb]:bg-muted-foreground/20 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:hover:bg-muted-foreground/30">
                {relevantRules.map((rule) => {
                  // Map condition type to icon
                  const getConditionIcon = () => {
                    if (rule.condition_type === "liquidation_distance" || rule.condition_type === "position_liquidation_distance") return ShieldAlert;
                    if (rule.condition_type === "margin_ratio") return Scale;
                    if (rule.condition_type === "equity_drop") return TrendingDown;
                    if (rule.condition_type === "position_size" || rule.condition_type === "position_size_usd" || rule.condition_type === "position_size_contracts") return Package;
                    if (rule.condition_type === "free_collateral") return DollarSign;
                    if (rule.condition_type === "position_pnl_percent" || rule.condition_type === "position_pnl_usd") return TrendingUp;
                    if (rule.condition_type === "position_leverage") return Target;
                    return Bell;
                  };
                  const Icon = getConditionIcon();

                  const conditionLabels: Record<string, string> = {
                    "liquidation_distance": "Liquidation Distance",
                    "margin_ratio": "Margin Ratio",
                    "equity_drop": "Equity",
                    "position_size": "Position Size",
                    "free_collateral": "Free Collateral",
                    "position_pnl_percent": "Position PnL %",
                    "position_pnl_usd": "Position PnL",
                    "position_size_usd": "Position Size",
                    "position_size_contracts": "Position Size (Contracts)",
                    "position_liquidation_distance": "Position Liquidation Distance",
                    "position_leverage": "Position Leverage",
                    "position_entry_price": "Entry Price",
                    "position_oracle_price": "Oracle Price",
                    "position_funding_payment": "Funding Payment"
                  };

                  return (
                    <Link key={rule.id} href="/alert-rules" className="block">
                      <div className={`p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors cursor-pointer ${
                        rule.archived ? "opacity-50" : ""
                      }`}>
                        <div className="flex items-start gap-3">
                          <div className={`p-2 rounded-lg flex-shrink-0 ${
                            rule.archived || !rule.enabled
                              ? "bg-muted/50"
                              : rule.alert_severity === "critical"
                              ? "bg-destructive/20"
                              : rule.alert_severity === "warning"
                              ? "bg-warning/20"
                              : "bg-blue-500/20"
                          }`}>
                            <Icon className={`h-4 w-4 ${
                              rule.archived || !rule.enabled
                                ? "text-muted-foreground"
                                : rule.alert_severity === "critical"
                                ? "text-destructive"
                                : rule.alert_severity === "warning"
                                ? "text-warning"
                                : "text-blue-500"
                            }`} />
                          </div>

                          <div className="flex-1 min-w-0 space-y-1.5">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-sm font-medium">{rule.name}</p>
                              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                                {conditionLabels[rule.condition_type] || rule.condition_type}
                              </Badge>
                              {rule.archived ? (
                                <Badge
                                  variant="outline"
                                  className="text-[10px] px-1.5 py-0 border border-muted-foreground/30 text-muted-foreground"
                                >
                                  Archived
                                </Badge>
                              ) : (
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
                              )}
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
                              {rule.subaccount_id === null && (
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                  Global
                                </Badge>
                              )}
                            </div>

                            <p className="text-xs text-muted-foreground italic">
                              {rule.description || "No description available"}
                            </p>
                          </div>
                        </div>
                      </div>
                    </Link>
                  );
                })}
                <Link href={`/alert-rules?subaccount=${id}`}>
                  <Button size="sm" variant="outline" className="w-full mt-2">
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    Add Another Rule
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      <ConfirmDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        title="Delete Subaccount"
        description="Are you sure you want to delete this subaccount? This action cannot be undone."
        onConfirm={confirmDelete}
        confirmText="Delete"
        variant="destructive"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  );
}
