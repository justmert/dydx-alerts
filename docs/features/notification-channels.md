# Notification Channels

Notification Channels define where your alerts are sent. Configure multiple channels to ensure you never miss important notifications.

## Supported Channel Types

### 📱 Telegram
Receive alerts directly in Telegram (personal or group chat).

**Setup:**
1. Open Telegram and search for `@userinfobot`
2. Start a chat and it will send you your Chat ID
3. In the app, click **"Add Channel"** → Telegram
4. Enter your Bot Token and Chat ID
5. Click **"Test"** to verify

::: info Bot Token
Contact @BotFather on Telegram to create a bot and get your token.
:::

### 💬 Discord
Send alerts to a Discord server channel.

**Setup:**
1. Go to your Discord server
2. Navigate to Server Settings → Integrations → Webhooks
3. Click **"New Webhook"**
4. Choose the channel and copy the Webhook URL
5. In the app, add the Discord channel with your webhook URL
6. Click **"Test"** to verify

### 💼 Slack
Post alerts to a Slack workspace channel.

**Setup:**
1. Go to your Slack workspace
2. Navigate to Apps → Incoming Webhooks
3. Create a new webhook and choose a channel
4. Copy the Webhook URL
5. In the app, add the Slack channel with your webhook URL
6. Click **"Test"** to verify

### 📧 Email
Receive alerts via email.

**Setup:**
1. Click **"Add Channel"** → Email
2. Enter your email address
3. Click **"Test"** to verify (check spam folder)

::: warning Delivery Time
Email delivery can be slower than other channels (30 seconds to few minutes).
:::

### 🚨 PagerDuty
Create incidents in PagerDuty for critical alerts.

**Setup:**
1. Log in to PagerDuty
2. Go to Services → Select/Create a service
3. Add an integration → Events API v2
4. Copy the Integration Key
5. In the app, add PagerDuty channel with the integration key
6. Click **"Test"** to verify

### 🔗 Custom Webhook
Send alerts to any HTTP endpoint.

**Setup:**
1. Prepare your webhook endpoint
2. In the app, click **"Add Channel"** → Webhook
3. Enter your webhook URL
4. Select HTTP method (POST recommended)
5. Click **"Test"** to verify

**Webhook Payload:**
```json
{
  "severity": "critical",
  "message": "Alert message text",
  "subaccount": "Account name",
  "timestamp": "2024-10-22T10:30:00Z",
  "metadata": {
    "market": "BTC-USD",
    "condition": "Liquidation Distance"
  }
}
```

## Managing Channels

### Testing Channels
Always test new channels before using them for alerts. Click the **"Test"** button to send a test notification.

### Editing Channels
Modify channel settings by clicking **"Edit"**. You can update:
- Channel credentials/URLs
- Channel name/description
- Enable/disable status

### Deleting Channels
You can delete channels that are no longer needed. However, you cannot delete a channel if it's used by any active alert rules. Disable or update those rules first.

## Channel Status

Channels can have these statuses:
- **Enabled**: Active and will receive alerts
- **Disabled**: Paused, won't receive alerts
- **Error**: Last delivery failed (check configuration)

## Best Practices

### Multiple Channels
Configure multiple channels for redundancy. If one fails, others ensure you still receive notifications.

### Severity-Based Routing
Use different channels for different severities:
- **Info**: Email
- **Warning**: Telegram/Discord
- **Critical**: PagerDuty + Telegram

### Testing
Always test channels after setup and periodically verify they're working. Some services (like webhooks) may change URLs or expire tokens.

::: tip Recommended Channels
For critical alerts, use instant channels like Telegram or Discord. Email is better suited for informational alerts due to potential delays.
:::

## Security

Keep your channel credentials secure:
- Never share bot tokens or webhook URLs publicly
- Rotate credentials if compromised
- Use separate bots/webhooks for different purposes
- Limit webhook endpoint access to known IPs if possible
