"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { SubaccountStatus } from "@/lib/types";

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000";

interface UseRealtimeSubaccountsOptions {
  token: string | null;
  enabled?: boolean;
  onUpdate?: (subaccount: SubaccountStatus) => void;
  onError?: (error: Error) => void;
}

interface WebSocketMessage {
  type: "position_update" | "alert" | "error";
  data: SubaccountStatus | { message: string };
}

export function useRealtimeSubaccounts({
  token,
  enabled = true,
  onUpdate,
  onError,
}: UseRealtimeSubaccountsOptions) {
  const [isConnected, setIsConnected] = useState(false);
  const [subaccounts, setSubaccounts] = useState<Record<string, SubaccountStatus>>({});
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);

  const connect = useCallback(() => {
    if (!token || !enabled) {
      return;
    }

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      const ws = new WebSocket(`${WS_URL}/ws?token=${token}`);

      ws.onopen = () => {
        setIsConnected(true);
        reconnectAttemptsRef.current = 0;
      };

      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);

          if (message.type === "position_update" && "id" in message.data) {
            const subaccount = message.data as SubaccountStatus;
            setSubaccounts((prev) => ({
              ...prev,
              [subaccount.id]: subaccount,
            }));
            onUpdate?.(subaccount);
          } else if (message.type === "error") {
            console.error("WebSocket error message:", message.data);
            onError?.(new Error((message.data as { message: string }).message));
          }
        } catch (err) {
          console.error("Failed to parse WebSocket message:", err);
        }
      };

      ws.onerror = (error) => {
        console.error("WebSocket error:", error);
        onError?.(new Error("WebSocket connection error"));
      };

      ws.onclose = () => {
        setIsConnected(false);
        wsRef.current = null;

        // Attempt to reconnect with exponential backoff
        if (enabled && reconnectAttemptsRef.current < 10) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
          reconnectAttemptsRef.current += 1;

          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, delay);
        }
      };

      wsRef.current = ws;
    } catch (err) {
      console.error("Failed to create WebSocket connection:", err);
      onError?.(err as Error);
    }
  }, [token, enabled, onUpdate, onError]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    setIsConnected(false);
    reconnectAttemptsRef.current = 0;
  }, []);

  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    isConnected,
    subaccounts,
    reconnect: connect,
    disconnect,
  };
}
