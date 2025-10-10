"use client";

import { useEffect, useRef } from "react";
import { useData } from "@/lib/data-provider";
import { toast } from "sonner";
import { Bell, AlertCircle, Activity, Scale, DollarSign, Package, TrendingUp, Target, TrendingDown, Zap, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function AlertNotifier() {
  const { lastAlert, subaccounts } = useData();
  const lastAlertId = useRef<string | null>(null);

  useEffect(() => {
    if (!lastAlert) return;

    // Avoid duplicate notifications - use alert ID if available
    const alertId = lastAlert.id || `${lastAlert.subaccount_id}_${lastAlert.alert_type}_${lastAlert.created_at}`;
    if (lastAlertId.current === alertId) return;
    lastAlertId.current = alertId;

    const severity = lastAlert.severity?.toLowerCase() || "info";
    const baseMessage = lastAlert.message || "New alert received";
    const alertType = lastAlert.alert_type?.toLowerCase() || "";
    const positionMarket = lastAlert.alert_metadata?.position_market as string | undefined;
    const ruleName = lastAlert.alert_metadata?.rule_name as string | undefined;

    // Find subaccount name
    const subaccount = subaccounts.find(s => s.id === lastAlert.subaccount_id);
    const subaccountName = subaccount
      ? (subaccount.nickname || `${subaccount.address.slice(0, 8)}...${subaccount.address.slice(-6)}`)
      : null;

    // Build a rich message - title is rule name, description is account/position
    const message = ruleName || "Alert Triggered";
    let description = "";
    if (subaccountName) {
      if (positionMarket) {
        description = `${positionMarket} position on ${subaccountName}`;
      } else {
        description = `Account: ${subaccountName}`;
      }
    } else {
      // Don't show account info if we couldn't find it
      description = "";
    }

    // Map alert type to icon component
    const getAlertIconComponent = () => {
      if (alertType.includes("liquidation") || alertType.includes("liquidation_distance")) {
        return AlertCircle;
      } else if (alertType.includes("adl")) {
        return Activity;
      } else if (alertType.includes("margin_ratio")) {
        return Scale;
      } else if (alertType.includes("equity")) {
        return DollarSign;
      } else if (alertType.includes("position_size")) {
        return Package;
      } else if (alertType.includes("free_collateral")) {
        return DollarSign;
      } else if (alertType.includes("pnl")) {
        return alertType.includes("percent") ? TrendingUp : DollarSign;
      } else if (alertType.includes("leverage")) {
        return Target;
      } else if (alertType.includes("price")) {
        return TrendingDown;
      } else if (alertType.includes("funding")) {
        return Zap;
      }
      return Bell;
    };

    const IconComponent = getAlertIconComponent();

    // Determine severity styling
    const getSeverityStyles = () => {
      if (severity === "critical") {
        return {
          bgColor: "bg-destructive/20",
          iconColor: "text-destructive",
          borderColor: "border-destructive/30",
          duration: 10000,
        };
      } else if (severity === "warning") {
        return {
          bgColor: "bg-warning/20",
          iconColor: "text-warning",
          borderColor: "border-warning/30",
          duration: 7000,
        };
      } else {
        return {
          bgColor: "bg-blue-500/20",
          iconColor: "text-blue-500",
          borderColor: "border-blue-500/30",
          duration: 5000,
        };
      }
    };

    const severityStyles = getSeverityStyles();

    // Create custom toast matching the UI theme
    toast.custom(
      (t) => (
        <div className="bg-card border border-border rounded-lg shadow-lg p-3 min-w-[320px] max-w-[420px]">
          <div className="flex items-start gap-3">
            {/* Icon */}
            <div className={`rounded-lg p-2 flex-shrink-0 ${severityStyles.bgColor}`}>
              <IconComponent className={`h-4 w-4 ${severityStyles.iconColor}`} />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0 space-y-1.5">
              {/* Title and badges */}
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-semibold text-foreground leading-tight">
                  {message}
                </p>
                <button
                  onClick={() => toast.dismiss(t)}
                  className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Description */}
              {description && (
                <p className="text-xs text-muted-foreground">
                  {description}
                </p>
              )}

              {/* Badges */}
              {positionMarket && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 flex items-center gap-1">
                    <Activity className="h-2.5 w-2.5" />
                    {positionMarket}
                  </Badge>
                </div>
              )}
            </div>
          </div>
        </div>
      ),
      { duration: severityStyles.duration }
    );
  }, [lastAlert, subaccounts]);

  return null;
}
