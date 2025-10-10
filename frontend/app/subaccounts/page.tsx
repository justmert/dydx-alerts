"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchCurrentUser, fetchSubaccountStatus, createSubaccount, fetchAlertRules, validateSubaccountAddress } from "@/lib/api";
import { Header } from "@/components/header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, Plus, X, ChevronDown, ChevronRight, Activity, Bell } from "lucide-react";
import { useData } from "@/lib/data-provider";
import { Banner as BannerComponent, BannerKind } from "@/components/banner";

type Banner = { kind: BannerKind; message: string } | null;

export default function SubaccountsPage() {
  const queryClient = useQueryClient();
  const router = useRouter();

  const { subaccounts, isLoading: subaccountsLoading, addSubaccount: addSubaccountToCache } = useData();

  const {
    data: currentUser,
    error: currentUserError,
  } = useQuery({ queryKey: ["current-user"], queryFn: fetchCurrentUser, retry: false });

  const { data: alertRules = [] } = useQuery({
    queryKey: ["alert-rules"],
    queryFn: fetchAlertRules,
    staleTime: 30_000,
  });

  const [subaccountForm, setSubaccountForm] = useState({
    address: "",
    subaccountNumber: 0,
    nickname: "",
    threshold: 10,
  });

  const [banner, setBanner] = useState<Banner>(null);
  const [globalBanner, setGlobalBanner] = useState<Banner>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [isValidating, setIsValidating] = useState(false);

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

  const createSubaccountMutation = useMutation({
    mutationFn: createSubaccount,
    onSuccess: async (data) => {
      setBanner({ kind: "success", message: "Subaccount added." });

      // IMPORTANT: Prefetch status FIRST with same config as the query in SubaccountTableRow
      if (data?.id) {
        await queryClient.prefetchQuery({
          queryKey: ["subaccount-status", data.id],
          queryFn: () => fetchSubaccountStatus(data.id),
          staleTime: 10_000, // Match the staleTime in SubaccountTableRow
        });
      }

      // Now add to cache - status data is ready and cached with proper config
      if (data) {
        addSubaccountToCache(data);
      }

      // Invalidate subaccounts to sync with server in background
      queryClient.invalidateQueries({ queryKey: ["subaccounts"] });

      setSubaccountForm({ address: "", subaccountNumber: 0, nickname: "", threshold: 10 });
      setShowAddForm(false);
    },
    onError: (error: Error) =>
      setBanner({ kind: "error", message: error.message }),
  });

  const handleAddSubaccount = async () => {
    if (!subaccountForm.address.trim()) {
      setBanner({ kind: "error", message: "Address is required" });
      return;
    }

    // Validate address via dYdX Indexer
    setIsValidating(true);
    setBanner(null);

    try {
      await validateSubaccountAddress(
        subaccountForm.address.trim(),
        subaccountForm.subaccountNumber
      );

      // If validation succeeds, create the subaccount
      createSubaccountMutation.mutate({
        address: subaccountForm.address.trim(),
        subaccount_number: subaccountForm.subaccountNumber,
        nickname: subaccountForm.nickname.trim() || null,
        liquidation_threshold_percent: subaccountForm.threshold,
      });
    } catch (error: any) {
      setBanner({
        kind: "error",
        message: error.message || "Address validation failed. Please verify the address and subaccount number."
      });
    } finally {
      setIsValidating(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header user={currentUser} onLogout={handleLogout} />

      <main className="flex-1 p-4 md:p-6 space-y-4 overflow-auto max-w-7xl w-full mx-auto">
        {globalBanner && (
          <BannerComponent kind={globalBanner.kind} message={globalBanner.message} />
        )}

        {banner && (
          <BannerComponent kind={banner.kind} message={banner.message} onDismiss={() => setBanner(null)} />
        )}

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Monitored Subaccounts</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Track and manage your dYdX v4 subaccounts for real-time liquidation monitoring
            </p>
          </div>
          <Button size="sm" onClick={() => setShowAddForm(!showAddForm)}>
            <Plus className="h-4 w-4 mr-1.5" />
            Add Subaccount
          </Button>
        </div>

        {/* Add Subaccount Form */}
        {showAddForm && (
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold">Add New Subaccount</h2>
                <button onClick={() => setShowAddForm(false)}>
                  <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                </button>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor="address" className="text-xs">dYdX Address</Label>
                  <Input
                    id="address"
                    placeholder="dydx1..."
                    value={subaccountForm.address}
                    onChange={(e) => setSubaccountForm({ ...subaccountForm, address: e.target.value })}
                    className="text-sm h-9 font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="subaccountNumber" className="text-xs">Subaccount Number</Label>
                  <Input
                    id="subaccountNumber"
                    type="number"
                    min={0}
                    value={subaccountForm.subaccountNumber}
                    onChange={(e) => setSubaccountForm({ ...subaccountForm, subaccountNumber: Number(e.target.value) })}
                    className="text-sm h-9"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="nickname" className="text-xs">Nickname (optional)</Label>
                  <Input
                    id="nickname"
                    placeholder="My Trading Account"
                    value={subaccountForm.nickname}
                    onChange={(e) => setSubaccountForm({ ...subaccountForm, nickname: e.target.value })}
                    className="text-sm h-9"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button size="sm" variant="outline" onClick={() => setShowAddForm(false)} disabled={isValidating || createSubaccountMutation.isPending}>
                  Cancel
                </Button>
                <Button size="sm" onClick={handleAddSubaccount} disabled={isValidating || createSubaccountMutation.isPending}>
                  {isValidating ? "Validating..." : createSubaccountMutation.isPending ? "Adding..." : "Add"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Subaccounts Table */}
        <Card>
          <CardContent className="p-0">
            {subaccountsLoading ? (
              <div className="text-center py-12 text-sm text-muted-foreground">Loading subaccounts...</div>
            ) : subaccounts.length === 0 ? (
              <div className="flex flex-col items-center py-12">
                <div className="rounded-full bg-primary/10 p-4 mb-3">
                  <Activity className="h-8 w-8 text-primary" />
                </div>
                <p className="text-sm font-medium mb-1">No Subaccounts Yet</p>
                <p className="text-xs text-muted-foreground mb-4">
                  Add your first subaccount to start real-time liquidation monitoring
                </p>
                <Button size="sm" onClick={() => setShowAddForm(true)}>
                  <Plus className="h-4 w-4 mr-1.5" />
                  Add Subaccount
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b border-border bg-muted/30">
                    <tr>
                      <th className="text-left p-3 font-medium text-xs text-muted-foreground">Account</th>
                      <th className="text-right p-3 font-medium text-xs text-muted-foreground">Equity</th>
                      <th className="text-right p-3 font-medium text-xs text-muted-foreground">Margin Ratio</th>
                      <th className="text-right p-3 font-medium text-xs text-muted-foreground">Liq. Distance</th>
                      <th className="text-center p-3 font-medium text-xs text-muted-foreground">Positions</th>
                      <th className="text-center p-3 font-medium text-xs text-muted-foreground">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subaccounts.map((subaccount) => (
                      <SubaccountTableRow
                        key={subaccount.id}
                        subaccount={subaccount}
                        alertRules={alertRules}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

function SubaccountTableRow({ subaccount, alertRules }: { subaccount: any; alertRules: any[] }) {
  const router = useRouter();
  const [isExpanded, setIsExpanded] = useState(true);

  // Count active (non-archived) alert rules for this subaccount
  const alertRuleCount = alertRules.filter(rule => rule.subaccount_id === subaccount.id && !rule.archived).length;

  const { data: status } = useQuery({
    queryKey: ["subaccount-status", subaccount.id],
    queryFn: () => fetchSubaccountStatus(subaccount.id),
    staleTime: 10_000,
    refetchInterval: 15_000,
  });

  const metrics = status?.metrics;
  const statusBadge = status?.status?.toLowerCase() ?? "unknown";
  const positionCount = metrics?.position_metrics ? Object.keys(metrics.position_metrics).length : 0;

  const formatCurrency = (val: number | string | null | undefined) => {
    if (val == null) return "—";
    const num = typeof val === "string" ? parseFloat(val) : val;
    if (isNaN(num)) return "—";
    return `$${num.toFixed(2)}`;
  };

  const formatPercent = (val: number | string | null | undefined) => {
    if (val == null) return "—";
    const num = typeof val === "string" ? parseFloat(val) : val;
    if (isNaN(num)) return "—";
    return `${num.toFixed(1)}%`;
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

  const handleRowClick = (e: React.MouseEvent) => {
    // Check if click is on the expand button
    const target = e.target as HTMLElement;
    if (target.closest('.expand-button')) {
      e.stopPropagation();
      setIsExpanded(!isExpanded);
    } else {
      router.push(`/subaccounts/${subaccount.id}`);
    }
  };

  return (
    <>
      <tr
        onClick={handleRowClick}
        className="border-b border-border hover:bg-muted/30 transition-colors cursor-pointer"
      >
        <td className="p-3">
          <div className="flex items-center gap-2">
            {positionCount > 0 && (
              <button
                className="expand-button p-0.5 hover:bg-muted rounded"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsExpanded(!isExpanded);
                }}
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
              </button>
            )}
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium">{subaccount.nickname || "Unnamed"}</p>
                {!subaccount.is_active && (
                  <Badge variant="secondary" className="text-xs px-1.5 py-0">
                    Inactive
                  </Badge>
                )}
                {alertRuleCount > 0 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/alert-rules`);
                    }}
                    className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-primary/10 hover:bg-primary/20 transition-colors"
                  >
                    <Bell className="h-3 w-3 text-primary" />
                    <span className="text-[10px] text-primary font-medium">{alertRuleCount}</span>
                  </button>
                )}
              </div>
              <p className="text-xs text-muted-foreground font-mono truncate">
                {subaccount.address.slice(0, 16)}...#{subaccount.subaccount_number}
              </p>
            </div>
          </div>
        </td>
        <td className="p-3 text-right text-sm">{formatCurrency(metrics?.equity)}</td>
        <td className="p-3 text-right text-sm">
          {metrics?.margin_ratio != null ? `${metrics.margin_ratio.toFixed(2)}x` : "—"}
        </td>
        <td className="p-3 text-right text-sm">{formatPercent(metrics?.liquidation_distance_percent)}</td>
        <td className="p-3 text-center text-sm">{positionCount > 0 ? positionCount : "—"}</td>
        <td className="p-3 text-center">
          <Badge
            variant={
              statusBadge === "safe"
                ? "default"
                : statusBadge === "warning"
                ? "warning"
                : statusBadge === "critical"
                ? "destructive"
                : "secondary"
            }
            className="text-xs"
          >
            {statusBadge}
          </Badge>
        </td>
      </tr>
      {isExpanded && positionCount > 0 && (
        <tr className="bg-muted/20">
          <td colSpan={6} className="p-0">
            <div className="px-12 py-3">
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
          </td>
        </tr>
      )}
    </>
  );
}
