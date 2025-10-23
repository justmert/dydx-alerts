export interface Subaccount {
  id: string;
  user_id?: string | null;
  address: string;
  subaccount_number: number;
  nickname: string | null;
  liquidation_threshold_percent: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SubaccountStatus {
  id: string;
  address: string;
  subaccount_number: number;
  nickname?: string | null;
  liquidation_threshold_percent: number;
  user_id: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  status: string;
  metrics?: {
    equity?: number;
    maintenance_requirement?: number;
    initial_requirement?: number;
    margin_ratio?: number;
    liquidation_distance_percent?: number;
    free_collateral?: number;
    max_liquidation_penalty?: number;
    initial_margin_percent?: number;
    maintenance_margin_percent?: number;
    positions?: Record<string, {
      market: string;
      status: string;
      side: string;
      size: string;
      maxSize: string;
      entryPrice: string;
      exitPrice?: string | null;
      realizedPnl: string;
      unrealizedPnl: string;
      createdAt: string;
      createdAtHeight: string;
      closedAt?: string | null;
      sumOpen: string;
      sumClose: string;
      netFunding: string;
      subaccountNumber: number;
    }>;
    position_metrics?: Record<
      string,
      {
        margin_mode?: string | null;
        size?: number | null;
        entry_price?: number | null;
        oracle_price?: number | null;
        maintenance_margin_fraction?: number | null;
        initial_margin_fraction?: number | null;
        maintenance_requirement?: number | null;
        initial_requirement?: number | null;
        maintenance_margin_percent?: number | null;
        initial_margin_percent?: number | null;
        position_value?: number | null;
        unrealized_pnl?: number | null;
        unrealized_pnl_percent?: number | null; // NEW: PnL as % of entry value
        realized_pnl?: number | null;
        funding_payment?: number | null;
        leverage?: number | null; // NEW: Position leverage
        leverage_on_equity?: number | null;
        leverage_on_initial_margin?: number | null;
        liquidation_distance_percent?: number | null; // NEW: Position-specific liquidation distance
        isolated_liquidation_price?: number | null;
        cross_liquidation_price?: number | null;
        protocol_liquidation_price?: number | null;
        fillable_price?: number | null;
      }
    >;
  };
}

export type ChannelType =
  | "telegram"
  | "discord"
  | "slack"
  | "pagerduty"
  | "email"
  | "webhook";

export interface NotificationChannel {
  id: string;
  user_id?: string | null;
  channel_type: ChannelType;
  enabled: boolean;
  config: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface AlertItem {
  id: string;
  subaccount_id: string;
  alert_type: string;
  severity: string;
  message: string;
  description?: string | null;
  alert_metadata?: Record<string, unknown> | null;
  channels_sent?: string[] | null;
  created_at: string;
}

export interface ApiError {
  detail?: string;
  message?: string;
}

export interface CurrentUser {
  id: string;
  email: string;
  name?: string | null;
  timezone?: string;
}

export interface PerpetualMarket {
  clobPairId: string;
  ticker: string;
  status: string;
  oraclePrice: string;
  priceChange24H: string;
  volume24H: string;
  trades24H: number;
  nextFundingRate: string;
  initialMarginFraction: string;
  maintenanceMarginFraction: string;
  openInterest: string;
  atomicResolution: number;
  quantumConversionExponent: number;
  tickSize: string;
  stepSize: string;
  stepBaseQuantums: number;
  subticksPerTick: number;
  marketType: string;
  openInterestLowerCap: string;
  openInterestUpperCap: string;
  baseOpenInterest: string;
  defaultFundingRate1H: string;
}

export interface MarketsResponse {
  markets: Record<string, PerpetualMarket>;
}

export type AlertScope = "account" | "position";

export type ConditionType =
  // Account-level conditions
  | "liquidation_distance"
  | "margin_ratio"
  | "equity_drop"
  | "position_size"
  | "free_collateral"
  // Position-level conditions
  | "position_pnl_percent"
  | "position_pnl_usd"
  | "position_size_usd"
  | "position_size_contracts"
  | "position_liquidation_distance"
  | "position_leverage"
  | "position_entry_price"
  | "position_oracle_price";

export type Comparison = "<" | "<=" | ">" | ">=" | "==";

export type AlertRuleSeverity = "info" | "warning" | "critical";

export interface AlertRule {
  id: string;
  user_id: string;
  subaccount_id: string | null;
  scope: string; // "account" or "position"
  position_market: string | null; // e.g., "BTC-USD"
  name: string;
  description: string | null; // Auto-generated natural language description
  enabled: boolean;
  archived: boolean;
  condition_type: ConditionType;
  threshold_value: number;
  comparison: Comparison;
  alert_severity: AlertRuleSeverity;
  custom_message: string | null;
  channel_ids: string[];
  cooldown_seconds: number;
  created_at: string;
  updated_at: string;
}

export interface AvailablePosition {
  market: string;
  subaccounts: {
    subaccount_id: string;
    nickname: string;
    size_usd: number | null;
    pnl_usd: number | null;
    pnl_percent: number | null;
  }[];
  total_size_usd: number;
  oracle_price: number | null;
}

export interface AvailablePositionsResponse {
  positions: AvailablePosition[];
  total_markets: number;
}
