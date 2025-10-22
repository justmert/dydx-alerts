export default function NotificationChannels() {
  return (
    <div>
      <h1>Notification Channels</h1>
      <p>
        Notification Channels define where your alerts are sent. Configure multiple channels 
        to ensure you never miss important notifications.
      </p>

      <h2>Supported Channel Types</h2>

      <h3>📱 Telegram</h3>
      <p>Receive alerts directly in Telegram (personal or group chat).</p>
      <h4>Setup:</h4>
      <ol>
        <li>Open Telegram and search for <code>@userinfobot</code></li>
        <li>Start a chat and it will send you your Chat ID</li>
        <li>In the app, click <strong>"Add Channel"</strong> → Telegram</li>
        <li>Enter your Bot Token and Chat ID</li>
        <li>Click <strong>"Test"</strong> to verify</li>
      </ol>
      <div className="note">
        <strong>Bot Token:</strong> Contact @BotFather on Telegram to create a bot and get your token.
      </div>

      <h3>💬 Discord</h3>
      <p>Send alerts to a Discord server channel.</p>
      <h4>Setup:</h4>
      <ol>
        <li>Go to your Discord server</li>
        <li>Navigate to Server Settings → Integrations → Webhooks</li>
        <li>Click <strong>"New Webhook"</strong></li>
        <li>Choose the channel and copy the Webhook URL</li>
        <li>In the app, add the Discord channel with your webhook URL</li>
        <li>Click <strong>"Test"</strong> to verify</li>
      </ol>

      <h3>💼 Slack</h3>
      <p>Post alerts to a Slack workspace channel.</p>
      <h4>Setup:</h4>
      <ol>
        <li>Go to your Slack workspace</li>
        <li>Navigate to Apps → Incoming Webhooks</li>
        <li>Create a new webhook and choose a channel</li>
        <li>Copy the Webhook URL</li>
        <li>In the app, add the Slack channel with your webhook URL</li>
        <li>Click <strong>"Test"</strong> to verify</li>
      </ol>

      <h3>📧 Email</h3>
      <p>Receive alerts via email.</p>
      <h4>Setup:</h4>
      <ol>
        <li>Click <strong>"Add Channel"</strong> → Email</li>
        <li>Enter your email address</li>
        <li>Click <strong>"Test"</strong> to verify (check spam folder)</li>
      </ol>
      <div className="warning">
        <strong>Note:</strong> Email delivery can be slower than other channels (30 seconds to few minutes).
      </div>

      <h3>🚨 PagerDuty</h3>
      <p>Create incidents in PagerDuty for critical alerts.</p>
      <h4>Setup:</h4>
      <ol>
        <li>Log in to PagerDuty</li>
        <li>Go to Services → Select/Create a service</li>
        <li>Add an integration → Events API v2</li>
        <li>Copy the Integration Key</li>
        <li>In the app, add PagerDuty channel with the integration key</li>
        <li>Click <strong>"Test"</strong> to verify</li>
      </ol>

      <h3>🔗 Custom Webhook</h3>
      <p>Send alerts to any HTTP endpoint.</p>
      <h4>Setup:</h4>
      <ol>
        <li>Prepare your webhook endpoint</li>
        <li>In the app, click <strong>"Add Channel"</strong> → Webhook</li>
        <li>Enter your webhook URL</li>
        <li>Select HTTP method (POST recommended)</li>
        <li>Click <strong>"Test"</strong> to verify</li>
      </ol>

      <h4>Webhook Payload:</h4>
      <pre><code>{`{
  "severity": "critical",
  "message": "Alert message text",
  "subaccount": "Account name",
  "timestamp": "2024-10-22T10:30:00Z",
  "metadata": {
    "market": "BTC-USD",
    "condition": "Liquidation Distance"
  }
}`}</code></pre>

      <h2>Managing Channels</h2>
      <p>From the Notification Channels page:</p>

      <h3>Testing Channels</h3>
      <p>
        Always test new channels before using them for alerts. Click the <strong>"Test"</strong> button 
        to send a test notification.
      </p>

      <h3>Editing Channels</h3>
      <p>Modify channel settings by clicking <strong>"Edit"</strong>. You can update:</p>
      <ul>
        <li>Channel credentials/URLs</li>
        <li>Channel name/description</li>
        <li>Enable/disable status</li>
      </ul>

      <h3>Deleting Channels</h3>
      <p>
        You can delete channels that are no longer needed. However, you cannot delete a channel 
        if it's used by any active alert rules. Disable or update those rules first.
      </p>

      <h2>Channel Status</h2>
      <p>Channels can have these statuses:</p>
      <ul>
        <li><strong>Enabled:</strong> Active and will receive alerts</li>
        <li><strong>Disabled:</strong> Paused, won't receive alerts</li>
        <li><strong>Error:</strong> Last delivery failed (check configuration)</li>
      </ul>

      <h2>Best Practices</h2>

      <h3>Multiple Channels</h3>
      <p>
        Configure multiple channels for redundancy. If one fails, others ensure you still 
        receive notifications.
      </p>

      <h3>Severity-Based Routing</h3>
      <p>Use different channels for different severities:</p>
      <ul>
        <li><strong>Info:</strong> Email</li>
        <li><strong>Warning:</strong> Telegram/Discord</li>
        <li><strong>Critical:</strong> PagerDuty + Telegram</li>
      </ul>

      <h3>Testing</h3>
      <p>
        Always test channels after setup and periodically verify they're working. 
        Some services (like webhooks) may change URLs or expire tokens.
      </p>

      <div className="tip">
        <strong>Tip:</strong> For critical alerts, use instant channels like Telegram or Discord. 
        Email is better suited for informational alerts due to potential delays.
      </div>

      <h2>Security</h2>
      <p>Keep your channel credentials secure:</p>
      <ul>
        <li>Never share bot tokens or webhook URLs publicly</li>
        <li>Rotate credentials if compromised</li>
        <li>Use separate bots/webhooks for different purposes</li>
        <li>Limit webhook endpoint access to known IPs if possible</li>
      </ul>
    </div>
  )
}
