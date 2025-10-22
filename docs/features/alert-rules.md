# Alert Rules

Alert Rules allow you to create custom conditions for monitoring your positions. When conditions are met, you'll receive notifications through your configured channels.

## Creating an Alert Rule

1. Navigate to the **Alert Rules** page
2. Click **"New Alert Rule"**
3. Fill in the rule configuration
4. Click **"Check Alert Rule"** to validate
5. Click **"Create Rule"** to save

## Rule Configuration

### Basic Settings

- **Rule Name**: Descriptive name for the rule
- **Subaccount**: Which subaccount to monitor
- **Alert Severity**: Info, Warning, or Critical

### Alert Scope

Choose between two alert scopes:

- **Account Level**: Monitors overall account metrics
- **Position Level**: Monitors specific position metrics (requires selecting a market)

## Account-Level Conditions

These conditions monitor your entire account:

### Liquidation Distance (%)
Alert when your account can only drop X% before liquidation.

```
Example: Alert if distance < 15%
Use case: Early warning before liquidation risk
```

### Margin Ratio (x)
Alert when your margin ratio falls below a threshold.

```
Example: Alert if ratio < 2.0x
Use case: Monitor overall leverage
```

### Equity Drop (USD)
Alert when total equity falls below a USD value.

```
Example: Alert if equity < $10,000
Use case: Protect minimum account value
```

### Position Size (USD)
Alert when total position size exceeds a threshold.

```
Example: Alert if size > $50,000
Use case: Control maximum exposure
```

### Free Collateral (USD)
Alert when available collateral falls below a threshold.

```
Example: Alert if collateral < $5,000
Use case: Ensure trading buffer
```

## Position-Level Conditions

These conditions monitor specific positions:

### Position PnL %
Alert based on unrealized PnL percentage.

```
Example: Alert if PnL < -10%
Use case: Stop loss notifications
```

### Position PnL USD
Alert based on unrealized PnL in USD.

```
Example: Alert if PnL < -$1,000
Use case: Dollar-based risk management
```

### Position Size USD
Alert when position size meets condition.

```
Example: Alert if size > $20,000
Use case: Position size limits
```

### Position Liquidation Distance (%)
Alert when specific position approaches liquidation.

```
Example: Alert if distance < 20%
Use case: Per-position risk management
```

### Position Leverage (x)
Alert when position leverage exceeds threshold.

```
Example: Alert if leverage > 5x
Use case: Leverage limits per position
```

## Comparison Operators

Choose how to compare values:

- `<` - Less than
- `<=` - Less than or equal
- `>` - Greater than
- `>=` - Greater than or equal
- `==` - Equal to

## Notification Channels

Select which channels should receive this alert. You can choose multiple channels per rule.

## Alert Lifecycle

**Important**: Alert rules fire **once** when the condition is first met, then automatically archive.

- When a rule's condition is met, it triggers an alert immediately
- The rule is then **archived** to prevent duplicate alerts
- Archived rules no longer evaluate - they've served their purpose
- You can create a new rule if you want to monitor the same condition again

::: info Why Single-Fire?
This design prevents alert spam and ensures you receive actionable notifications. Each rule represents a specific threshold breach that warrants immediate attention. Once you're alerted, you can take action and create a new rule if needed.
:::

## Rule Limits

- Maximum 25 active alert rules per account
- Archived rules don't count toward the limit
- Rules can be enabled/disabled without deleting

## Rule Validation

Use the **"Check Alert Rule"** button before creating to:

- Validate all settings
- See a preview of what the alert would look like
- Check if the alert would trigger immediately with current values
- View current metric values

::: tip Best Practice
Start with conservative thresholds and adjust based on your risk tolerance and market conditions.
:::

## Managing Rules

From the Alert Rules page, you can:

- **Enable/Disable**: Toggle rules on/off without deleting
- **Edit**: Modify existing rule settings before they trigger
- **Delete**: Permanently remove a rule
- **Filter**: Search and filter by condition, severity, subaccount, etc.
- **View Archived**: Rules automatically archive after triggering - view your alert history here

::: warning Important
Alerts are evaluated in real-time. Ensure your notification channels are properly configured and tested before relying on critical alerts.
:::
