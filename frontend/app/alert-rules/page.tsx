"use client";

export const dynamic = 'force-dynamic';

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchCurrentUser,
  fetchAlertRules,
  createAlertRule,
  updateAlertRule,
  deleteAlertRule,
  fetchSubaccountStatus,
  fetchAvailablePositions,
} from "@/lib/api";
import { AlertRule, ConditionType, Comparison, AlertRuleSeverity, AlertScope } from "@/lib/types";
import { Header } from "@/components/header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  AlertCircle,
  Plus,
  Bell,
  BellOff,
  Trash2,
  ChevronRight,
  ArrowLeft,
  ShieldAlert,
  AlertTriangle,
  Info,
  TrendingDown,
  TrendingUp,
  Scale,
  DollarSign,
  Activity,
  Wallet,
  Search,
  Filter,
  X,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { useData } from "@/lib/data-provider";
import Link from "next/link";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Banner as BannerComponent, BannerKind } from "@/components/banner";

type Banner = { kind: BannerKind; message: string } | null;

const conditionConfig: Record<ConditionType, {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  placeholder: string;
  unit: string;
  defaultValue: number;
  defaultComparison: Comparison;
  scope: "account" | "position";
}> = {
  // Account-level conditions
  liquidation_distance: {
    label: "Liquidation Distance",
    icon: ShieldAlert,
    description: "Alert when liquidation distance falls below threshold",
    placeholder: "10",
    unit: "%",
    defaultValue: 10,
    defaultComparison: "<=",
    scope: "account",
  },
  margin_ratio: {
    label: "Margin Ratio",
    icon: Scale,
    description: "Alert when margin ratio falls below threshold",
    placeholder: "1.5",
    unit: "x",
    defaultValue: 1.5,
    defaultComparison: "<=",
    scope: "account",
  },
  equity_drop: {
    label: "Equity Drop",
    icon: TrendingDown,
    description: "Alert when equity drops below threshold",
    placeholder: "1000",
    unit: "USD",
    defaultValue: 1000,
    defaultComparison: "<=",
    scope: "account",
  },
  position_size: {
    label: "Position Size",
    icon: Activity,
    description: "Alert when position size exceeds threshold",
    placeholder: "10000",
    unit: "USD",
    defaultValue: 10000,
    defaultComparison: ">=",
    scope: "account",
  },
  free_collateral: {
    label: "Free Collateral",
    icon: Wallet,
    description: "Alert when free collateral falls below threshold",
    placeholder: "500",
    unit: "USD",
    defaultValue: 500,
    defaultComparison: "<=",
    scope: "account",
  },
  // Position-level conditions
  position_pnl_percent: {
    label: "Position PnL %",
    icon: TrendingDown,
    description: "Alert when position PnL % meets condition",
    placeholder: "-10",
    unit: "%",
    defaultValue: -10,
    defaultComparison: "<=",
    scope: "position",
  },
  position_pnl_usd: {
    label: "Position PnL USD",
    icon: DollarSign,
    description: "Alert when position PnL in USD meets condition",
    placeholder: "-1000",
    unit: "USD",
    defaultValue: -1000,
    defaultComparison: "<=",
    scope: "position",
  },
  position_size_usd: {
    label: "Position Size USD",
    icon: Activity,
    description: "Alert when position size meets condition",
    placeholder: "5000",
    unit: "USD",
    defaultValue: 5000,
    defaultComparison: ">=",
    scope: "position",
  },
  position_liquidation_distance: {
    label: "Position Liq. Distance",
    icon: ShieldAlert,
    description: "Alert when position liquidation distance falls below threshold",
    placeholder: "5",
    unit: "%",
    defaultValue: 5,
    defaultComparison: "<=",
    scope: "position",
  },
  position_leverage: {
    label: "Position Leverage",
    icon: Scale,
    description: "Alert when position leverage exceeds threshold",
    placeholder: "10",
    unit: "x",
    defaultValue: 10,
    defaultComparison: ">=",
    scope: "position",
  },
  position_size_contracts: {
    label: "Position Size (Contracts)",
    icon: Activity,
    description: "Alert when position size in contracts meets condition",
    placeholder: "1",
    unit: "contracts",
    defaultValue: 1,
    defaultComparison: ">=",
    scope: "position",
  },
  position_entry_price: {
    label: "Position Entry Price",
    icon: DollarSign,
    description: "Alert when entry price crosses threshold",
    placeholder: "50000",
    unit: "USD",
    defaultValue: 50000,
    defaultComparison: ">=",
    scope: "position",
  },
  position_oracle_price: {
    label: "Position Oracle Price",
    icon: TrendingUp,
    description: "Alert when oracle price crosses threshold",
    placeholder: "50000",
    unit: "USD",
    defaultValue: 50000,
    defaultComparison: ">=",
    scope: "position",
  },
};

export default function AlertRulesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { subaccounts, markets: marketsData } = useData();

  const prefillSubaccountId = searchParams?.get("subaccount") || null;

  const [globalBanner, setGlobalBanner] = useState<Banner>(null);
  const [isCreating, setIsCreating] = useState(!!prefillSubaccountId);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteRuleId, setDeleteRuleId] = useState<string | null>(null);

  // Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [conditionFilter, setConditionFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [scopeFilter, setScopeFilter] = useState<string>("all");
  const [subaccountFilter, setSubaccountFilter] = useState<string>("all");
  const [positionMarketFilter, setPositionMarketFilter] = useState<string>("all");
  const [viewArchived, setViewArchived] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [subaccountId, setSubaccountId] = useState<string | null>(prefillSubaccountId || null);
  const [scope, setScope] = useState<AlertScope>("account");
  const [positionMarket, setPositionMarket] = useState<string | null>(null);
  const [conditionType, setConditionType] = useState<ConditionType>("liquidation_distance");
  const [thresholdValue, setThresholdValue] = useState("10");
  const [comparison, setComparison] = useState<Comparison>("<=");
  const [alertSeverity, setAlertSeverity] = useState<AlertRuleSeverity>("warning");
  const [selectedChannels, setSelectedChannels] = useState<string[]>([]);
  const [enabled, setEnabled] = useState(true);
  const [checkPassed, setCheckPassed] = useState(false);
  const [checkResult, setCheckResult] = useState<{
    success: boolean;
    message: string;
    preview: any;
  } | null>(null);
  const [thresholdPrefilled, setThresholdPrefilled] = useState(false);

  const {
    data: alertRules = [],
    isLoading: rulesLoading,
  } = useQuery({
    queryKey: ["alert-rules"],
    queryFn: fetchAlertRules,
    staleTime: 30_000,
  });

  const { data: channels = [] } = useQuery({
    queryKey: ["channels"],
    queryFn: async () => {
      const { fetchChannels } = await import("@/lib/api");
      return fetchChannels();
    },
  });

  const {
    data: currentUser,
    error: currentUserError,
  } = useQuery({ queryKey: ["current-user"], queryFn: fetchCurrentUser, retry: false });

  // Fetch available positions for position-based alerts
  const { data: availablePositions } = useQuery({
    queryKey: ["available-positions", subaccountId],
    queryFn: () => fetchAvailablePositions(subaccountId || undefined),
    enabled: !!subaccountId,
    staleTime: 10_000,
  });

  // Fetch subaccount status when a subaccount is selected
  const { data: subaccountStatus } = useQuery({
    queryKey: ["subaccount-status", subaccountId],
    queryFn: () => fetchSubaccountStatus(subaccountId!),
    enabled: !!subaccountId,
    staleTime: 10_000,
    refetchInterval: 15_000,
  });

  // Reset scope to "account" if switching to position scope but no positions available
  useEffect(() => {
    if (scope === "position" && availablePositions && availablePositions.positions.length === 0) {
      setScope("account");
      setPositionMarket(null);
    }
  }, [scope, availablePositions]);

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

  const createMutation = useMutation({
    mutationFn: createAlertRule,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alert-rules"] });
      setGlobalBanner({ kind: "success", message: "Alert rule created successfully!" });
      resetForm();
      setIsCreating(false);
    },
    onError: (error: Error) =>
      setGlobalBanner({ kind: "error", message: error.message }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Parameters<typeof updateAlertRule>[1] }) =>
      updateAlertRule(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alert-rules"] });
      setGlobalBanner({ kind: "success", message: "Alert rule updated successfully!" });
      setEditingId(null);
    },
    onError: (error: Error) =>
      setGlobalBanner({ kind: "error", message: error.message }),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteAlertRule,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alert-rules"] });
      setGlobalBanner({ kind: "success", message: "Alert rule deleted." });
    },
    onError: (error: Error) =>
      setGlobalBanner({ kind: "error", message: error.message }),
  });

  const resetForm = () => {
    setName("");
    setSubaccountId(null);
    setScope("account");
    setPositionMarket(null);
    setConditionType("liquidation_distance");
    setThresholdValue("10");
    setComparison("<=");
    setAlertSeverity("warning");
    setSelectedChannels([]);
    setEnabled(true);
    setCheckPassed(false);
    setCheckResult(null);
    setThresholdPrefilled(false);
  };

  const handleCreate = () => {
    if (!name.trim()) {
      setGlobalBanner({ kind: "error", message: "Please provide a rule name." });
      return;
    }

    if (!subaccountId) {
      setGlobalBanner({ kind: "error", message: "Please select a subaccount." });
      return;
    }

    if (scope === "position" && !positionMarket) {
      setGlobalBanner({ kind: "error", message: "Please select a position for position-based alerts." });
      return;
    }

    if (selectedChannels.length === 0) {
      setGlobalBanner({ kind: "error", message: "Please select at least one notification channel." });
      return;
    }

    createMutation.mutate({
      name: name.trim(),
      subaccount_id: subaccountId,
      scope,
      position_market: scope === "position" ? positionMarket : null,
      condition_type: conditionType,
      threshold_value: parseFloat(thresholdValue) || 0,
      comparison,
      alert_severity: alertSeverity,
      channel_ids: selectedChannels,
      cooldown_seconds: 3600,
      enabled,
    });
  };

  const handleEdit = (rule: AlertRule) => {
    setEditingId(rule.id);
    setName(rule.name);
    setSubaccountId(rule.subaccount_id);
    setScope(rule.scope as AlertScope);
    setPositionMarket(rule.position_market);
    setConditionType(rule.condition_type);
    setThresholdValue(rule.threshold_value.toString());
    setComparison(rule.comparison);
    setAlertSeverity(rule.alert_severity);
    setSelectedChannels(rule.channel_ids);
    setEnabled(rule.enabled);
  };

  const handleUpdate = () => {
    if (!editingId) return;

    updateMutation.mutate({
      id: editingId,
      payload: {
        name: name.trim(),
        subaccount_id: subaccountId,
        scope,
        position_market: scope === "position" ? positionMarket : null,
        condition_type: conditionType,
        threshold_value: parseFloat(thresholdValue) || 0,
        comparison,
        alert_severity: alertSeverity,
        channel_ids: selectedChannels,
        cooldown_seconds: 3600,
        enabled,
      },
    });
  };

  const handleDelete = (id: string) => {
    setDeleteRuleId(id);
  };

  const confirmDelete = () => {
    if (deleteRuleId) {
      deleteMutation.mutate(deleteRuleId);
      setDeleteRuleId(null);
    }
  };

  const toggleChannelSelection = (channelId: string) => {
    setSelectedChannels((prev) =>
      prev.includes(channelId)
        ? prev.filter((id) => id !== channelId)
        : [...prev, channelId]
    );
  };

  // Filter condition options based on selected scope
  const conditionOptions = Object.entries(conditionConfig)
    .filter(([_, config]) => config.scope === scope)
    .map(([key, config]) => ({
      value: key,
      label: config.label,
      Icon: config.icon,
    }));

  // Reset prefilled flag when condition type or position market changes manually
  useEffect(() => {
    setThresholdPrefilled(false);
  }, [conditionType, positionMarket]);

  useEffect(() => {
    const config = conditionConfig[conditionType];
    if (!config) return;

    setComparison(config.defaultComparison);

    // Only prefill threshold once when form first opens with data
    // Don't update on subsequent data refreshes to avoid overwriting user input
    if (thresholdPrefilled) return;

    // Prefill threshold from actual user data
    let prefillValue = config.defaultValue;

    if (subaccountStatus?.metrics) {
      const metrics = subaccountStatus.metrics;

      // Account-level conditions
      if (conditionType === "liquidation_distance") {
        prefillValue = metrics.liquidation_distance_percent || config.defaultValue;
      } else if (conditionType === "margin_ratio") {
        prefillValue = metrics.margin_ratio || config.defaultValue;
      } else if (conditionType === "equity_drop") {
        prefillValue = metrics.equity || config.defaultValue;
      } else if (conditionType === "position_size") {
        const positionMetrics = metrics.position_metrics || {};
        const totalSize = Object.values(positionMetrics).reduce((sum: number, posMetrics: any) => {
          return sum + Math.abs(posMetrics?.position_value || 0);
        }, 0);
        prefillValue = totalSize || config.defaultValue;
      } else if (conditionType === "free_collateral") {
        prefillValue = metrics.free_collateral || config.defaultValue;
      }
      // Position-level conditions
      else if (positionMarket && metrics.position_metrics?.[positionMarket]) {
        const posMetrics = metrics.position_metrics[positionMarket];

        if (conditionType === "position_pnl_percent") {
          prefillValue = posMetrics.unrealized_pnl_percent || config.defaultValue;
        } else if (conditionType === "position_pnl_usd") {
          prefillValue = posMetrics.unrealized_pnl || config.defaultValue;
        } else if (conditionType === "position_size_usd") {
          prefillValue = Math.abs(posMetrics.position_value || 0) || config.defaultValue;
        } else if (conditionType === "position_size_contracts") {
          prefillValue = Math.abs(posMetrics.size || 0) || config.defaultValue;
        } else if (conditionType === "position_liquidation_distance") {
          prefillValue = posMetrics.liquidation_distance_percent || config.defaultValue;
        } else if (conditionType === "position_leverage") {
          prefillValue = posMetrics.leverage || config.defaultValue;
        } else if (conditionType === "position_entry_price") {
          prefillValue = posMetrics.entry_price || config.defaultValue;
        } else if (conditionType === "position_oracle_price") {
          prefillValue = posMetrics.oracle_price || config.defaultValue;
        }
      }

      setThresholdValue(prefillValue.toString());
      setThresholdPrefilled(true);
    }
  }, [conditionType, subaccountStatus, positionMarket, thresholdPrefilled]);

  const isFormMode = isCreating || editingId !== null;

  // Reset check when any form field changes
  useEffect(() => {
    setCheckPassed(false);
    setCheckResult(null);
  }, [subaccountId, scope, positionMarket, conditionType, thresholdValue, comparison, alertSeverity, selectedChannels]);

  // When scope changes, reset position market and switch condition type if needed
  useEffect(() => {
    if (scope === "position") {
      // Switch to a position-level condition if currently on account-level
      if (conditionConfig[conditionType].scope === "account") {
        setConditionType("position_pnl_percent");
        setThresholdPrefilled(false); // Allow prefill for new condition
      }
    } else {
      // Switch to an account-level condition if currently on position-level
      if (conditionConfig[conditionType].scope === "position") {
        setConditionType("liquidation_distance");
        setThresholdPrefilled(false); // Allow prefill for new condition
      }
      setPositionMarket(null);
    }
  }, [scope, conditionType]);

  // Generate test preview message
  const generateTestPreview = () => {
    if (!subaccountId || !subaccountStatus) return null;

    const selectedSubaccount = subaccounts.find(s => s.id === subaccountId);
    if (!selectedSubaccount) return null;

    const channelNames = selectedChannels.map(chId => {
      const channel = channels.find(c => c.id === chId);
      if (!channel) return null;

      const type = channel.channel_type;
      const config = channel.config || {};

      if (type === "telegram") return "Telegram";
      if (type === "email") return "Email";
      if (type === "discord") return "Discord";
      if (type === "slack") return "Slack";
      if (type === "pagerduty") return "PagerDuty";
      if (type === "webhook") return "Webhook";
      return type;
    }).filter(Boolean);

    const SeverityIcon = alertSeverity === "critical" ? ShieldAlert : alertSeverity === "warning" ? AlertTriangle : Info;
    const severityLabel = alertSeverity.toUpperCase();
    const accountName = selectedSubaccount.nickname || `${selectedSubaccount.address.slice(0, 6)}...${selectedSubaccount.address.slice(-4)}`;
    const threshold = parseFloat(thresholdValue) || 0;
    const metrics = subaccountStatus.metrics;

    let triggerText = "";
    let currentValueText = "";
    let additionalInfo = "";

    if (conditionType === "liquidation_distance") {
      const currentLiq = metrics?.liquidation_distance_percent || 0;
      const currentEquity = metrics?.equity || 0;
      const dropAmount = (currentEquity * threshold / 100).toFixed(2);

      triggerText = `when your ${accountName} can only drop ${threshold}% ($${dropAmount}) before liquidation`;
      currentValueText = `Current liquidation distance: ${currentLiq.toFixed(2)}%`;
      additionalInfo = currentLiq > threshold
        ? `You are currently safe with ${currentLiq.toFixed(0)}% buffer.`
        : `[TRIGGER_NOW] Alert would trigger NOW! Current ${currentLiq.toFixed(0)}% is ${comparison} ${threshold}%`;
    } else if (conditionType === "margin_ratio") {
      const currentMargin = metrics?.margin_ratio || 0;

      triggerText = `when your ${accountName} margin ratio ${comparison === "<" || comparison === "<=" ? "falls below" : "exceeds"} ${threshold}x`;
      currentValueText = `Current margin ratio: ${currentMargin.toFixed(2)}x`;
      additionalInfo = (comparison === "<" || comparison === "<=") && currentMargin > threshold
        ? `You are currently safe with ${currentMargin.toFixed(2)}x margin.`
        : (comparison === "<" || comparison === "<=") && currentMargin <= threshold
        ? `[TRIGGER_NOW] Alert would trigger NOW! Current ${currentMargin.toFixed(2)}x is ${comparison} ${threshold}x`
        : `Alert will trigger when condition is met.`;
    } else if (conditionType === "equity_drop") {
      const currentEquity = metrics?.equity || 0;

      triggerText = `when your ${accountName} equity ${comparison === "<" || comparison === "<=" ? "drops below" : "exceeds"} $${threshold.toFixed(2)}`;
      currentValueText = `Current equity: $${currentEquity.toFixed(2)}`;
      additionalInfo = (comparison === "<" || comparison === "<=") && currentEquity > threshold
        ? `You are currently safe with $${currentEquity.toFixed(2)} equity.`
        : (comparison === "<" || comparison === "<=") && currentEquity <= threshold
        ? `[TRIGGER_NOW] Alert would trigger NOW! Current $${currentEquity.toFixed(2)} is ${comparison} $${threshold.toFixed(2)}`
        : `Alert will trigger when condition is met.`;
    } else if (conditionType === "position_size") {
      const positionMetrics = metrics?.position_metrics || {};
      const totalSize = Object.values(positionMetrics).reduce((sum: number, posMetrics: any) => {
        const posValue = Math.abs(posMetrics?.position_value || 0);
        return sum + posValue;
      }, 0);

      triggerText = `when your ${accountName} total position size ${comparison === ">" || comparison === ">=" ? "exceeds" : "falls below"} $${threshold.toFixed(2)}`;
      currentValueText = `Current position size: $${totalSize.toFixed(2)}`;
      additionalInfo = (comparison === ">" || comparison === ">=") && totalSize > threshold
        ? `[TRIGGER_NOW] Alert would trigger NOW! Current $${totalSize.toFixed(2)} is ${comparison} $${threshold.toFixed(2)}`
        : (comparison === ">" || comparison === ">=") && totalSize <= threshold
        ? `You are currently within limits at $${totalSize.toFixed(2)}.`
        : `Alert will trigger when condition is met.`;
    } else if (conditionType === "free_collateral") {
      const currentFree = metrics?.free_collateral || 0;

      triggerText = `when your ${accountName} free collateral ${comparison === "<" || comparison === "<=" ? "falls below" : "exceeds"} $${threshold.toFixed(2)}`;
      currentValueText = `Current free collateral: $${currentFree.toFixed(2)}`;
      additionalInfo = (comparison === "<" || comparison === "<=") && currentFree > threshold
        ? `You are currently safe with $${currentFree.toFixed(2)} available.`
        : (comparison === "<" || comparison === "<=") && currentFree <= threshold
        ? `[TRIGGER_NOW] Alert would trigger NOW! Current $${currentFree.toFixed(2)} is ${comparison} $${threshold.toFixed(2)}`
        : `Alert will trigger when condition is met.`;
    }
    // Position-level conditions
    else if (conditionType === "position_pnl_percent") {
      if (!positionMarket) return null;
      const posMetrics = metrics?.position_metrics?.[positionMarket];
      if (!posMetrics) return null;

      const currentPnl = posMetrics.unrealized_pnl_percent || 0;
      const side = (posMetrics.size || 0) > 0 ? "LONG" : "SHORT";

      triggerText = `when your ${side} ${positionMarket} position PnL ${comparison === "<" || comparison === "<=" ? "drops below" : "exceeds"} ${threshold}%`;
      currentValueText = `Current position PnL: ${currentPnl.toFixed(2)}%`;
      additionalInfo = (comparison === "<" || comparison === "<=") && currentPnl > threshold
        ? `Position is currently profitable at ${currentPnl > 0 ? '+' : ''}${currentPnl.toFixed(2)}%.`
        : (comparison === "<" || comparison === "<=") && currentPnl <= threshold
        ? `[TRIGGER_NOW] Alert would trigger NOW! Current ${currentPnl.toFixed(2)}% is ${comparison} ${threshold}%`
        : `Alert will trigger when condition is met.`;
    } else if (conditionType === "position_pnl_usd") {
      if (!positionMarket) return null;
      const posMetrics = metrics?.position_metrics?.[positionMarket];
      if (!posMetrics) return null;

      const currentPnl = posMetrics.unrealized_pnl || 0;
      const side = (posMetrics.size || 0) > 0 ? "LONG" : "SHORT";

      triggerText = `when your ${side} ${positionMarket} position PnL ${comparison === "<" || comparison === "<=" ? "drops below" : "exceeds"} $${threshold.toFixed(2)}`;
      currentValueText = `Current position PnL: $${currentPnl.toFixed(2)}`;
      additionalInfo = (comparison === "<" || comparison === "<=") && currentPnl > threshold
        ? `Position is currently ${currentPnl > 0 ? 'profitable' : 'in loss'} at $${currentPnl.toFixed(2)}.`
        : (comparison === "<" || comparison === "<=") && currentPnl <= threshold
        ? `[TRIGGER_NOW] Alert would trigger NOW! Current $${currentPnl.toFixed(2)} is ${comparison} $${threshold.toFixed(2)}`
        : `Alert will trigger when condition is met.`;
    } else if (conditionType === "position_size_usd") {
      if (!positionMarket) return null;
      const posMetrics = metrics?.position_metrics?.[positionMarket];
      if (!posMetrics) return null;

      const currentSize = Math.abs(posMetrics.position_value || 0);
      const side = (posMetrics.size || 0) > 0 ? "LONG" : "SHORT";

      triggerText = `when your ${side} ${positionMarket} position size ${comparison === ">" || comparison === ">=" ? "exceeds" : "falls below"} $${threshold.toFixed(2)}`;
      currentValueText = `Current position size: $${currentSize.toFixed(2)}`;
      additionalInfo = (comparison === ">" || comparison === ">=") && currentSize > threshold
        ? `[TRIGGER_NOW] Alert would trigger NOW! Current $${currentSize.toFixed(2)} is ${comparison} $${threshold.toFixed(2)}`
        : (comparison === ">" || comparison === ">=") && currentSize <= threshold
        ? `Position size within limits at $${currentSize.toFixed(2)}.`
        : `Alert will trigger when condition is met.`;
    } else if (conditionType === "position_liquidation_distance") {
      if (!positionMarket) return null;
      const posMetrics = metrics?.position_metrics?.[positionMarket];
      if (!posMetrics) return null;

      const currentLiqDist = posMetrics.liquidation_distance_percent || 0;
      const side = (posMetrics.size || 0) > 0 ? "LONG" : "SHORT";

      triggerText = `when your ${side} ${positionMarket} position can only drop ${threshold}% before liquidation`;
      currentValueText = `Current liquidation distance: ${currentLiqDist.toFixed(2)}%`;
      additionalInfo = currentLiqDist > threshold
        ? `Position is safe with ${currentLiqDist.toFixed(0)}% buffer.`
        : `[TRIGGER_NOW] Alert would trigger NOW! Current ${currentLiqDist.toFixed(0)}% is ${comparison} ${threshold}%`;
    } else if (conditionType === "position_leverage") {
      if (!positionMarket) return null;
      const posMetrics = metrics?.position_metrics?.[positionMarket];
      if (!posMetrics) return null;

      const currentLeverage = posMetrics.leverage || 0;
      const side = (posMetrics.size || 0) > 0 ? "LONG" : "SHORT";

      triggerText = `when your ${side} ${positionMarket} position leverage ${comparison === ">" || comparison === ">=" ? "exceeds" : "falls below"} ${threshold}x`;
      currentValueText = `Current position leverage: ${currentLeverage.toFixed(2)}x`;
      additionalInfo = (comparison === ">" || comparison === ">=") && currentLeverage > threshold
        ? `[TRIGGER_NOW] Alert would trigger NOW! Current ${currentLeverage.toFixed(2)}x is ${comparison} ${threshold}x`
        : (comparison === ">" || comparison === ">=") && currentLeverage <= threshold
        ? `Leverage within limits at ${currentLeverage.toFixed(2)}x.`
        : `Alert will trigger when condition is met.`;
    } else if (conditionType === "position_size_contracts") {
      if (!positionMarket) return null;
      const posMetrics = metrics?.position_metrics?.[positionMarket];
      if (!posMetrics) return null;

      const currentSize = Math.abs(posMetrics.size || 0);
      const side = (posMetrics.size || 0) > 0 ? "LONG" : "SHORT";

      triggerText = `when your ${side} ${positionMarket} position size ${comparison === ">" || comparison === ">=" ? "exceeds" : "falls below"} ${threshold} contracts`;
      currentValueText = `Current position size: ${currentSize.toFixed(4)} contracts`;
      additionalInfo = (comparison === ">" || comparison === ">=") && currentSize > threshold
        ? `[TRIGGER_NOW] Alert would trigger NOW! Current ${currentSize.toFixed(4)} is ${comparison} ${threshold}`
        : (comparison === ">" || comparison === ">=") && currentSize <= threshold
        ? `Position size within limits at ${currentSize.toFixed(4)} contracts.`
        : `Alert will trigger when condition is met.`;
    } else if (conditionType === "position_entry_price") {
      if (!positionMarket) return null;
      const posMetrics = metrics?.position_metrics?.[positionMarket];
      if (!posMetrics) return null;

      const entryPrice = posMetrics.entry_price || 0;
      const side = (posMetrics.size || 0) > 0 ? "LONG" : "SHORT";

      triggerText = `when your ${side} ${positionMarket} entry price ${comparison === ">" || comparison === ">=" ? "is above" : "is below"} $${threshold.toFixed(2)}`;
      currentValueText = `Current entry price: $${entryPrice.toFixed(2)}`;
      additionalInfo = `Entry price is $${entryPrice.toFixed(2)}.`;
    } else if (conditionType === "position_oracle_price") {
      if (!positionMarket) return null;
      const posMetrics = metrics?.position_metrics?.[positionMarket];
      if (!posMetrics) return null;

      const oraclePrice = posMetrics.oracle_price || 0;
      const side = (posMetrics.size || 0) > 0 ? "LONG" : "SHORT";

      triggerText = `when ${positionMarket} oracle price ${comparison === ">" || comparison === ">=" ? "exceeds" : "falls below"} $${threshold.toFixed(2)}`;
      currentValueText = `Current oracle price: $${oraclePrice.toFixed(2)}`;
      additionalInfo = (comparison === ">" || comparison === ">=") && oraclePrice > threshold
        ? `[TRIGGER_NOW] Alert would trigger NOW! Current $${oraclePrice.toFixed(2)} is ${comparison} $${threshold.toFixed(2)}`
        : (comparison === ">" || comparison === ">=") && oraclePrice <= threshold
        ? `Oracle price is $${oraclePrice.toFixed(2)}.`
        : (comparison === "<" || comparison === "<=") && oraclePrice < threshold
        ? `[TRIGGER_NOW] Alert would trigger NOW! Current $${oraclePrice.toFixed(2)} is ${comparison} $${threshold.toFixed(2)}`
        : `Oracle price is $${oraclePrice.toFixed(2)}.`;
    }

    return {
      SeverityIcon,
      severityLabel,
      triggerText,
      currentValueText,
      channelNames,
      additionalInfo,
    };
  };

  // Check if alert rule is valid (won't trigger immediately)
  const handleCheck = () => {
    // Reset previous check
    setCheckPassed(false);
    setCheckResult(null);

    // Validate all required fields
    if (!name.trim()) {
      setCheckResult({
        success: false,
        message: "Please provide a rule name.",
        preview: null,
      });
      return;
    }

    if (!subaccountId) {
      setCheckResult({
        success: false,
        message: "Please select a subaccount.",
        preview: null,
      });
      return;
    }

    if (scope === "position" && !positionMarket) {
      setCheckResult({
        success: false,
        message: "Please select a position for position-level alerts.",
        preview: null,
      });
      return;
    }

    if (selectedChannels.length === 0) {
      setCheckResult({
        success: false,
        message: "Please select at least one notification channel.",
        preview: null,
      });
      return;
    }

    if (!subaccountStatus) {
      setCheckResult({
        success: false,
        message: "Unable to load subaccount data. Please try again.",
        preview: null,
      });
      return;
    }

    // Generate preview to check if alert would trigger now
    const preview = generateTestPreview();
    if (!preview) {
      setCheckResult({
        success: false,
        message: "Unable to generate preview. Please check your settings.",
        preview: null,
      });
      return;
    }

    // Check if alert would trigger immediately
    const wouldTriggerNow = preview.additionalInfo.includes("[TRIGGER_NOW]");

    if (wouldTriggerNow) {
      setCheckResult({
        success: false,
        message: "This alert would trigger immediately with current account values. Please adjust your threshold.",
        preview,
      });
      return;
    }

    // Check passed!
    setCheckPassed(true);
    setCheckResult({
      success: true,
      message: "Alert rule validated successfully! You can now create the rule.",
      preview,
    });
  };

  // Extract unique position markets from alert rules
  const uniquePositionMarkets = Array.from(
    new Set(
      alertRules
        .filter(rule => rule.position_market)
        .map(rule => rule.position_market)
    )
  ).sort();

  // Filter alert rules
  const filteredRules = alertRules.filter((rule) => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesName = rule.name.toLowerCase().includes(query);
      const matchesSubaccount = subaccounts.find(s => s.id === rule.subaccount_id)?.nickname?.toLowerCase().includes(query);
      if (!matchesName && !matchesSubaccount) return false;
    }

    // Condition type filter
    if (conditionFilter !== "all" && rule.condition_type !== conditionFilter) {
      return false;
    }

    // Status filter (enabled/disabled)
    if (statusFilter === "enabled" && !rule.enabled) {
      return false;
    }
    if (statusFilter === "disabled" && rule.enabled) {
      return false;
    }

    // Severity filter
    if (severityFilter !== "all" && rule.alert_severity !== severityFilter) {
      return false;
    }

    // Scope filter (account/position)
    if (scopeFilter === "account" && rule.scope !== "account") {
      return false;
    }
    if (scopeFilter === "position" && rule.scope !== "position") {
      return false;
    }

    // Subaccount filter
    if (subaccountFilter !== "all" && rule.subaccount_id !== subaccountFilter) {
      return false;
    }

    // Position market filter
    if (positionMarketFilter !== "all" && rule.position_market !== positionMarketFilter) {
      return false;
    }

    // Archived filter
    if (viewArchived) {
      // Show only archived rules
      if (!rule.archived) return false;
    } else {
      // Show only active (non-archived) rules
      if (rule.archived) return false;
    }

    return true;
  });

  return (
    <div className="min-h-screen flex flex-col">
      <Header user={currentUser} onLogout={handleLogout} />

      <main className="flex-1 p-4 md:p-6 space-y-4 overflow-auto max-w-7xl w-full mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Alert Rules</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Configure custom alert rules with flexible conditions and notifications
            </p>
          </div>
          {!isFormMode && (
            <div className="flex items-center gap-2">
              <Button
                onClick={() => setViewArchived(!viewArchived)}
                size="sm"
                variant={viewArchived ? "default" : "outline"}
                className="flex items-center gap-1.5"
              >
                {viewArchived ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                {viewArchived ? "Archived" : "Active"}
              </Button>
              <Button
                onClick={() => setIsCreating(true)}
                size="sm"
                className="flex items-center gap-1.5"
              >
                <Plus className="h-4 w-4" />
                New Alert Rule
              </Button>
            </div>
          )}
        </div>

        {globalBanner && (
          <BannerComponent kind={globalBanner.kind} message={globalBanner.message} />
        )}

        {/* Create/Edit Form */}
        {isFormMode && (
          <Card>
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div className="flex items-center gap-2">
                  <Bell className="h-4 w-4 text-primary" />
                  <h2 className="text-sm font-semibold">
                    {editingId ? "Edit Alert Rule" : "Create New Alert Rule"}
                  </h2>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setIsCreating(false);
                    setEditingId(null);
                    resetForm();
                  }}
                >
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  Cancel
                </Button>
              </div>

              <div className="space-y-3">
                {/* Rule Name */}
                <div className="space-y-1">
                  <Label htmlFor="name" className="text-xs">Rule Name *</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g., High Risk Liquidation Warning"
                    className="text-sm h-9"
                  />
                </div>

                {/* Subaccount Selection */}
                <div className="space-y-1">
                  <Label htmlFor="subaccount" className="text-xs">
                    Subaccount *
                  </Label>
                  <Select
                    value={subaccountId || ""}
                    onValueChange={(val) => setSubaccountId(val)}
                  >
                    <SelectTrigger className="text-xs h-9">
                      <SelectValue placeholder="Select a subaccount" />
                    </SelectTrigger>
                    <SelectContent>
                      {subaccounts.map((sub) => (
                        <SelectItem key={sub.id} value={sub.id}>
                          {sub.nickname || `${sub.address.slice(0, 6)}...${sub.address.slice(-4)}`} #{sub.subaccount_number}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Select which subaccount this rule will monitor
                  </p>
                </div>

                {/* Alert Scope */}
                <div className="space-y-1">
                  <Label className="text-xs">Alert Scope *</Label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setScope("account")}
                      className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border transition-colors ${
                        scope === "account"
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      <Wallet className={`h-4 w-4 ${scope === "account" ? "text-primary" : "text-muted-foreground"}`} />
                      <div className="text-left">
                        <p className={`text-xs font-medium ${scope === "account" ? "text-primary" : ""}`}>
                          Account Level
                        </p>
                        <p className="text-xs text-muted-foreground">Monitor entire account</p>
                      </div>
                    </button>
                    <button
                      onClick={() => {
                        if (subaccountId && availablePositions && availablePositions.positions.length > 0) {
                          setScope("position");
                        }
                      }}
                      disabled={!subaccountId || !availablePositions || availablePositions.positions.length === 0}
                      className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border transition-colors ${
                        !subaccountId || !availablePositions || availablePositions.positions.length === 0
                          ? "opacity-50 cursor-not-allowed border-border"
                          : scope === "position"
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      <Activity className={`h-4 w-4 ${(!subaccountId || !availablePositions || availablePositions.positions.length === 0) ? "text-muted-foreground" : scope === "position" ? "text-primary" : "text-muted-foreground"}`} />
                      <div className="text-left">
                        <p className={`text-xs font-medium ${scope === "position" && subaccountId && availablePositions && availablePositions.positions.length > 0 ? "text-primary" : ""}`}>
                          Position Level
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {!subaccountId
                            ? "Select subaccount first"
                            : (!availablePositions || availablePositions.positions.length === 0)
                            ? "No active positions"
                            : "Monitor specific position"}
                        </p>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Position Selection (only for position-level alerts) */}
                {scope === "position" && (
                  <div className="space-y-1">
                    <Label htmlFor="position" className="text-xs">
                      Position Market *
                    </Label>
                    {!availablePositions || availablePositions.positions.length === 0 ? (
                      <div className="bg-muted/30 rounded-lg p-3 text-center">
                        <p className="text-xs text-muted-foreground">
                          {subaccountId ? "No active positions found" : "Select a subaccount first"}
                        </p>
                      </div>
                    ) : (
                      <Select
                        value={positionMarket || ""}
                        onValueChange={(val) => setPositionMarket(val)}
                      >
                        <SelectTrigger className="text-xs h-9">
                          <SelectValue placeholder="Select a position" />
                        </SelectTrigger>
                        <SelectContent>
                          {availablePositions.positions.map((pos) => (
                            <SelectItem key={pos.market} value={pos.market}>
                              {pos.market} (${Math.abs(pos.total_size_usd).toLocaleString()})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                )}

                {/* Condition Type */}
                <div className="space-y-1">
                  <Label className="text-xs">Condition *</Label>
                  {scope === "position" && !positionMarket ? (
                    <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 text-center">
                      <p className="text-xs text-destructive">
                        Please select a position market first to choose a condition
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {conditionOptions.map(({ value, label, Icon }) => {
                        const isSelected = conditionType === value;
                        return (
                          <button
                            key={value}
                            onClick={() => setConditionType(value as ConditionType)}
                            className={`flex items-center gap-2 p-3 rounded-lg border transition-colors text-left ${
                              isSelected
                                ? "border-primary bg-primary/5"
                                : "border-border hover:border-primary/50"
                            }`}
                          >
                            <Icon className={`h-4 w-4 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                            <div className="flex-1 min-w-0">
                              <p className={`text-xs font-medium ${isSelected ? "text-primary" : ""}`}>
                                {label}
                              </p>
                              <p className="text-xs text-muted-foreground truncate">
                                {conditionConfig[value as ConditionType].description}
                              </p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Loading or Info Messages */}
                {!subaccountId && (
                  <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                    <div className="flex items-center gap-2">
                      <Info className="h-4 w-4 text-blue-500" />
                      <p className="text-xs text-blue-600 dark:text-blue-400">
                        Select a subaccount to see current metrics and configure threshold
                      </p>
                    </div>
                  </div>
                )}

                {subaccountId && !subaccountStatus && (
                  <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                    <div className="flex items-center gap-2">
                      <Info className="h-4 w-4 text-blue-500" />
                      <p className="text-xs text-blue-600 dark:text-blue-400">
                        Loading account data...
                      </p>
                    </div>
                  </div>
                )}

                {subaccountId && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="comparison" className="text-xs">Comparison</Label>
                      <Select value={comparison} onValueChange={(val) => setComparison(val as Comparison)}>
                        <SelectTrigger className="text-xs h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="<">Less than (&lt;)</SelectItem>
                          <SelectItem value="<=">Less than or equal (≤)</SelectItem>
                          <SelectItem value=">">Greater than (&gt;)</SelectItem>
                          <SelectItem value=">=">Greater than or equal (≥)</SelectItem>
                          <SelectItem value="==">Equal (=)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="threshold" className="text-xs">
                        Threshold ({conditionConfig[conditionType].unit})
                      </Label>
                      <Input
                        id="threshold"
                        type="text"
                        inputMode="decimal"
                        value={thresholdValue}
                        onChange={(e) => {
                          // Only allow valid number characters: digits, dot, minus, plus
                          const value = e.target.value;
                          if (value === '' || value === '-' || /^-?\d*\.?\d*$/.test(value)) {
                            setThresholdValue(value);
                          }
                        }}
                        placeholder={conditionConfig[conditionType].placeholder}
                        className="text-sm h-9"
                      />
                    </div>
                  </div>
                )}

                {/* Real-time Current Value Preview */}
                {subaccountId && subaccountStatus && (
                  <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-3">
                    <div className="flex items-start gap-2">
                      <Info className="h-4 w-4 text-blue-500 flex-shrink-0 mt-0.5" />
                      <div className="flex-1 space-y-1">
                        <p className="text-xs font-medium text-blue-600 dark:text-blue-400">
                          Current State
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {(() => {
                            const selectedSubaccount = subaccounts.find(s => s.id === subaccountId);
                            const accountName = selectedSubaccount?.nickname || `${selectedSubaccount?.address.slice(0, 6)}...${selectedSubaccount?.address.slice(-4)}` || "Account";
                            const metrics = subaccountStatus.metrics;
                            const config = conditionConfig[conditionType];

                            let currentValue = "N/A";

                            if (conditionType === "liquidation_distance") {
                              currentValue = `${(metrics?.liquidation_distance_percent || 0).toFixed(2)}%`;
                            } else if (conditionType === "margin_ratio") {
                              currentValue = `${(metrics?.margin_ratio || 0).toFixed(2)}x`;
                            } else if (conditionType === "equity_drop") {
                              currentValue = `$${(metrics?.equity || 0).toFixed(2)}`;
                            } else if (conditionType === "position_size") {
                              const positionMetrics = metrics?.position_metrics || {};
                              const totalSize = Object.values(positionMetrics).reduce((sum: number, posMetrics: any) => {
                                return sum + Math.abs(posMetrics?.position_value || 0);
                              }, 0);
                              currentValue = `$${totalSize.toFixed(2)}`;
                            } else if (conditionType === "free_collateral") {
                              currentValue = `$${(metrics?.free_collateral || 0).toFixed(2)}`;
                            } else if (positionMarket && metrics?.position_metrics?.[positionMarket]) {
                              const posMetrics = metrics.position_metrics[positionMarket];
                              if (conditionType === "position_pnl_percent") {
                                currentValue = `${(posMetrics.unrealized_pnl_percent || 0).toFixed(2)}%`;
                              } else if (conditionType === "position_pnl_usd") {
                                currentValue = `$${(posMetrics.unrealized_pnl || 0).toFixed(2)}`;
                              } else if (conditionType === "position_size_usd") {
                                currentValue = `$${Math.abs(posMetrics.position_value || 0).toFixed(2)}`;
                              } else if (conditionType === "position_size_contracts") {
                                currentValue = `${Math.abs(posMetrics.size || 0).toFixed(4)} contracts`;
                              } else if (conditionType === "position_liquidation_distance") {
                                currentValue = `${(posMetrics.liquidation_distance_percent || 0).toFixed(2)}%`;
                              } else if (conditionType === "position_leverage") {
                                currentValue = `${(posMetrics.leverage || 0).toFixed(2)}x`;
                              } else if (conditionType === "position_entry_price") {
                                currentValue = `$${(posMetrics.entry_price || 0).toFixed(2)}`;
                              } else if (conditionType === "position_oracle_price") {
                                currentValue = `$${(posMetrics.oracle_price || 0).toFixed(2)}`;
                              }
                            }

                            if (scope === "position" && positionMarket) {
                              return `${accountName} • ${positionMarket} • ${config.label} is currently ${currentValue}`;
                            } else {
                              return `${accountName} • ${config.label} is currently ${currentValue}`;
                            }
                          })()}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Severity */}
                <div className="space-y-1">
                  <Label className="text-xs">Alert Severity</Label>
                  <div className="flex gap-2">
                    {(["info", "warning", "critical"] as AlertRuleSeverity[]).map((severity) => {
                      const isSelected = alertSeverity === severity;
                      const Icon = severity === "critical" ? ShieldAlert : severity === "warning" ? AlertTriangle : Info;
                      return (
                        <button
                          key={severity}
                          onClick={() => setAlertSeverity(severity)}
                          className={`flex-1 flex items-center justify-center gap-2 p-2 rounded-lg border transition-colors ${
                            isSelected
                              ? severity === "critical"
                                ? "border-destructive bg-destructive/10 text-destructive"
                                : severity === "warning"
                                ? "border-warning bg-warning/10 text-warning"
                                : "border-blue-500 bg-blue-500/10 text-blue-500"
                              : "border-border hover:border-primary/50"
                          }`}
                        >
                          <Icon className="h-3.5 w-3.5" />
                          <span className="text-xs font-medium capitalize">{severity}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Notification Channels */}
                <div className="space-y-1">
                  <Label className="text-xs">Notification Channels * {subaccountId && selectedChannels.length === 0 && <span className="text-muted-foreground font-normal">(Select to see test preview)</span>}</Label>
                  {channels.length === 0 ? (
                    <div className="bg-muted/30 rounded-lg p-3 text-center">
                      <p className="text-xs text-muted-foreground mb-2">
                        No notification channels configured yet
                      </p>
                      <Link href="/channels">
                        <Button size="sm" variant="outline" className="text-xs h-8">
                          <Plus className="h-3 w-3 mr-1" />
                          Create Channel
                        </Button>
                      </Link>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {channels.map((channel) => {
                        // Get a descriptive label for the channel
                        const getChannelLabel = () => {
                          const type = channel.channel_type;
                          const config = channel.config || {};

                          if (type === "telegram" && config.chat_id) {
                            return `Telegram (${config.chat_id})`;
                          } else if (type === "email" && (config.to_email || config.email)) {
                            return `Email (${config.to_email || config.email})`;
                          } else if (type === "discord" && config.webhook_url) {
                            const url = config.webhook_url as string;
                            const match = url.match(/webhooks\/(\d+)/);
                            return `Discord ${match ? `(***${match[1].slice(-4)})` : ""}`;
                          } else if (type === "slack" && config.webhook_url) {
                            return `Slack Webhook`;
                          } else if (type === "pagerduty" && config.integration_key) {
                            const key = config.integration_key as string;
                            return `PagerDuty (***${key.slice(-4)})`;
                          } else if (type === "webhook" && config.url) {
                            const url = config.url as string;
                            try {
                              const domain = new URL(url).hostname;
                              return `Webhook (${domain})`;
                            } catch {
                              return `Webhook`;
                            }
                          }
                          return type.charAt(0).toUpperCase() + type.slice(1);
                        };

                        return (
                          <label
                            key={channel.id}
                            className={`flex items-center gap-3 p-2 rounded-lg border cursor-pointer transition-colors ${
                              selectedChannels.includes(channel.id)
                                ? "border-primary bg-primary/5"
                                : "border-border hover:border-primary/50"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={selectedChannels.includes(channel.id)}
                              onChange={() => toggleChannelSelection(channel.id)}
                              className="h-4 w-4"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium">{getChannelLabel()}</p>
                              <p className="text-xs text-muted-foreground truncate">
                                {channel.enabled ? "Enabled" : "Disabled"}
                              </p>
                            </div>
                            {!channel.enabled && (
                              <BellOff className="h-3.5 w-3.5 text-muted-foreground" />
                            )}
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Check Result Display */}
                {checkResult && (
                  <div className={`rounded-lg border-2 p-4 space-y-3 ${
                    checkResult.success
                      ? "bg-green-500/5 border-green-500/30"
                      : "bg-destructive/5 border-destructive/30"
                  }`}>
                    {checkResult.preview ? (
                      <div className="flex items-start gap-3">
                        <checkResult.preview.SeverityIcon className={`h-6 w-6 ${
                          alertSeverity === "critical"
                            ? "text-destructive"
                            : alertSeverity === "warning"
                            ? "text-warning"
                            : "text-blue-500"
                        }`} />
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge
                              variant={
                                alertSeverity === "critical"
                                  ? "destructive"
                                  : alertSeverity === "warning"
                                  ? "warning"
                                  : "default"
                              }
                              className="text-[10px] px-1.5 py-0"
                            >
                              {checkResult.preview.severityLabel} ALERT
                            </Badge>
                            <span className="text-xs text-muted-foreground">•</span>
                            <span className="text-xs text-muted-foreground">
                              via {checkResult.preview.channelNames.join(", ")}
                            </span>
                          </div>

                          <p className="text-sm font-medium leading-relaxed">
                            Alert triggered {checkResult.preview.triggerText}
                          </p>

                          <div className="space-y-2 text-sm">
                            <p className="font-semibold text-foreground">{checkResult.preview.currentValueText}</p>
                            <p className={`text-xs font-medium ${
                              checkResult.preview.additionalInfo.includes("[TRIGGER_NOW]")
                                ? "text-destructive"
                                : "text-green-600 dark:text-green-400"
                            }`}>
                              {checkResult.preview.additionalInfo.replace("[TRIGGER_NOW] ", "")}
                            </p>
                          </div>

                          <div className={`mt-3 pt-3 border-t ${
                            checkResult.success ? "border-green-500/20" : "border-destructive/20"
                          }`}>
                            <div className="flex items-center gap-2">
                              {checkResult.success ? (
                                <>
                                  <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                                  <p className="text-xs font-medium text-green-600 dark:text-green-400">
                                    {checkResult.message}
                                  </p>
                                </>
                              ) : (
                                <>
                                  <XCircle className="h-5 w-5 text-destructive" />
                                  <p className="text-xs font-medium text-destructive">
                                    {checkResult.message}
                                  </p>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <XCircle className="h-5 w-5 text-destructive" />
                        <p className="text-xs font-medium text-destructive">{checkResult.message}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Enabled Toggle */}
                <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Switch
                      id="enabled"
                      checked={enabled}
                      onCheckedChange={setEnabled}
                    />
                    <Label htmlFor="enabled" className="text-sm">
                      {enabled ? "Rule Enabled" : "Rule Disabled"}
                    </Label>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-3 border-t border-border">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsCreating(false);
                    setEditingId(null);
                    resetForm();
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
                {!checkPassed ? (
                  <Button
                    onClick={handleCheck}
                    disabled={!subaccountStatus}
                    className="flex-1"
                  >
                    Check Alert Rule
                  </Button>
                ) : (
                  <Button
                    onClick={editingId ? handleUpdate : handleCreate}
                    disabled={createMutation.isPending || updateMutation.isPending}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                  >
                    {editingId ? "Update Rule" : "Create Rule"}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Filters */}
        {!isFormMode && alertRules.length > 0 && (
          <Card>
            <CardContent className="p-3">
              <div className="flex flex-col md:flex-row gap-2">
                <div className="flex-1 relative">
                  <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Search rules..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 text-xs h-8"
                  />
                </div>
                <Select value={conditionFilter} onValueChange={setConditionFilter}>
                  <SelectTrigger className="w-full md:w-48 text-xs h-8">
                    <SelectValue placeholder="Condition" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Conditions</SelectItem>
                    <SelectItem value="liquidation_distance">Liq. Distance</SelectItem>
                    <SelectItem value="margin_ratio">Margin Ratio</SelectItem>
                    <SelectItem value="equity_drop">Equity Drop</SelectItem>
                    <SelectItem value="free_collateral">Free Collateral</SelectItem>
                    <SelectItem value="position_pnl_percent">Position PnL %</SelectItem>
                    <SelectItem value="position_pnl_usd">Position PnL USD</SelectItem>
                    <SelectItem value="position_size_usd">Position Size USD</SelectItem>
                    <SelectItem value="position_size_contracts">Position Size (Contracts)</SelectItem>
                    <SelectItem value="position_liquidation_distance">Position Liq. Dist.</SelectItem>
                    <SelectItem value="position_leverage">Position Leverage</SelectItem>
                  </SelectContent>
                </Select>
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
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full md:w-32 text-xs h-8">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="enabled">Enabled</SelectItem>
                    <SelectItem value="disabled">Disabled</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={scopeFilter} onValueChange={setScopeFilter}>
                  <SelectTrigger className="w-full md:w-32 text-xs h-8">
                    <SelectValue placeholder="Scope" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Scopes</SelectItem>
                    <SelectItem value="account">Account Level</SelectItem>
                    <SelectItem value="position">Position Level</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={subaccountFilter} onValueChange={setSubaccountFilter}>
                  <SelectTrigger className="w-full md:w-40 text-xs h-8">
                    <SelectValue placeholder="Account" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Accounts</SelectItem>
                    {subaccounts.map((sub) => (
                      <SelectItem key={sub.id} value={sub.id}>
                        {sub.nickname || `${sub.address.slice(0, 8)}...${sub.address.slice(-6)}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={positionMarketFilter} onValueChange={setPositionMarketFilter}>
                  <SelectTrigger className="w-full md:w-32 text-xs h-8">
                    <SelectValue placeholder="Position" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Positions</SelectItem>
                    {uniquePositionMarkets.map((market) => (
                      <SelectItem key={market} value={market!}>
                        {market}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {(searchQuery || conditionFilter !== "all" || statusFilter !== "all" || severityFilter !== "all" || scopeFilter !== "all" || subaccountFilter !== "all" || positionMarketFilter !== "all") && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSearchQuery("");
                      setConditionFilter("all");
                      setStatusFilter("all");
                      setSeverityFilter("all");
                      setScopeFilter("all");
                      setSubaccountFilter("all");
                      setPositionMarketFilter("all");
                    }}
                    className="h-8"
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Rules List */}
        {!isFormMode && (
          <Card>
            <CardContent className="p-4">
              {rulesLoading ? (
                <div className="text-center py-12 text-xs text-muted-foreground">
                  Loading alert rules...
                </div>
              ) : alertRules.length === 0 ? (
                <div className="text-center py-12">
                  <div className="flex flex-col items-center">
                    <div className="rounded-full bg-primary/10 p-4 mb-3">
                      <Bell className="h-8 w-8 text-primary" />
                    </div>
                    <p className="text-sm font-medium mb-1">No Alert Rules Yet</p>
                    <p className="text-xs text-muted-foreground mb-4">
                      Create your first alert rule to get started
                    </p>
                    <Button onClick={() => setIsCreating(true)} size="sm">
                      <Plus className="h-4 w-4 mr-1" />
                      Create Alert Rule
                    </Button>
                  </div>
                </div>
              ) : filteredRules.length === 0 ? (
                <div className="text-center py-8 text-xs text-muted-foreground">
                  No alert rules match your filters
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredRules.map((rule) => {
                    const config = conditionConfig[rule.condition_type];
                    const Icon = config?.icon || Bell;
                    const subaccount = subaccounts.find((s) => s.id === rule.subaccount_id);

                    return (
                      <div
                        key={rule.id}
                        onClick={rule.archived ? undefined : () => handleEdit(rule)}
                        className={`p-3 rounded-lg border border-border transition-colors ${
                          rule.archived
                            ? "opacity-50 cursor-not-allowed"
                            : "hover:bg-muted/30 cursor-pointer"
                        }`}
                      >
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
                                {config?.label || rule.condition_type}
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
                              {rule.scope === "position" && rule.position_market && (
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0 flex items-center gap-1">
                                  <Activity className="h-2.5 w-2.5" />
                                  {rule.position_market}
                                </Badge>
                              )}
                              {subaccount && (
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                  {subaccount.nickname || `${subaccount.address.slice(0, 8)}...${subaccount.address.slice(-6)}`}
                                </Badge>
                              )}
                              {!rule.subaccount_id && (
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                  Global
                                </Badge>
                              )}
                            </div>

                            <p className="text-xs text-muted-foreground italic">
                              {rule.description || "No description available"}
                            </p>
                          </div>

                          <div className="flex gap-2 flex-shrink-0 items-center">
                            {!rule.archived && (
                              <div className="flex items-center gap-1.5">
                                <Switch
                                  checked={rule.enabled}
                                  onCheckedChange={(checked) => {
                                    updateMutation.mutate({
                                      id: rule.id,
                                      payload: {
                                        enabled: checked,
                                      },
                                    });
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                  disabled={updateMutation.isPending}
                                  className="scale-75"
                                />
                              </div>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(rule.id);
                              }}
                              disabled={deleteMutation.isPending}
                              className="h-8 w-8 p-0"
                            >
                              <Trash2 className="h-3.5 w-3.5 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Confirm Dialog */}
        <ConfirmDialog
          open={deleteRuleId !== null}
          onOpenChange={(open) => !open && setDeleteRuleId(null)}
          title="Delete Alert Rule"
          description="Are you sure you want to delete this alert rule? This action cannot be undone."
          onConfirm={confirmDelete}
          confirmText="Delete"
          variant="destructive"
          isLoading={deleteMutation.isPending}
        />
      </main>
    </div>
  );
}
