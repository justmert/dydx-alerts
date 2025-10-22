# Markets

The Markets page displays real-time data for all dYdX v4 perpetual markets, helping you make informed trading decisions.

## Market Table

View comprehensive market data with these columns:

### Market Information
- **Market**: Trading pair (e.g., BTC-USD)
- **Type**: Cross (C) or Isolated (I) margin
- **Status**: Active or Final Settlement

### Price Data
- **Oracle Price**: Current market price in USD
- **24h Change**: Price change over last 24 hours (color-coded)

### Trading Activity
- **24h Volume**: Total trading volume in USD
- **Trades**: Number of trades executed
- **Open Interest**: Total value of open positions

### Funding & Margin
- **Funding Rate**: Current funding rate (%)
- **Initial Margin**: Required collateral to open positions (%)
- **Maintenance Margin**: Minimum collateral to maintain positions (%)

## Understanding Metrics

### Oracle Price
The oracle price is the reference price used for mark-to-market calculations, liquidations, and funding rates. It's sourced from multiple price feeds to ensure accuracy.

### Funding Rate
Funding rates are periodic payments between long and short positions:

- **Positive (+)**: Longs pay shorts (market is bullish)
- **Negative (-)**: Shorts pay longs (market is bearish)
- **Frequency**: Payments occur every 8 hours on dYdX v4

::: info Funding Example
If BTC-USD has a +0.01% funding rate and you hold a $10,000 long position, you'll pay $1 every 8 hours to short holders.
:::

### Margin Requirements
Margin requirements vary by market based on volatility and liquidity:

- **Initial Margin**: Required to open a position (typically 5-20%)
- **Maintenance Margin**: Minimum to avoid liquidation (typically 3-10%)

**Example:**
```
Market: BTC-USD
Initial Margin: 10%
Maintenance Margin: 5%

To open $10,000 position: Need $1,000 collateral
Liquidation occurs if: Collateral falls below $500
```

## Market Features

### Sorting
Click any column header to sort markets by that metric:
- Sort by volume to see most active markets
- Sort by 24h change to identify biggest movers
- Sort by funding rate to find carry opportunities

### Search
Use the search box to quickly find specific markets. Search supports partial matching (e.g., "BTC" finds BTC-USD, BTCETH, etc.).

### Real-time Updates
Market data updates automatically every 5 seconds. Price changes and other metrics reflect the latest data from the dYdX v4 Indexer.

## Using Market Data

### For Position Monitoring
Compare current oracle prices with your entry prices to estimate PnL. Check funding rates to understand ongoing costs for your positions.

### For Alert Rules
Use market data to set appropriate alert thresholds. For example, if a market has high volatility (large 24h changes), you may want wider liquidation distance thresholds.

### For Trading Decisions
Market data helps identify:
- **Trending markets**: Large 24h changes
- **Liquid markets**: High volume and trades
- **Funding opportunities**: Extreme funding rates
- **Market sentiment**: Positive/negative funding

## Market Types

### Cross Margin (C)
Cross margin markets use your entire account balance as collateral. If one position is liquidated, all positions may be affected.

### Isolated Margin (I)
Isolated margin markets use only allocated collateral for that specific position. Liquidation of one position doesn't affect others.

::: tip Market Selection
Cross margin allows higher leverage across multiple positions but increases overall account risk. Isolated margin provides better risk control for individual positions.
:::

## Market Status

- **ACTIVE**: Normal trading and funding
- **FINAL_SETTLEMENT**: Market is closing, positions will be settled

::: warning Important
Oracle prices can differ from exchange prices during high volatility. Always monitor both when managing positions near liquidation.
:::
