import {
  AlertItem,
  AlertRule,
  ApiError,
  AvailablePositionsResponse,
  CurrentUser,
  MarketsResponse,
  NotificationChannel,
  Subaccount,
  SubaccountStatus,
} from "@/lib/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

type Json = Record<string, unknown> | undefined;

type RequestMethod = "GET" | "POST" | "PATCH" | "DELETE";

async function apiFetch<T>(path: string, method: RequestMethod = "GET", body?: Json): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  const headers: Record<string, string> = {};
  if (body) {
    headers["Content-Type"] = "application/json";
  }
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${path}`.replace(/\/$/, ""), {
    method,
    headers: Object.keys(headers).length > 0 ? headers : undefined,
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
    credentials: "include",
    mode: "cors",
  });

  if (!response.ok) {
    let message = `Request to ${path} failed (${response.status})`;
    try {
      const error = (await response.json()) as ApiError;
      if (error.detail) message = error.detail;
      else if (error.message) message = error.message;
    } catch (error) {
      // ignore parse errors
    }
    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export async function fetchSubaccounts(): Promise<Subaccount[]> {
  return apiFetch<Subaccount[]>(`/api/subaccounts`);
}

export async function validateSubaccountAddress(
  address: string,
  subaccount_number: number = 0
): Promise<{ valid: boolean; message: string }> {
  return apiFetch<{ valid: boolean; message: string }>(
    `/api/subaccounts/validate?address=${encodeURIComponent(address)}&subaccount_number=${subaccount_number}`
  );
}

export async function createSubaccount(payload: {
  address: string;
  subaccount_number: number;
  nickname?: string | null;
  liquidation_threshold_percent: number;
}): Promise<Subaccount> {
  return apiFetch<Subaccount>(`/api/subaccounts`, "POST", payload);
}

export async function updateSubaccount(
  id: string,
  payload: Partial<Pick<Subaccount, "nickname" | "liquidation_threshold_percent" | "is_active">>
): Promise<Subaccount> {
  return apiFetch<Subaccount>(`/api/subaccounts/${id}`, "PATCH", payload);
}

export async function deleteSubaccount(id: string): Promise<void> {
  await apiFetch(`/api/subaccounts/${id}`, "DELETE");
}

export async function fetchChannels(): Promise<NotificationChannel[]> {
  return apiFetch<NotificationChannel[]>(`/api/channels`);
}

export async function createChannel(payload: {
  channel_type: string;
  enabled: boolean;
  config: Record<string, unknown>;
}): Promise<NotificationChannel> {
  return apiFetch<NotificationChannel>(`/api/channels`, "POST", payload);
}

export async function updateChannel(id: string, payload: { enabled?: boolean }): Promise<NotificationChannel> {
  return apiFetch<NotificationChannel>(`/api/channels/${id}`, "PATCH", payload);
}

export async function deleteChannel(id: string): Promise<void> {
  await apiFetch(`/api/channels/${id}`, "DELETE");
}

export async function testChannel(id: string): Promise<{ message: string }> {
  return apiFetch<{ message: string }>(`/api/channels/${id}/test`, "POST");
}

export async function fetchAlerts(): Promise<AlertItem[]> {
  return apiFetch<AlertItem[]>(`/api/alerts?limit=100`);
}

export async function deleteAlert(id: string): Promise<void> {
  await apiFetch(`/api/alerts/${id}`, "DELETE");
}

export async function deleteAlerts(alert_ids: string[]): Promise<{ deleted_count: number }> {
  return apiFetch<{ deleted_count: number }>(`/api/alerts/delete-many`, "POST", { alert_ids });
}

export async function clearAllAlerts(): Promise<{ deleted_count: number }> {
  return apiFetch<{ deleted_count: number }>(`/api/alerts/clear-all`, "DELETE");
}

export async function fetchAlertRules(): Promise<AlertRule[]> {
  return apiFetch<AlertRule[]>(`/api/alert-rules`);
}

export async function createAlertRule(payload: {
  name: string;
  subaccount_id?: string | null;
  scope?: string; // "account" or "position"
  position_market?: string | null; // e.g., "BTC-USD"
  condition_type: string;
  threshold_value: number;
  comparison: string;
  alert_severity: string;
  channel_ids: string[];
  cooldown_seconds: number;
  enabled: boolean;
}): Promise<AlertRule> {
  return apiFetch<AlertRule>(`/api/alert-rules`, "POST", payload);
}

export async function updateAlertRule(
  id: string,
  payload: Partial<{
    name: string;
    subaccount_id: string | null;
    scope: string; // "account" or "position"
    position_market: string | null; // e.g., "BTC-USD"
    condition_type: string;
    threshold_value: number;
    comparison: string;
    alert_severity: string;
    channel_ids: string[];
    cooldown_seconds: number;
    enabled: boolean;
  }>
): Promise<AlertRule> {
  return apiFetch<AlertRule>(`/api/alert-rules/${id}`, "PATCH", payload);
}

export async function deleteAlertRule(id: string): Promise<void> {
  return apiFetch<void>(`/api/alert-rules/${id}`, "DELETE");
}

export async function fetchSubaccountStatus(id: string): Promise<SubaccountStatus> {
  return apiFetch<SubaccountStatus>(`/api/subaccounts/${id}/status`);
}

export async function fetchCurrentUser(): Promise<CurrentUser> {
  return apiFetch<CurrentUser>(`/api/auth/me`);
}

export async function fetchUserIdentities(): Promise<{
  provider: string;
  identity_id: string;
  email?: string;
  created_at?: string;
}[]> {
  return apiFetch(`/api/auth/identities`);
}

export async function updateUserPreferences(timezone: string): Promise<CurrentUser> {
  return apiFetch<CurrentUser>(`/api/auth/preferences`, "PATCH", { timezone });
}

// OPTIMIZATION: No longer fetching from dYdX directly
// Markets data now comes from our backend API (/api/markets)
// which serves WebSocket-cached data
// export async function fetchPerpetualMarkets(): Promise<MarketsResponse> {
//   const response = await fetch("https://indexer.v4testnet.dydx.exchange/v4/perpetualMarkets", {
//     cache: "no-store",
//   });
//
//   if (!response.ok) {
//     throw new Error(`Failed to fetch markets: ${response.status}`);
//   }
//
//   return await response.json();
// }

export async function fetchPerpetualMarkets(): Promise<MarketsResponse> {
  // Now fetches from our backend which caches WebSocket data
  return apiFetch<MarketsResponse>(`/api/markets`);
}

export async function fetchAvailablePositions(subaccount_id?: string): Promise<AvailablePositionsResponse> {
  const params = subaccount_id ? `?subaccount_id=${encodeURIComponent(subaccount_id)}` : "";
  return apiFetch<AvailablePositionsResponse>(`/api/alert-rules/available-positions${params}`);
}
