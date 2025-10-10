"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { fetchCurrentUser } from "@/lib/api";
import { Header } from "@/components/header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { AlertCircle, ArrowUpDown, ArrowUp, ArrowDown, Search } from "lucide-react";
import { useData } from "@/lib/data-provider";
import { Banner as BannerComponent, BannerKind } from "@/components/banner";

type Banner = { kind: BannerKind; message: string } | null;
type SortKey = "ticker" | "oraclePrice" | "priceChange24H" | "volume24H" | "trades24H" | "openInterest" | "fundingRate" | "initialMargin" | "maintenanceMargin" | "status";
type SortOrder = "asc" | "desc";

export default function MarketsPage() {
  const router = useRouter();

  // Use shared data provider
  const { markets: marketsData, isLoading: marketsLoading, subaccounts } = useData();

  // Wrap in expected format
  const markets = useMemo(() => {
    if (!marketsData || Object.keys(marketsData).length === 0) return null;
    return { markets: marketsData };
  }, [marketsData]);

  const {
    data: currentUser,
    error: currentUserError,
  } = useQuery({
    queryKey: ["current-user"],
    queryFn: fetchCurrentUser,
    retry: false,
  });

  const [globalBanner, setGlobalBanner] = useState<Banner>(null);
  const [sortKey, setSortKey] = useState<SortKey>("volume24H");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [searchQuery, setSearchQuery] = useState("");

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


  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortOrder("desc");
    }
  };

  const sortedMarkets = useMemo(() => {
    if (!markets) return [];

    let marketsList = Object.entries(markets.markets);

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      marketsList = marketsList.filter(([ticker]) =>
        ticker.toLowerCase().includes(query)
      );
    }

    return marketsList.sort(([tickerA, marketA], [tickerB, marketB]) => {
      let aValue: number | string;
      let bValue: number | string;

      switch (sortKey) {
        case "ticker":
          aValue = tickerA;
          bValue = tickerB;
          break;
        case "oraclePrice":
          aValue = marketA.oraclePrice ? parseFloat(marketA.oraclePrice) : 0;
          bValue = marketB.oraclePrice ? parseFloat(marketB.oraclePrice) : 0;
          break;
        case "priceChange24H":
          aValue = marketA.priceChange24H ? parseFloat(marketA.priceChange24H) : 0;
          bValue = marketB.priceChange24H ? parseFloat(marketB.priceChange24H) : 0;
          break;
        case "volume24H":
          aValue = marketA.volume24H ? parseFloat(marketA.volume24H) : 0;
          bValue = marketB.volume24H ? parseFloat(marketB.volume24H) : 0;
          break;
        case "trades24H":
          aValue = marketA.trades24H ?? 0;
          bValue = marketB.trades24H ?? 0;
          break;
        case "openInterest":
          aValue = marketA.openInterest ? parseFloat(marketA.openInterest) : 0;
          bValue = marketB.openInterest ? parseFloat(marketB.openInterest) : 0;
          break;
        case "fundingRate":
          aValue = marketA.nextFundingRate ? parseFloat(marketA.nextFundingRate) : 0;
          bValue = marketB.nextFundingRate ? parseFloat(marketB.nextFundingRate) : 0;
          break;
        case "initialMargin":
          aValue = marketA.initialMarginFraction ? parseFloat(marketA.initialMarginFraction) : 0;
          bValue = marketB.initialMarginFraction ? parseFloat(marketB.initialMarginFraction) : 0;
          break;
        case "maintenanceMargin":
          aValue = marketA.maintenanceMarginFraction ? parseFloat(marketA.maintenanceMarginFraction) : 0;
          bValue = marketB.maintenanceMarginFraction ? parseFloat(marketB.maintenanceMarginFraction) : 0;
          break;
        case "status":
          aValue = marketA.status || "";
          bValue = marketB.status || "";
          break;
        default:
          return 0;
      }

      if (typeof aValue === "string" && typeof bValue === "string") {
        return sortOrder === "asc"
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      return sortOrder === "asc"
        ? (aValue as number) - (bValue as number)
        : (bValue as number) - (aValue as number);
    });
  }, [markets, sortKey, sortOrder, searchQuery]);

  const SortIcon = ({ column }: { column: SortKey }) => {
    if (sortKey !== column) {
      return <ArrowUpDown className="h-3 w-3 ml-1 opacity-50" />;
    }
    return sortOrder === "asc"
      ? <ArrowUp className="h-3 w-3 ml-1" />
      : <ArrowDown className="h-3 w-3 ml-1" />;
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header user={currentUser} onLogout={handleLogout} />

      <main className="flex-1 p-4 md:p-6 space-y-4 overflow-auto max-w-7xl w-full mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Perpetual Markets</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Live market data from dYdX testnet
            </p>
          </div>
        </div>

        {globalBanner && (
          <BannerComponent kind={globalBanner.kind} message={globalBanner.message} />
        )}

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search markets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 text-xs h-8"
          />
        </div>

        {marketsLoading ? (
          <div className="text-center py-12 text-xs text-muted-foreground">
            Loading markets...
          </div>
        ) : (
          <>
            <Card>
            <CardContent className="p-0">
              <div className="overflow-auto">
                <table className="w-full text-xs table-auto">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="sticky left-0 bg-card text-left p-2 font-medium text-muted-foreground whitespace-nowrap">
                        <button onClick={() => handleSort("ticker")} className="flex items-center hover:text-foreground transition-colors">
                          Market
                          <SortIcon column="ticker" />
                        </button>
                      </th>
                      <th className="text-right p-2 font-medium text-muted-foreground whitespace-nowrap">
                        <button onClick={() => handleSort("oraclePrice")} className="flex items-center ml-auto hover:text-foreground transition-colors">
                          Oracle
                          <SortIcon column="oraclePrice" />
                        </button>
                      </th>
                      <th className="text-right p-2 font-medium text-muted-foreground whitespace-nowrap">
                        <button onClick={() => handleSort("priceChange24H")} className="flex items-center ml-auto hover:text-foreground transition-colors">
                          24h Δ
                          <SortIcon column="priceChange24H" />
                        </button>
                      </th>
                      <th className="text-right p-2 font-medium text-muted-foreground whitespace-nowrap">
                        <button onClick={() => handleSort("volume24H")} className="flex items-center ml-auto hover:text-foreground transition-colors">
                          Volume
                          <SortIcon column="volume24H" />
                        </button>
                      </th>
                      <th className="text-right p-2 font-medium text-muted-foreground whitespace-nowrap">
                        <button onClick={() => handleSort("trades24H")} className="flex items-center ml-auto hover:text-foreground transition-colors">
                          Trades
                          <SortIcon column="trades24H" />
                        </button>
                      </th>
                      <th className="text-right p-2 font-medium text-muted-foreground whitespace-nowrap">
                        <button onClick={() => handleSort("openInterest")} className="flex items-center ml-auto hover:text-foreground transition-colors">
                          Open Int.
                          <SortIcon column="openInterest" />
                        </button>
                      </th>
                      <th className="text-right p-2 font-medium text-muted-foreground whitespace-nowrap">
                        <button onClick={() => handleSort("fundingRate")} className="flex items-center ml-auto hover:text-foreground transition-colors">
                          Funding
                          <SortIcon column="fundingRate" />
                        </button>
                      </th>
                      <th className="text-right p-2 font-medium text-muted-foreground whitespace-nowrap">
                        <button onClick={() => handleSort("initialMargin")} className="flex items-center ml-auto hover:text-foreground transition-colors">
                          Init.
                          <SortIcon column="initialMargin" />
                        </button>
                      </th>
                      <th className="text-right p-2 font-medium text-muted-foreground whitespace-nowrap">
                        <button onClick={() => handleSort("maintenanceMargin")} className="flex items-center ml-auto hover:text-foreground transition-colors">
                          Maint.
                          <SortIcon column="maintenanceMargin" />
                        </button>
                      </th>
                      <th className="text-center p-2 font-medium text-muted-foreground whitespace-nowrap">
                        <button onClick={() => handleSort("status")} className="flex items-center mx-auto hover:text-foreground transition-colors">
                          Status
                          <SortIcon column="status" />
                        </button>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedMarkets.map(([ticker, market]) => {
                      const priceChange = market.priceChange24H ? parseFloat(market.priceChange24H) : 0;
                      const fundingRate = market.nextFundingRate ? parseFloat(market.nextFundingRate) : 0;
                      const volume24H = market.volume24H ? parseFloat(market.volume24H) : null;
                      const trades24H = market.trades24H ?? null;
                      const openInterest = market.openInterest ? parseFloat(market.openInterest) : 0;
                      const oraclePrice = market.oraclePrice ? parseFloat(market.oraclePrice) : 0;
                      const imf = market.initialMarginFraction ? parseFloat(market.initialMarginFraction) : 0;
                      const mmf = market.maintenanceMarginFraction ? parseFloat(market.maintenanceMarginFraction) : 0;

                      return (
                        <tr key={ticker} className="border-b border-border hover:bg-muted/30 transition-colors">
                          <td className="sticky left-0 bg-card p-2">
                            <div className="flex items-center gap-2 min-w-[180px] max-w-[200px]">
                              <span
                                className="font-medium whitespace-nowrap overflow-hidden text-ellipsis"
                                title={ticker}
                              >
                                {ticker.length > 20 ? ticker.slice(0, 20) + '...' : ticker}
                              </span>
                              <Badge variant="outline" className="text-[10px] px-1 py-0 flex-shrink-0">
                                {market.marketType === 'CROSS' ? 'C' : 'I'}
                              </Badge>
                            </div>
                          </td>
                          <td className="p-2 text-right font-medium whitespace-nowrap">
                            ${oraclePrice.toFixed(2)}
                          </td>
                          <td className="p-2 text-right whitespace-nowrap">
                            {market.priceChange24H ? (
                              <span className={`font-medium ${priceChange >= 0 ? 'text-success' : 'text-destructive'}`}>
                                {priceChange >= 0 ? '+' : ''}${priceChange.toFixed(2)}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                          <td className="p-2 text-right whitespace-nowrap">
                            {volume24H !== null ? `$${volume24H.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : <span className="text-muted-foreground">—</span>}
                          </td>
                          <td className="p-2 text-right whitespace-nowrap">
                            {trades24H !== null ? trades24H.toLocaleString() : <span className="text-muted-foreground">—</span>}
                          </td>
                          <td className="p-2 text-right whitespace-nowrap">
                            {openInterest.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                          </td>
                          <td className="p-2 text-right whitespace-nowrap">
                            {market.nextFundingRate ? (
                              <span className={fundingRate >= 0 ? 'text-success' : 'text-destructive'}>
                                {(fundingRate * 100).toFixed(4)}%
                              </span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                          <td className="p-2 text-right whitespace-nowrap">
                            {(imf * 100).toFixed(1)}%
                          </td>
                          <td className="p-2 text-right whitespace-nowrap">
                            {(mmf * 100).toFixed(1)}%
                          </td>
                          <td className="p-2 text-center whitespace-nowrap">
                            <Badge
                              variant={market.status === "ACTIVE" ? "success" : market.status === "FINAL_SETTLEMENT" ? "warning" : "secondary"}
                              className="text-[10px] px-1.5 py-0"
                            >
                              {market.status || "—"}
                            </Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
          </>
        )}
      </main>
    </div>
  );
}
