export default function Markets() {
  return (
    <div>
      <h1>Markets</h1>
      <p>
        The Markets page displays real-time data for all dYdX v4 perpetual markets, 
        helping you make informed trading decisions.
      </p>

      <h2>Market Table</h2>
      <p>View comprehensive market data with these columns:</p>

      <h3>Market Information</h3>
      <ul>
        <li><strong>Market:</strong> Trading pair (e.g., BTC-USD)</li>
        <li><strong>Type:</strong> Cross (C) or Isolated (I) margin</li>
        <li><strong>Status:</strong> Active or Final Settlement</li>
      </ul>

      <h3>Price Data</h3>
      <ul>
        <li><strong>Oracle Price:</strong> Current market price in USD</li>
        <li><strong>24h Change:</strong> Price change over last 24 hours (color-coded)</li>
      </ul>

      <h3>Trading Activity</h3>
      <ul>
        <li><strong>24h Volume:</strong> Total trading volume in USD</li>
        <li><strong>Trades:</strong> Number of trades executed</li>
        <li><strong>Open Interest:</strong> Total value of open positions</li>
      </ul>

      <h3>Funding & Margin</h3>
      <ul>
        <li><strong>Funding Rate:</strong> Current funding rate (%)</li>
        <li><strong>Initial Margin:</strong> Required collateral to open positions (%)</li>
        <li><strong>Maintenance Margin:</strong> Minimum collateral to maintain positions (%)</li>
      </ul>

      <h2>Understanding Metrics</h2>

      <h3>Oracle Price</h3>
      <p>
        The oracle price is the reference price used for mark-to-market calculations, 
        liquidations, and funding rates. It's sourced from multiple price feeds to ensure accuracy.
      </p>

      <h3>Funding Rate</h3>
      <p>
        Funding rates are periodic payments between long and short positions:
      </p>
      <ul>
        <li><strong>Positive (+):</strong> Longs pay shorts (market is bullish)</li>
        <li><strong>Negative (-):</strong> Shorts pay longs (market is bearish)</li>
        <li><strong>Frequency:</strong> Payments occur every 8 hours on dYdX v4</li>
      </ul>

      <div className="note">
        <strong>Funding Example:</strong> If BTC-USD has a +0.01% funding rate and you hold a $10,000 long position, 
        you'll pay $1 every 8 hours to short holders.
      </div>

      <h3>Margin Requirements</h3>
      <p>
        Margin requirements vary by market based on volatility and liquidity:
      </p>
      <ul>
        <li><strong>Initial Margin:</strong> Required to open a position (typically 5-20%)</li>
        <li><strong>Maintenance Margin:</strong> Minimum to avoid liquidation (typically 3-10%)</li>
      </ul>

      <h4>Example:</h4>
      <pre><code>Market: BTC-USD
Initial Margin: 10%
Maintenance Margin: 5%

To open $10,000 position: Need $1,000 collateral
Liquidation occurs if: Collateral falls below $500</code></pre>

      <h2>Market Features</h2>

      <h3>Sorting</h3>
      <p>Click any column header to sort markets by that metric:</p>
      <ul>
        <li>Sort by volume to see most active markets</li>
        <li>Sort by 24h change to identify biggest movers</li>
        <li>Sort by funding rate to find carry opportunities</li>
      </ul>

      <h3>Search</h3>
      <p>
        Use the search box to quickly find specific markets. Search supports 
        partial matching (e.g., "BTC" finds BTC-USD, BTCETH, etc.).
      </p>

      <h3>Real-time Updates</h3>
      <p>
        Market data updates automatically every 5 seconds. Price changes and 
        other metrics reflect the latest data from the dYdX v4 Indexer.
      </p>

      <h2>Using Market Data</h2>

      <h3>For Position Monitoring</h3>
      <p>
        Compare current oracle prices with your entry prices to estimate PnL. 
        Check funding rates to understand ongoing costs for your positions.
      </p>

      <h3>For Alert Rules</h3>
      <p>
        Use market data to set appropriate alert thresholds. For example, 
        if a market has high volatility (large 24h changes), you may want wider 
        liquidation distance thresholds.
      </p>

      <h3>For Trading Decisions</h3>
      <p>Market data helps identify:</p>
      <ul>
        <li><strong>Trending markets:</strong> Large 24h changes</li>
        <li><strong>Liquid markets:</strong> High volume and trades</li>
        <li><strong>Funding opportunities:</strong> Extreme funding rates</li>
        <li><strong>Market sentiment:</strong> Positive/negative funding</li>
      </ul>

      <h2>Market Types</h2>

      <h3>Cross Margin (C)</h3>
      <p>
        Cross margin markets use your entire account balance as collateral. 
        If one position is liquidated, all positions may be affected.
      </p>

      <h3>Isolated Margin (I)</h3>
      <p>
        Isolated margin markets use only allocated collateral for that specific position. 
        Liquidation of one position doesn't affect others.
      </p>

      <div className="tip">
        <strong>Tip:</strong> Cross margin allows higher leverage across multiple positions but increases 
        overall account risk. Isolated margin provides better risk control for individual positions.
      </div>

      <h2>Market Status</h2>
      <ul>
        <li><strong>ACTIVE:</strong> Normal trading and funding</li>
        <li><strong>FINAL_SETTLEMENT:</strong> Market is closing, positions will be settled</li>
      </ul>

      <div className="warning">
        <strong>Important:</strong> Oracle prices can differ from exchange prices during high volatility. 
        Always monitor both when managing positions near liquidation.
      </div>
    </div>
  )
}
