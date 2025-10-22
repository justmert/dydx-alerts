export default function Dashboard() {
  return (
    <div>
      <h1>Dashboard</h1>
      <p>
        The Dashboard is your central hub for monitoring all your dYdX v4 positions and alerts in one place.
      </p>

      <h2>Portfolio Overview</h2>
      <p>At the top of the dashboard, you'll find key statistics:</p>
      <ul>
        <li><strong>Active Subaccounts:</strong> Number of subaccounts currently being monitored</li>
        <li><strong>Alert Rules:</strong> Total number of active alert rules configured</li>
        <li><strong>Critical Alerts:</strong> Count of critical-severity alerts in the last 24 hours</li>
        <li><strong>Notification Channels:</strong> Number of configured notification channels</li>
      </ul>

      <h2>Monitored Subaccounts</h2>
      <p>View all your tracked subaccounts with live metrics:</p>
      <ul>
        <li><strong>Nickname & Address:</strong> Easy identification of each account</li>
        <li><strong>Status Badge:</strong> Visual indicator (Safe, Warning, Critical)</li>
        <li><strong>Equity:</strong> Total account equity in USD</li>
        <li><strong>Margin Ratio:</strong> Current leverage multiplier</li>
        <li><strong>Liquidation Distance:</strong> Percentage buffer before liquidation</li>
        <li><strong>Open Positions:</strong> Number of active positions</li>
      </ul>

      <h3>Expandable Position Details</h3>
      <p>Click any subaccount row to expand and see all open positions with:</p>
      <ul>
        <li>Market ticker (e.g., BTC-USD)</li>
        <li>Position side (LONG or SHORT)</li>
        <li>Entry price</li>
        <li>Liquidation price</li>
        <li>Leverage</li>
        <li>Unrealized PnL (color-coded green/red)</li>
      </ul>

      <h2>Active Markets</h2>
      <p>See all markets where you have active positions across any subaccount:</p>
      <ul>
        <li>Current oracle price</li>
        <li>24-hour price change (with percentage)</li>
        <li>Funding rate</li>
        <li>24-hour volume</li>
      </ul>

      <h2>Recent Alerts</h2>
      <p>The dashboard displays the 5 most recent alerts, showing:</p>
      <ul>
        <li><strong>Rule Name:</strong> The alert rule that triggered</li>
        <li><strong>Condition:</strong> What condition was met</li>
        <li><strong>Severity:</strong> Info, Warning, or Critical badge</li>
        <li><strong>Scope:</strong> Account-level or Position-level</li>
        <li><strong>Market:</strong> Specific position market (if position-level)</li>
        <li><strong>Subaccount:</strong> Which account triggered the alert</li>
        <li><strong>Time:</strong> When the alert was fired</li>
      </ul>

      <h2>Active Alert Rules Summary</h2>
      <p>Quick overview of all enabled alert rules with:</p>
      <ul>
        <li>Rule name</li>
        <li>Condition type</li>
        <li>Status (Active/Paused)</li>
        <li>Associated subaccount</li>
      </ul>

      <h2>Real-time Updates</h2>
      <p>
        The dashboard updates in real-time using WebSocket connections. You'll see live updates for:
      </p>
      <ul>
        <li>Position metrics (PnL, leverage, etc.)</li>
        <li>Market prices and funding rates</li>
        <li>New alerts as they trigger</li>
        <li>Account status changes</li>
      </ul>

      <div className="tip">
        <strong>Tip:</strong> The dashboard is designed to give you a quick overview. For detailed information about specific features, 
        visit the dedicated pages (Subaccounts, Alert Rules, etc.).
      </div>
    </div>
  )
}
