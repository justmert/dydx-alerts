export default function AlertRules() {
  return (
    <div>
      <h1>Alert Rules</h1>
      <p>
        Alert Rules allow you to create custom conditions for monitoring your positions. 
        When conditions are met, you'll receive notifications through your configured channels.
      </p>

      <h2>Creating an Alert Rule</h2>
      <ol>
        <li>Navigate to the <strong>Alert Rules</strong> page</li>
        <li>Click <strong>"New Alert Rule"</strong></li>
        <li>Fill in the rule configuration</li>
        <li>Click <strong>"Check Alert Rule"</strong> to validate</li>
        <li>Click <strong>"Create Rule"</strong> to save</li>
      </ol>

      <h2>Rule Configuration</h2>

      <h3>Basic Settings</h3>
      <ul>
        <li><strong>Rule Name:</strong> Descriptive name for the rule</li>
        <li><strong>Subaccount:</strong> Which subaccount to monitor</li>
        <li><strong>Alert Severity:</strong> Info, Warning, or Critical</li>
      </ul>

      <h3>Alert Scope</h3>
      <p>Choose between two alert scopes:</p>
      <ul>
        <li><strong>Account Level:</strong> Monitors overall account metrics</li>
        <li><strong>Position Level:</strong> Monitors specific position metrics (requires selecting a market)</li>
      </ul>

      <h2>Account-Level Conditions</h2>
      <p>These conditions monitor your entire account:</p>

      <h3>Liquidation Distance (%)</h3>
      <p>Alert when your account can only drop X% before liquidation.</p>
      <pre><code>Example: Alert if distance {" <"} 15%
Use case: Early warning before liquidation risk</code></pre>

      <h3>Margin Ratio (x)</h3>
      <p>Alert when your margin ratio falls below a threshold.</p>
      <pre><code>Example: Alert if ratio {" <"} 2.0x
Use case: Monitor overall leverage</code></pre>

      <h3>Equity Drop (USD)</h3>
      <p>Alert when total equity falls below a USD value.</p>
      <pre><code>Example: Alert if equity {" <"} $10,000
Use case: Protect minimum account value</code></pre>

      <h3>Position Size (USD)</h3>
      <p>Alert when total position size exceeds a threshold.</p>
      <pre><code>Example: Alert if size {" >"} $50,000
Use case: Control maximum exposure</code></pre>

      <h3>Free Collateral (USD)</h3>
      <p>Alert when available collateral falls below a threshold.</p>
      <pre><code>Example: Alert if collateral {" <"} $5,000
Use case: Ensure trading buffer</code></pre>

      <h2>Position-Level Conditions</h2>
      <p>These conditions monitor specific positions:</p>

      <h3>Position PnL %</h3>
      <p>Alert based on unrealized PnL percentage.</p>
      <pre><code>Example: Alert if PnL {" <"} -10%
Use case: Stop loss notifications</code></pre>

      <h3>Position PnL USD</h3>
      <p>Alert based on unrealized PnL in USD.</p>
      <pre><code>Example: Alert if PnL {" <"} -$1,000
Use case: Dollar-based risk management</code></pre>

      <h3>Position Size USD</h3>
      <p>Alert when position size meets condition.</p>
      <pre><code>Example: Alert if size {" >"} $20,000
Use case: Position size limits</code></pre>

      <h3>Position Liquidation Distance (%)</h3>
      <p>Alert when specific position approaches liquidation.</p>
      <pre><code>Example: Alert if distance {" <"} 20%
Use case: Per-position risk management</code></pre>

      <h3>Position Leverage (x)</h3>
      <p>Alert when position leverage exceeds threshold.</p>
      <pre><code>Example: Alert if leverage {" >"} 5x
Use case: Leverage limits per position</code></pre>

      <h2>Comparison Operators</h2>
      <p>Choose how to compare values:</p>
      <ul>
        <li><code>{"<"}</code> - Less than</li>
        <li><code>{"<="}</code> - Less than or equal</li>
        <li><code>{">"}</code> - Greater than</li>
        <li><code>{">="}</code> - Greater than or equal</li>
        <li><code>==</code> - Equal to</li>
      </ul>

      <h2>Notification Channels</h2>
      <p>Select which channels should receive this alert. You can choose multiple channels per rule.</p>

      <h2>Cooldown Period</h2>
      <p>
        Set a cooldown period (in seconds) to prevent spam. After an alert fires, it won't fire again 
        for the same rule until the cooldown expires.
      </p>
      <pre><code>Default: 3600 seconds (1 hour)
Range: 60 seconds to 86400 seconds (24 hours)</code></pre>

      <h2>Rule Limits</h2>
      <ul>
        <li>Maximum 25 active alert rules per account</li>
        <li>Archived rules don't count toward the limit</li>
        <li>Rules can be enabled/disabled without deleting</li>
      </ul>

      <h2>Rule Validation</h2>
      <p>Use the <strong>"Check Alert Rule"</strong> button before creating to:</p>
      <ul>
        <li>Validate all settings</li>
        <li>See a preview of what the alert would look like</li>
        <li>Check if the alert would trigger immediately with current values</li>
        <li>View current metric values</li>
      </ul>

      <div className="tip">
        <strong>Tip:</strong> Start with conservative thresholds and adjust based on your risk tolerance and market conditions.
      </div>

      <h2>Managing Rules</h2>
      <p>From the Alert Rules page, you can:</p>
      <ul>
        <li><strong>Enable/Disable:</strong> Toggle rules on/off without deleting</li>
        <li><strong>Edit:</strong> Modify existing rule settings</li>
        <li><strong>Delete:</strong> Permanently remove a rule</li>
        <li><strong>Filter:</strong> Search and filter by condition, severity, subaccount, etc.</li>
        <li><strong>Archive:</strong> Rules automatically archive when triggered and condition no longer met</li>
      </ul>

      <div className="warning">
        <strong>Important:</strong> Alerts are evaluated in real-time. Ensure your notification channels are properly configured 
        and tested before relying on critical alerts.
      </div>
    </div>
  )
}
