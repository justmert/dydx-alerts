export default function Subaccounts() {
  return (
    <div>
      <h1>Subaccounts</h1>
      <p>
        The Subaccounts page allows you to add, manage, and monitor your dYdX v4 subaccounts in detail.
      </p>

      <h2>Adding a Subaccount</h2>
      <p>To start monitoring a subaccount:</p>
      <ol>
        <li>Click the <strong>"Add Subaccount"</strong> button</li>
        <li>Enter the dYdX address (e.g., <code>dydx1abc...xyz</code>)</li>
        <li>Enter the subaccount number (default is 0)</li>
        <li>Optionally add a nickname for easy identification</li>
        <li>Click <strong>"Add"</strong></li>
      </ol>

      <div className="note">
        <strong>Finding Your Address:</strong> You can find your dYdX v4 address in the dYdX web app 
        by clicking on your wallet in the top right corner.
      </div>

      <h2>Subaccount Table</h2>
      <p>The main table displays all monitored subaccounts with these columns:</p>
      <ul>
        <li><strong>Account:</strong> Nickname (if set) or address + subaccount number</li>
        <li><strong>Status:</strong> Safe (green), Warning (yellow), or Critical (red)</li>
        <li><strong>Equity:</strong> Total account value in USD</li>
        <li><strong>Margin Ratio:</strong> Current leverage (e.g., 2.5x)</li>
        <li><strong>Liquidation Distance:</strong> How far price can move before liquidation (%)</li>
        <li><strong>Positions:</strong> Number of open positions</li>
        <li><strong>Actions:</strong> View details, edit, or delete</li>
      </ul>

      <h2>Viewing Position Details</h2>
      <p>Click the expand icon on any row to see all open positions for that subaccount:</p>

      <h3>For Each Position:</h3>
      <ul>
        <li><strong>Market:</strong> Trading pair (e.g., BTC-USD)</li>
        <li><strong>Side:</strong> LONG or SHORT badge</li>
        <li><strong>Margin Mode:</strong> CROSS or ISOLATED</li>
        <li><strong>Size:</strong> Position size in both contracts and USD</li>
        <li><strong>Entry Price:</strong> Average entry price</li>
        <li><strong>Oracle Price:</strong> Current market price</li>
        <li><strong>Liquidation Price:</strong> Price at which position gets liquidated</li>
        <li><strong>Leverage:</strong> Position leverage multiplier</li>
        <li><strong>Unrealized PnL:</strong> Current profit/loss ($ and %)</li>
      </ul>

      <h2>Detailed Subaccount View</h2>
      <p>Click on any subaccount to access the detailed view page with:</p>

      <h3>Account Metrics</h3>
      <ul>
        <li>Equity</li>
        <li>Free Collateral</li>
        <li>Initial Margin Requirement</li>
        <li>Maintenance Margin Requirement</li>
        <li>Margin Ratio</li>
        <li>Liquidation Distance</li>
        <li>Initial Margin %</li>
        <li>Maintenance Margin %</li>
      </ul>

      <h3>Position Management</h3>
      <p>For each open position, view extended metrics:</p>
      <ul>
        <li>Funding payments</li>
        <li>Realized PnL</li>
        <li>Position history</li>
      </ul>

      <h3>Quick Actions</h3>
      <ul>
        <li><strong>Edit Nickname:</strong> Change the display name</li>
        <li><strong>Pause/Resume:</strong> Temporarily stop monitoring</li>
        <li><strong>Add Alert Rule:</strong> Quick access to create rules for this subaccount</li>
        <li><strong>Delete:</strong> Remove subaccount from monitoring</li>
      </ul>

      <h2>Status Indicators</h2>
      <p>Subaccounts are automatically assigned status based on risk metrics:</p>
      <ul>
        <li><strong className="text-green">Safe:</strong> Liquidation distance {">"} 20%</li>
        <li><strong className="text-yellow">Warning:</strong> Liquidation distance 10-20%</li>
        <li><strong className="text-red">Critical:</strong> Liquidation distance {"<"} 10%</li>
      </ul>

      <div className="warning">
        <strong>Important:</strong> Status thresholds are guidelines. Always monitor your positions actively, 
        especially in volatile markets. Set up alert rules for early warnings.
      </div>

      <h2>Data Updates</h2>
      <p>
        Subaccount data is updated in real-time via WebSocket. Position metrics recalculate automatically 
        when market prices change, ensuring you always have the latest information.
      </p>
    </div>
  )
}
