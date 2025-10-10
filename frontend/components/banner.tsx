import { AlertCircle, CheckCircle2, Info, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

export type BannerKind = "error" | "success" | "warning" | "info";

export interface BannerProps {
  kind: BannerKind;
  message: string;
  onDismiss?: () => void;
  className?: string;
}

const bannerConfig: Record<BannerKind, {
  icon: React.ComponentType<{ className?: string }>;
  className: string;
}> = {
  error: {
    icon: AlertCircle,
    className: "bg-destructive/10 text-destructive border border-destructive/20",
  },
  success: {
    icon: CheckCircle2,
    className: "bg-success/10 text-success border border-success/20",
  },
  warning: {
    icon: AlertTriangle,
    className: "bg-warning/10 text-warning border border-warning/20",
  },
  info: {
    icon: Info,
    className: "bg-primary/10 text-primary border border-primary/20",
  },
};

export function Banner({ kind, message, onDismiss, className }: BannerProps) {
  const config = bannerConfig[kind];
  const Icon = config.icon;

  return (
    <div
      className={cn(
        "rounded-lg px-4 py-3 flex items-center gap-3 text-sm shadow-sm",
        config.className,
        className
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <p className="flex-1">{message}</p>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="shrink-0 opacity-70 hover:opacity-100 transition-opacity"
          aria-label="Dismiss"
        >
          <AlertCircle className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
