# Dashboard

The Dashboard is your central hub for monitoring all your dYdX v4 positions and alerts in one place.

## Portfolio Overview

At the top of the dashboard, you'll find key statistics:

- **Active Subaccounts**: Number of subaccounts currently being monitored
- **Alert Rules**: Total number of active alert rules configured
- **Critical Alerts**: Count of critical-severity alerts in the last 24 hours
- **Notification Channels**: Number of configured notification channels

## Monitored Subaccounts

View all your tracked subaccounts with live metrics:

| Metric | Description |
|--------|-------------|
| Nickname & Address | Easy identification of each account |
| Status Badge | Visual indicator (Safe, Warning, Critical) |
| Equity | Total account equity in USD |
| Margin Ratio | Current leverage multiplier |
| Liquidation Distance | Percentage buffer before liquidation |
| Open Positions | Number of active positions |

### Expandable Position Details

Click any subaccount row to expand and see all open positions with:

- Market ticker (e.g., BTC-USD)
- Position side (LONG or SHORT)
- Entry price
- Liquidation price
- Leverage
- Unrealized PnL (color-coded green/red)

## Active Markets

See all markets where you have active positions across any subaccount:

- Current oracle price
- 24-hour price change (with percentage)
- Funding rate
- 24-hour volume

## Recent Alerts

The dashboard displays the 5 most recent alerts, showing:

- **Rule Name**: The alert rule that triggered
- **Condition**: What condition was met
- **Severity**: Info, Warning, or Critical badge
- **Scope**: Account-level or Position-level
- **Market**: Specific position market (if position-level)
- **Subaccount**: Which account triggered the alert
- **Time**: When the alert was fired

## Active Alert Rules Summary

Quick overview of all enabled alert rules with:

- Rule name
- Condition type
- Status (Active/Paused)
- Associated subaccount

## Real-time Updates

The dashboard updates in real-time using WebSocket connections. You'll see live updates for:

- Position metrics (PnL, leverage, etc.)
- Market prices and funding rates
- New alerts as they trigger
- Account status changes

::: tip Navigation
The dashboard is designed to give you a quick overview. For detailed information about specific features, visit the dedicated pages in the Features section.
:::
