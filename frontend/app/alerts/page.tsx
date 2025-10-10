"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchAlerts, fetchCurrentUser, deleteAlerts, clearAllAlerts } from "@/lib/api";
import { AlertItem } from "@/lib/types";
import { useData } from "@/lib/data-provider";
import { Badge } from "@/components/ui/badge";
import { Header } from "@/components/header";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle, Search, X, MessageSquare, Bell, Mail, Webhook, Send, Plus, Trash2, Activity, TrendingDown, TrendingUp, Scale, DollarSign, Target, Package, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Banner as BannerComponent, BannerKind } from "@/components/banner";
import { Checkbox } from "@/components/ui/checkbox";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatAlertDate } from "@/lib/timezone";
import { ConfirmDialog } from "@/components/confirm-dialog";

type Banner = { kind: BannerKind; message: string } | null;

export default function AlertsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { subaccounts } = useData();

  const {
    data: alerts = [],
    isLoading: alertsLoading,
  } = useQuery({
    queryKey: ["alerts"],
    queryFn: fetchAlerts,
    staleTime: 10_000,
    refetchInterval: 15_000, // Auto-refresh every 15s
  });

  const {
    data: currentUser,
    error: currentUserError,
  } = useQuery({ queryKey: ["current-user"], queryFn: fetchCurrentUser, retry: false });

  const [globalBanner, setGlobalBanner] = useState<Banner>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [subaccountFilter, setSubaccountFilter] = useState<string>("all");
  const [positionFilter, setPositionFilter] = useState<string>("all");
  const [selectedAlert, setSelectedAlert] = useState<AlertItem | null>(null);
  const [selectedAlertIds, setSelectedAlertIds] = useState<string[]>([]);
  const [selectionMode, setSelectionMode] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<"deleteSelected" | "clearAll" | null>(null);

  const deleteSelectedMutation = useMutation({
    mutationFn: deleteAlerts,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["alerts"] });
      setSelectedAlertIds([]);
      setGlobalBanner({ kind: "success", message: `Deleted ${data.deleted_count} alert(s) successfully` });
    },
    onError: (error: Error) => {
      setGlobalBanner({ kind: "error", message: error.message });
    },
  });

  const clearAllMutation = useMutation({
    mutationFn: clearAllAlerts,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["alerts"] });
      setGlobalBanner({ kind: "success", message: `Cleared ${data.deleted_count} alert(s) successfully` });
    },
    onError: (error: Error) => {
      setGlobalBanner({ kind: "error", message: error.message });
    },
  });

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedAlertIds(filteredAlerts.map(a => a.id));
    } else {
      setSelectedAlertIds([]);
    }
  };

  const handleSelectAlert = (alertId: string, checked: boolean) => {
    if (checked) {
      setSelectedAlertIds([...selectedAlertIds, alertId]);
    } else {
      setSelectedAlertIds(selectedAlertIds.filter(id => id !== alertId));
    }
  };

  const handleDeleteSelected = () => {
    if (selectedAlertIds.length === 0) return;
    setConfirmDialog("deleteSelected");
  };

  const handleClearAll = () => {
    setConfirmDialog("clearAll");
  };

  const confirmDeleteSelected = () => {
    deleteSelectedMutation.mutate(selectedAlertIds);
  };

  const confirmClearAll = () => {
    clearAllMutation.mutate();
  };

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

  // Extract unique position markets from alerts metadata
  const uniquePositionMarkets = Array.from(
    new Set(
      alerts
        .flatMap(alert => {
          // First try explicit position_market field
          const explicitMarket = alert.alert_metadata?.position_market as string | undefined;
          if (explicitMarket) return [explicitMarket];

          // Fallback: check position_metrics for markets
          const positionMetrics = alert.alert_metadata?.position_metrics;
          if (positionMetrics && typeof positionMetrics === 'object') {
            return Object.keys(positionMetrics);
          }

          // Fallback: check if scope is position and extract from positions
          const scope = alert.alert_metadata?.scope as string | undefined;
          const positions = alert.alert_metadata?.positions;
          if (scope === "position" && positions && typeof positions === 'object') {
            return Object.keys(positions);
          }

          return [];
        })
        .filter((market): market is string => !!market)
    )
  ).sort();

  const filteredAlerts = alerts.filter((alert) => {
    const matchesSearch = searchQuery === "" ||
      alert.message.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSeverity = severityFilter === "all" ||
      alert.severity.toLowerCase() === severityFilter.toLowerCase();
    const matchesType = typeFilter === "all" ||
      alert.alert_type.toLowerCase().includes(typeFilter.toLowerCase());
    const matchesSubaccount = subaccountFilter === "all" ||
      alert.subaccount_id === subaccountFilter;

    // Check position filter with fallback logic
    const matchesPosition = positionFilter === "all" || (() => {
      // Try explicit position_market field first
      const explicitMarket = alert.alert_metadata?.position_market as string | undefined;
      if (explicitMarket === positionFilter) return true;

      // Fallback: check if position is in position_metrics
      const positionMetrics = alert.alert_metadata?.position_metrics;
      if (positionMetrics && typeof positionMetrics === 'object') {
        if (positionFilter in positionMetrics) return true;
      }

      // Fallback: check if position is in positions
      const positions = alert.alert_metadata?.positions;
      if (positions && typeof positions === 'object') {
        if (positionFilter in positions) return true;
      }

      return false;
    })();

    return matchesSearch && matchesSeverity && matchesType && matchesSubaccount && matchesPosition;
  });

  const severityCounts = alerts.reduce((acc, alert) => {
    const severity = alert.severity.toLowerCase();
    acc[severity] = (acc[severity] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const typeCounts = alerts.reduce((acc, alert) => {
    const type = alert.alert_type.toLowerCase();
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="min-h-screen flex flex-col">
      <Header user={currentUser} onLogout={handleLogout} />

      <main className="flex-1 p-4 md:p-6 space-y-4 overflow-auto max-w-7xl w-full mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Alert History</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Track all liquidation warnings and critical notifications
            </p>
          </div>
          <Link href="/alert-rules">
            <Button size="sm" className="flex items-center gap-1.5">
              <Plus className="h-4 w-4" />
              Manage Alert Rules
            </Button>
          </Link>
        </div>

        {globalBanner && (
          <BannerComponent kind={globalBanner.kind} message={globalBanner.message} />
        )}

        {/* Stats */}
        <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
          <StatCard label="Total Alerts" value={alerts.length} icon={AlertCircle} />
          <StatCard
            label="Critical"
            value={severityCounts.critical || 0}
            variant="destructive"
            icon={AlertCircle}
          />
          <StatCard
            label="Warnings"
            value={severityCounts.warning || 0}
            variant="warning"
            icon={AlertCircle}
          />
          <StatCard
            label="Info"
            value={severityCounts.info || 0}
            icon={AlertCircle}
          />
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-3">
            <div className="flex flex-col gap-2">
              <div className="flex flex-col md:flex-row gap-2">
                <div className="flex-1 relative">
                  <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Search alerts..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 text-xs h-8"
                  />
                </div>
                <Select value={severityFilter} onValueChange={setSeverityFilter}>
                  <SelectTrigger className="w-full md:w-32 text-xs h-8">
                    <SelectValue placeholder="Severity" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Severity</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                    <SelectItem value="warning">Warning</SelectItem>
                    <SelectItem value="info">Info</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-full md:w-40 text-xs h-8">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {Object.keys(typeCounts).sort().map(type => (
                      <SelectItem key={type} value={type}>
                        {type.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col md:flex-row gap-2">
                <Select value={subaccountFilter} onValueChange={setSubaccountFilter}>
                  <SelectTrigger className="w-full md:flex-1 text-xs h-8">
                    <SelectValue placeholder="Subaccount" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Subaccounts</SelectItem>
                    {subaccounts.map((subaccount) => (
                      <SelectItem key={subaccount.id} value={subaccount.id}>
                        {subaccount.nickname || `${subaccount.address.slice(0, 8)}...`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={positionFilter} onValueChange={setPositionFilter}>
                  <SelectTrigger className="w-full md:flex-1 text-xs h-8">
                    <SelectValue placeholder="Position" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Positions</SelectItem>
                    {uniquePositionMarkets.map((market) => (
                      <SelectItem key={market} value={market}>
                        {market}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {(searchQuery || severityFilter !== "all" || typeFilter !== "all" || subaccountFilter !== "all" || positionFilter !== "all") && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSearchQuery("");
                      setSeverityFilter("all");
                      setTypeFilter("all");
                      setSubaccountFilter("all");
                      setPositionFilter("all");
                    }}
                    className="h-8"
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Alerts List */}
        <Card>
          <CardContent className="p-4">
            {/* Action buttons */}
            {alerts.length > 0 && (
              <div className="flex items-center justify-end mb-3">
                <div className="flex items-center gap-2">
                  {selectionMode ? (
                    <>
                      {selectedAlertIds.length > 0 && (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={handleDeleteSelected}
                          disabled={deleteSelectedMutation.isPending}
                          className="flex items-center gap-1.5"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Delete Selected ({selectedAlertIds.length})
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleClearAll}
                        disabled={clearAllMutation.isPending}
                        className="flex items-center gap-1.5"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Clear All
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setSelectionMode(false);
                          setSelectedAlertIds([]);
                        }}
                        className="flex items-center gap-1.5"
                      >
                        <X className="h-3.5 w-3.5" />
                        Cancel
                      </Button>
                    </>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectionMode(true)}
                      className="flex items-center gap-1.5"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Remove
                    </Button>
                  )}
                </div>
              </div>
            )}
            {alertsLoading ? (
              <div className="text-center py-12 text-xs text-muted-foreground">
                Loading alerts...
              </div>
            ) : filteredAlerts.length === 0 ? (
              <div className="text-center py-12">
                {alerts.length === 0 ? (
                  <div className="flex flex-col items-center">
                    <div className="rounded-full bg-success/10 p-4 mb-3">
                      <AlertCircle className="h-8 w-8 text-success" />
                    </div>
                    <p className="text-sm font-medium mb-1">All Clear!</p>
                    <p className="text-xs text-muted-foreground mb-4">
                      No alerts yet. Your subaccounts are healthy.
                    </p>
                    <Link href="/subaccounts">
                      <Button size="sm" variant="outline">
                        View Subaccounts
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="flex flex-col items-center">
                    <Search className="h-8 w-8 text-muted-foreground mb-3" />
                    <p className="text-xs text-muted-foreground">
                      No matching alerts. Try adjusting your filters.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {filteredAlerts.map((alert) => (
                  <AlertRow
                    key={alert.id}
                    alert={alert}
                    selected={selectedAlertIds.includes(alert.id)}
                    onSelect={(checked) => handleSelectAlert(alert.id, checked)}
                    onClick={() => setSelectedAlert(alert)}
                    selectionMode={selectionMode}
                    subaccounts={subaccounts}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Alert Details Dialog */}
        <Dialog open={!!selectedAlert} onOpenChange={(open) => !open && setSelectedAlert(null)}>
          <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
            <DialogHeader>
              <DialogTitle>Alert Details</DialogTitle>
              <DialogDescription>
                {selectedAlert && formatAlertDate(selectedAlert.created_at)}
              </DialogDescription>
            </DialogHeader>

            {selectedAlert && (
              <div className="space-y-4 mt-4 overflow-y-auto pr-2 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-muted [&::-webkit-scrollbar-thumb]:bg-muted-foreground/20 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:hover:bg-muted-foreground/30">
                {/* Badges */}
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge
                    variant={
                      selectedAlert.alert_type.toLowerCase().includes("liquidation")
                        ? "destructive"
                        : selectedAlert.alert_type.toLowerCase().includes("adl")
                        ? "warning"
                        : "secondary"
                    }
                  >
                    {selectedAlert.alert_type}
                  </Badge>
                  <Badge
                    variant={
                      selectedAlert.severity.toLowerCase() === "critical"
                        ? "destructive"
                        : selectedAlert.severity.toLowerCase() === "warning"
                        ? "warning"
                        : "default"
                    }
                  >
                    {selectedAlert.severity}
                  </Badge>
                </div>

                {/* Message */}
                <div>
                  <h3 className="text-sm font-medium mb-2">Message</h3>
                  <div className="p-3 rounded-lg bg-muted/30 border border-border">
                    <div
                      className="text-sm whitespace-pre-line"
                      dangerouslySetInnerHTML={{
                        __html: selectedAlert.message
                          .replace(/&/g, '&amp;')
                          .replace(/</g, '&lt;')
                          .replace(/>/g, '&gt;')
                          .replace(/&lt;b&gt;/g, '<b>')
                          .replace(/&lt;\/b&gt;/g, '</b>')
                          .replace(/&lt;i&gt;/g, '<i>')
                          .replace(/&lt;\/i&gt;/g, '</i>')
                          .replace(/&lt;u&gt;/g, '<u>')
                          .replace(/&lt;\/u&gt;/g, '</u>')
                          .replace(/&lt;a href='([^']+)'&gt;([^&]+)&lt;\/a&gt;/g, '<a href="$1" class="text-blue-500 hover:underline" target="_blank" rel="noopener noreferrer">$2</a>')
                      }}
                    />
                  </div>
                </div>

                {/* Channels */}
                {selectedAlert.channels_sent && selectedAlert.channels_sent.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium mb-2">Notification Channels</h3>
                    <div className="flex gap-2 flex-wrap">
                      {selectedAlert.channels_sent.map((channel, idx) => {
                        const Icon = channelIcons[channel] || MessageSquare;
                        return (
                          <div
                            key={idx}
                            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 border border-border"
                          >
                            <Icon className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm capitalize">{channel}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Metadata */}
                {selectedAlert.alert_metadata && Object.keys(selectedAlert.alert_metadata).length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium mb-2">Alert Metadata</h3>
                    <JSONViewer data={selectedAlert.alert_metadata} />
                  </div>
                )}

                {/* Alert ID */}
                <div>
                  <h3 className="text-sm font-medium mb-2">Alert ID</h3>
                  <code className="text-xs bg-muted/30 px-2 py-1 rounded border border-border">
                    {selectedAlert.id}
                  </code>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Confirm Dialogs */}
        <ConfirmDialog
          open={confirmDialog === "deleteSelected"}
          onOpenChange={(open) => !open && setConfirmDialog(null)}
          title="Delete Selected Alerts"
          description={`Are you sure you want to delete ${selectedAlertIds.length} selected alert(s)? This action cannot be undone.`}
          onConfirm={confirmDeleteSelected}
          confirmText="Delete"
          variant="destructive"
          isLoading={deleteSelectedMutation.isPending}
        />

        <ConfirmDialog
          open={confirmDialog === "clearAll"}
          onOpenChange={(open) => !open && setConfirmDialog(null)}
          title="Clear All Alerts"
          description="Are you sure you want to clear all alerts? This action cannot be undone."
          onConfirm={confirmClearAll}
          confirmText="Clear All"
          variant="destructive"
          isLoading={clearAllMutation.isPending}
        />
      </main>
    </div>
  );
}

function StatCard({
  label,
  value,
  variant,
  icon: Icon,
}: {
  label: string;
  value: number;
  variant?: "destructive" | "warning";
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="bg-card rounded-lg border border-border p-3">
      <div className="flex items-center justify-between mb-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        <Icon className={`h-3.5 w-3.5 ${variant === "destructive" ? "text-destructive" : variant === "warning" ? "text-warning" : "text-muted-foreground"}`} />
      </div>
      <p className={`text-xl font-semibold ${variant === "destructive" ? "text-destructive" : variant === "warning" ? "text-warning" : ""}`}>
        {value}
      </p>
    </div>
  );
}

const channelIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  telegram: Send,
  discord: MessageSquare,
  slack: MessageSquare,
  pagerduty: Bell,
  email: Mail,
  webhook: Webhook,
};

function AlertRow({ alert, selected, onSelect, onClick, selectionMode, subaccounts }: { alert: AlertItem; selected: boolean; onSelect: (checked: boolean) => void; onClick: () => void; selectionMode: boolean; subaccounts: any[] }) {
  const getAlertTypeIcon = () => {
    const type = alert.alert_type.toLowerCase();

    // Map alert types to icons
    let Icon = Bell; // default icon

    if (type.includes("liquidation") || type.includes("liquidation_distance")) {
      Icon = AlertCircle;
    } else if (type.includes("adl")) {
      Icon = Activity;
    } else if (type.includes("margin_ratio")) {
      Icon = Scale;
    } else if (type.includes("equity")) {
      Icon = DollarSign;
    } else if (type.includes("position_size")) {
      Icon = Package;
    } else if (type.includes("free_collateral")) {
      Icon = DollarSign;
    } else if (type.includes("pnl")) {
      Icon = type.includes("percent") ? TrendingUp : DollarSign;
    } else if (type.includes("leverage")) {
      Icon = Target;
    } else if (type.includes("price")) {
      Icon = TrendingDown;
    } else if (type.includes("funding")) {
      Icon = Zap;
    }

    return Icon;
  };

  const getAlertIcon = () => {
    const Icon = getAlertTypeIcon();
    const severity = alert.severity.toLowerCase();

    const bgColor = severity === "critical"
      ? "bg-destructive/20"
      : severity === "warning"
      ? "bg-warning/20"
      : "bg-blue-500/20";

    const iconColor = severity === "critical"
      ? "text-destructive"
      : severity === "warning"
      ? "text-warning"
      : "text-blue-500";

    return (
      <div className={`rounded-lg p-2 flex-shrink-0 ${bgColor}`}>
        <Icon className={`h-3.5 w-3.5 ${iconColor}`} />
      </div>
    );
  };

  const getAlertTypeBadge = () => {
    const type = alert.alert_type.toLowerCase();
    if (type.includes("liquidation")) {
      return <Badge variant="destructive" className="text-xs">Liquidation</Badge>;
    } else if (type.includes("adl")) {
      return <Badge variant="warning" className="text-xs">ADL</Badge>;
    } else if (type.includes("rule_")) {
      // Extract condition type from rule alerts
      const conditionType = type.replace("rule_", "");
      const conditionLabels: Record<string, string> = {
        "liquidation_distance": "Liquidation Distance",
        "margin_ratio": "Margin Ratio",
        "equity_drop": "Equity",
        "position_size": "Position Size",
        "free_collateral": "Free Collateral",
        "position_pnl_percent": "Position PnL %",
        "position_pnl_usd": "Position PnL USD",
        "position_size_usd": "Position Size USD",
        "position_liquidation_distance": "Position Liq. Distance",
        "position_leverage": "Position Leverage",
        "position_size_contracts": "Position Size (Contracts)"
      };
      const label = conditionLabels[conditionType] || conditionType;
      return <Badge variant="secondary" className="text-xs">{label}</Badge>;
    }
    return <Badge variant="secondary" className="text-xs">{alert.alert_type}</Badge>;
  };

  // Extract data from metadata
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
    "position_pnl_usd": "Position PnL USD",
    "position_size_usd": "Position Size USD",
    "position_liquidation_distance": "Position Liq. Distance",
    "position_leverage": "Position Leverage",
    "position_size_contracts": "Position Size (Contracts)"
  };

  // Get scope and position market from metadata
  const scope = alert.alert_metadata?.scope as string | undefined || "account";
  const positionMarket = alert.alert_metadata?.position_market as string | undefined;

  // Find the subaccount for this alert
  const subaccount = subaccounts.find(s => s.id === alert.subaccount_id);
  const subaccountName = subaccount
    ? (subaccount.nickname || `${subaccount.address.slice(0, 8)}...${subaccount.address.slice(-6)}`)
    : null;

  return (
    <div
      className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/30 transition-colors border border-border"
    >
      {selectionMode && (
        <Checkbox
          checked={selected}
          onCheckedChange={onSelect}
          onClick={(e) => e.stopPropagation()}
          className="mt-0.5"
        />
      )}
      <div
        className="flex items-start gap-3 flex-1 cursor-pointer"
        onClick={onClick}
      >
        {getAlertIcon()}
      <div className="flex-1 min-w-0 space-y-1">
        {/* Rule name as title */}
        {ruleName && (
          <div className="text-sm font-semibold">
            {ruleName}
          </div>
        )}

        {/* Badges row */}
        <div className="flex items-start gap-1.5 flex-wrap">
          {conditionType && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
              {conditionLabels[conditionType] || conditionType}
            </Badge>
          )}
          <Badge
            variant={
              alert.severity.toLowerCase() === "critical"
                ? "destructive"
                : alert.severity.toLowerCase() === "warning"
                ? "warning"
                : "default"
            }
            className="text-[10px] px-1.5 py-0"
          >
            {alert.severity.toLowerCase()}
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

        {alert.channels_sent && alert.channels_sent.length > 0 && (
          <div className="flex items-center gap-2 pt-1">
            <span className="text-xs text-muted-foreground">Sent via:</span>
            <div className="flex gap-1">
              {alert.channels_sent.map((channel, idx) => {
                const Icon = channelIcons[channel] || MessageSquare;
                return (
                  <div
                    key={idx}
                    className="flex items-center gap-1 px-2 py-0.5 rounded bg-muted/50"
                  >
                    <Icon className="h-3 w-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground capitalize">{channel}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
      </div>
    </div>
  );
}

function JSONViewer({ data }: { data: any }) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const toggleExpand = (path: string) => {
    setExpanded(prev => ({ ...prev, [path]: !prev[path] }));
  };

  const renderValue = (value: any, key: string, path: string = "", depth: number = 0): React.ReactNode => {
    const indent = depth * 16;
    const currentPath = path ? `${path}.${key}` : key;
    const isExpanded = expanded[currentPath] !== false; // Default to expanded

    if (value === null) {
      return (
        <div key={currentPath} style={{ marginLeft: `${indent}px` }} className="font-mono text-xs">
          <span className="text-blue-500">&quot;{key}&quot;</span>: <span className="text-gray-500">null</span>
        </div>
      );
    }

    if (typeof value === 'boolean') {
      return (
        <div key={currentPath} style={{ marginLeft: `${indent}px` }} className="font-mono text-xs">
          <span className="text-blue-500">&quot;{key}&quot;</span>: <span className="text-orange-500">{value.toString()}</span>
        </div>
      );
    }

    if (typeof value === 'number') {
      return (
        <div key={currentPath} style={{ marginLeft: `${indent}px` }} className="font-mono text-xs">
          <span className="text-blue-500">&quot;{key}&quot;</span>: <span className="text-green-600 dark:text-green-400">{value}</span>
        </div>
      );
    }

    if (typeof value === 'string') {
      return (
        <div key={currentPath} style={{ marginLeft: `${indent}px` }} className="font-mono text-xs">
          <span className="text-blue-500">&quot;{key}&quot;</span>: <span className="text-amber-600 dark:text-amber-400">&quot;{value}&quot;</span>
        </div>
      );
    }

    if (Array.isArray(value)) {
      if (value.length === 0) {
        return (
          <div key={currentPath} style={{ marginLeft: `${indent}px` }} className="font-mono text-xs">
            <span className="text-blue-500">&quot;{key}&quot;</span>: []
          </div>
        );
      }
      return (
        <div key={currentPath}>
          <div style={{ marginLeft: `${indent}px` }} className="font-mono text-xs">
            <button
              onClick={() => toggleExpand(currentPath)}
              className="text-blue-500 hover:bg-muted/50 px-1 rounded"
            >
              <span className="text-muted-foreground">{isExpanded ? '▼' : '▶'}</span> &quot;{key}&quot;
            </button>: <span className="text-muted-foreground">[</span>
          </div>
          {isExpanded && value.map((item, index) => (
            renderValue(item, index.toString(), currentPath, depth + 1)
          ))}
          {isExpanded && (
            <div style={{ marginLeft: `${indent}px` }} className="font-mono text-xs text-muted-foreground">]</div>
          )}
        </div>
      );
    }

    if (typeof value === 'object') {
      const entries = Object.entries(value);
      if (entries.length === 0) {
        return (
          <div key={currentPath} style={{ marginLeft: `${indent}px` }} className="font-mono text-xs">
            <span className="text-blue-500">&quot;{key}&quot;</span>: {'{'}
{'}'}
          </div>
        );
      }
      return (
        <div key={currentPath}>
          <div style={{ marginLeft: `${indent}px` }} className="font-mono text-xs">
            <button
              onClick={() => toggleExpand(currentPath)}
              className="text-blue-500 hover:bg-muted/50 px-1 rounded"
            >
              <span className="text-muted-foreground">{isExpanded ? '▼' : '▶'}</span> &quot;{key}&quot;
            </button>: <span className="text-muted-foreground">{'{'}</span>
          </div>
          {isExpanded && entries.map(([k, v]) => renderValue(v, k, currentPath, depth + 1))}
          {isExpanded && (
            <div style={{ marginLeft: `${indent}px` }} className="font-mono text-xs text-muted-foreground">{'}'}</div>
          )}
        </div>
      );
    }

    return null;
  };

  return (
    <div className="p-3 rounded-lg bg-muted/30 border border-border overflow-auto max-h-96 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-muted [&::-webkit-scrollbar-thumb]:bg-muted-foreground/20 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:hover:bg-muted-foreground/30">
      <div className="font-mono text-xs text-muted-foreground">{'{'}</div>
      {Object.entries(data).map(([key, value]) => renderValue(value, key, '', 1))}
      <div className="font-mono text-xs text-muted-foreground">{'}'}</div>
    </div>
  );
}
