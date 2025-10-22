# Getting Started

Welcome to the dYdX Alert System! This guide will help you get started with monitoring your dYdX v4 positions and setting up alerts.

## Step 1: Register an Account

Visit [alertsdydx.com](https://alertsdydx.com) and create an account.

1. Go to alertsdydx.com
2. Click "Sign Up"
3. Sign up with your email or connect with GitHub/Google
4. Follow the authentication prompts

## Step 2: Add Your Subaccount

After logging in, add your dYdX v4 subaccount to start monitoring:

1. Navigate to the **Subaccounts** page
2. Click **"Add Subaccount"**
3. Enter your dYdX address (starts with "dydx1...")
4. Enter your subaccount number (usually 0 for the main account)
5. Optionally add a nickname for easy identification
6. Click **"Add"**

::: tip Finding Your dYdX Address
You can find your dYdX address in the dYdX v4 web app in the top right corner when you connect your wallet.
:::

## Step 3: Configure Notification Channels

Set up at least one notification channel to receive alerts:

1. Go to **Notification Channels**
2. Click **"Add Channel"**
3. Choose your preferred channel type (Telegram, Discord, etc.)
4. Follow the setup instructions for that channel
5. Test the channel to ensure it works

### Popular Channel Options

- **Telegram**: Get your Chat ID from @userinfobot
- **Discord**: Create a webhook in Server Settings → Integrations
- **Email**: Use any email address

## Step 4: Create Alert Rules

Create custom alert rules to monitor your positions:

1. Navigate to **Alert Rules**
2. Click **"New Alert Rule"**
3. Select the subaccount to monitor
4. Choose alert scope (Account Level or Position Level)
5. Select a condition type (e.g., Liquidation Distance)
6. Set your threshold value
7. Choose notification channels
8. Click **"Check Alert Rule"** to validate
9. Click **"Create Rule"** to save

::: info Alert Behavior
Alert rules fire once when the condition is met, then automatically archive. This ensures you receive actionable notifications without spam. You can create a new rule if you want to monitor the same condition again.
:::

## Step 5: Monitor Your Dashboard

Once set up, visit the Dashboard to see:

- Overview of all monitored subaccounts
- Current position status and risk metrics
- Recent alerts and their severity
- Active alert rules
- Real-time market data

## Next Steps

Now that you're set up, explore these features:

- View [detailed subaccount metrics](/features/subaccounts)
- Learn about [alert rule conditions](/features/alert-rules)
- Set up [notification channels](/features/notification-channels)
- Configure [timezone preferences](/features/settings)

::: info Need Help?
If you encounter any issues, check out the individual feature pages in this documentation or visit our [GitHub repository](https://github.com/justmert/dydx-alerts).
:::
