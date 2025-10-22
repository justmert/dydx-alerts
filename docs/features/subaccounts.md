# Subaccounts

The Subaccounts page allows you to add, manage, and monitor your dYdX v4 subaccounts in detail.

## Adding a Subaccount

To start monitoring a subaccount:

1. Click the **"Add Subaccount"** button
2. Enter the dYdX address (e.g., `dydx1abc...xyz`)
3. Enter the subaccount number (default is 0)
4. Optionally add a nickname for easy identification
5. Click **"Add"**

::: info Finding Your Address
You can find your dYdX v4 address in the dYdX web app by clicking on your wallet in the top right corner.
:::

## Subaccount Table

The main table displays all monitored subaccounts with these columns:

- **Account**: Nickname (if set) or address + subaccount number
- **Status**: Safe (green), Warning (yellow), or Critical (red)
- **Equity**: Total account value in USD
- **Margin Ratio**: Current leverage (e.g., 2.5x)
- **Liquidation Distance**: How far price can move before liquidation (%)
- **Positions**: Number of open positions
- **Actions**: View details, edit, or delete

## Viewing Position Details

Click the expand icon on any row to see all open positions for that subaccount:

### For Each Position

- **Market**: Trading pair (e.g., BTC-USD)
- **Side**: LONG or SHORT badge
- **Margin Mode**: CROSS or ISOLATED
- **Size**: Position size in both contracts and USD
- **Entry Price**: Average entry price
- **Oracle Price**: Current market price
- **Liquidation Price**: Price at which position gets liquidated
- **Leverage**: Position leverage multiplier
- **Unrealized PnL**: Current profit/loss ($ and %)

## Detailed Subaccount View

Click on any subaccount to access the detailed view page with:

### Account Metrics

- Equity
- Free Collateral
- Initial Margin Requirement
- Maintenance Margin Requirement
- Margin Ratio
- Liquidation Distance
- Initial Margin %
- Maintenance Margin %

### Position Management

For each open position, view extended metrics:

- Funding payments
- Realized PnL
- Position history

### Quick Actions

- **Edit Nickname**: Change the display name
- **Pause/Resume**: Temporarily stop monitoring
- **Add Alert Rule**: Quick access to create rules for this subaccount
- **Delete**: Remove subaccount from monitoring

## Status Indicators

Subaccounts are automatically assigned status based on risk metrics:

- **Safe**: Liquidation distance > 20%
- **Warning**: Liquidation distance 10-20%
- **Critical**: Liquidation distance < 10%

::: warning Important
Status thresholds are guidelines. Always monitor your positions actively, especially in volatile markets. Set up alert rules for early warnings.
:::

## Data Updates

Subaccount data is updated in real-time via WebSocket. Position metrics recalculate automatically when market prices change, ensuring you always have the latest information.
