"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchSubaccounts } from "./api";

interface DataContextType {
  subaccounts: any[];
  markets: any[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
  lastAlert: any | null;
  updateSubaccounts: (updater: (prev: any[]) => any[]) => void;
  addSubaccount: (subaccount: any) => void;
  removeSubaccount: (id: string) => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [ws, setWs] = useState<WebSocket | null>(null);

  // OPTIMIZATION: Memory-only cache for real-time data
  const [cachedSubaccounts, setCachedSubaccounts] = useState<any[]>([]);
  const [cachedMarkets, setCachedMarkets] = useState<any>({});
  const [lastAlert, setLastAlert] = useState<any | null>(null);

  // Check if user is authenticated (has token)
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Check for token on mount and when localStorage changes
    const checkAuth = () => {
      const token = localStorage.getItem("token");
      setIsAuthenticated(!!token);
    };

    checkAuth();

    // Listen for storage events (when token changes in another tab)
    window.addEventListener("storage", checkAuth);
    return () => window.removeEventListener("storage", checkAuth);
  }, []);

  // Fetch subaccounts (refreshes every 15s) - only if authenticated
  const {
    data: subaccounts = [],
    isLoading: subaccountsLoading,
    error: subaccountsError,
    refetch: refetchSubaccounts,
  } = useQuery({
    queryKey: ["subaccounts"],
    queryFn: fetchSubaccounts,
    refetchInterval: 15000,
    enabled: isAuthenticated,
  });

  // Fetch markets from OUR backend (WebSocket cached data, no dYdX API call)
  // Public endpoint - no authentication required
  const {
    data: marketsResponse,
    isLoading: marketsLoading,
    error: marketsError,
    refetch: refetchMarkets,
  } = useQuery({
    queryKey: ["markets"],
    queryFn: async () => {
      const token = localStorage.getItem("token");
      const headers: Record<string, string> = {};
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/markets`,
        {
          headers: Object.keys(headers).length > 0 ? headers : undefined,
        }
      );
      if (!response.ok) throw new Error("Failed to fetch markets");
      return response.json();
    },
    refetchInterval: 5000, // Faster refresh since it's from our cache
  });

  const markets = useMemo(() => marketsResponse?.markets || {}, [marketsResponse]);

  // Update memory cache when data changes
  useEffect(() => {
    if (subaccounts.length > 0) {
      setCachedSubaccounts(subaccounts);
    }
  }, [subaccounts]);

  useEffect(() => {
    if (Object.keys(markets).length > 0) {
      setCachedMarkets(markets);
    }
  }, [markets]);

  // OPTIMIZATION: Single WebSocket connection with memory cache updates - only if authenticated
  useEffect(() => {
    if (!isAuthenticated) return;

    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000";
    const token = localStorage.getItem("token");
    if (!token) return;

    const websocket = new WebSocket(`${wsUrl}/ws?token=${token}`);

    websocket.onopen = () => {
      console.log("✅ WebSocket connected (single connection)");
    };

    websocket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        // OPTIMIZATION: Update memory cache directly for instant UI updates
        if (data.type === "position_update") {
          // Update cached subaccount data immediately
          setCachedSubaccounts(prev => {
            const updated = [...prev];
            const index = updated.findIndex(s => s.id === data.subaccount_id);
            if (index !== -1) {
              updated[index] = { ...updated[index], ...data };
            }
            return updated;
          });

          // Also invalidate React Query cache for next refetch
          queryClient.invalidateQueries({ queryKey: ["subaccounts"] });
        }

        if (data.type === "alert") {
          // Real-time alert notification
          setLastAlert(data);
          queryClient.invalidateQueries({ queryKey: ["alerts"] });
        }
      } catch (error) {
        console.error("WebSocket message error:", error);
      }
    };

    websocket.onerror = (error) => {
      console.error("WebSocket error:", error);
    };

    websocket.onclose = () => {
      console.log("WebSocket disconnected");
    };

    setWs(websocket);

    return () => {
      websocket.close();
    };
  }, [isAuthenticated, queryClient]);

  const updateSubaccounts = useCallback((updater: (prev: any[]) => any[]) => {
    setCachedSubaccounts(updater);
    // Also update React Query cache
    queryClient.setQueryData(["subaccounts"], updater);
  }, [queryClient]);

  const addSubaccount = useCallback((subaccount: any) => {
    setCachedSubaccounts(prev => [...prev, subaccount]);
    queryClient.setQueryData(["subaccounts"], (old: any[] = []) => [...old, subaccount]);
  }, [queryClient]);

  const removeSubaccount = useCallback((id: string) => {
    setCachedSubaccounts(prev => prev.filter(s => s.id !== id));
    queryClient.setQueryData(["subaccounts"], (old: any[] = []) => old.filter(s => s.id !== id));
  }, [queryClient]);

  const value: DataContextType = {
    subaccounts: cachedSubaccounts.length > 0 ? cachedSubaccounts : subaccounts,
    markets: Object.keys(cachedMarkets).length > 0 ? cachedMarkets : markets,
    isLoading: subaccountsLoading || marketsLoading,
    error: (subaccountsError || marketsError) as Error | null,
    refetch: () => {
      refetchSubaccounts();
      refetchMarkets();
    },
    lastAlert,
    updateSubaccounts,
    addSubaccount,
    removeSubaccount,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error("useData must be used within a DataProvider");
  }
  return context;
}
