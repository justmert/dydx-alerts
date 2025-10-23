export default function GettingStarted() {
  return (
    <div>
      <h1>Getting Started</h1>
      <p>
        Welcome to the dYdX Alert System! This guide will help you get started with monitoring your dYdX v4 positions and setting up alerts.
      </p>

      <h2>Step 1: Register an Account</h2>
      <p>
        Visit <a href="https://alertsdydx.com" target="_blank" rel="noopener noreferrer">alertsdydx.com</a> and create an account using your email or GitHub.
      </p>
      <pre><code>1. Go to alertsdydx.com
2. Click "Sign Up"
3. Enter your email or connect with GitHub
4. Verify your email (if using email)</code></pre>

      <h2>Step 2: Add Your Subaccount</h2>
      <p>
        After logging in, add your dYdX v4 subaccount to start monitoring:
      </p>
      <ol>
        <li>Navigate to the <strong>Subaccounts</strong> page</li>
        <li>Click <strong>"Add Subaccount"</strong></li>
        <li>Enter your dYdX address (starts with "dydx1...")</li>
        <li>Enter your subaccount number (usually 0 for the main account)</li>
        <li>Optionally add a nickname for easy identification</li>
        <li>Click <strong>"Add"</strong></li>
      </ol>

      <div className="tip">
        <strong>Tip:</strong> You can find your dYdX address in the dYdX v4 web app in the top right corner.
      </div>

      <h2>Step 3: Configure Notification Channels</h2>
      <p>
        Set up at least one notification channel to receive alerts:
      </p>
      <ol>
        <li>Go to <strong>Notification Channels</strong></li>
        <li>Click <strong>"Add Channel"</strong></li>
        <li>Choose your preferred channel type (Telegram, Discord, etc.)</li>
        <li>Follow the setup instructions for that channel</li>
        <li>Test the channel to ensure it works</li>
      </ol>

      <h3>Popular Channel Options</h3>
      <ul>
        <li><strong>Telegram:</strong> Get your Chat ID from @userinfobot</li>
        <li><strong>Discord:</strong> Create a webhook in Server Settings → Integrations</li>
        <li><strong>Email:</strong> Use any email address</li>
      </ul>

      <h2>Step 4: Create Alert Rules</h2>
      <p>
        Create custom alert rules to monitor your positions:
      </p>
      <ol>
        <li>Navigate to <strong>Alert Rules</strong></li>
        <li>Click <strong>"New Alert Rule"</strong></li>
        <li>Select the subaccount to monitor</li>
        <li>Choose alert scope (Account Level or Position Level)</li>
        <li>Select a condition type (e.g., Liquidation Distance)</li>
        <li>Set your threshold value</li>
        <li>Choose notification channels</li>
        <li>Click <strong>"Check Alert Rule"</strong> to validate</li>
        <li>Click <strong>"Create Rule"</strong> to save</li>
      </ol>

      <div className="warning">
        <strong>Important:</strong> Make sure to set appropriate thresholds. Setting them too sensitive may result in frequent alerts.
      </div>

      <h2>Step 5: Monitor Your Dashboard</h2>
      <p>
        Once set up, visit the Dashboard to see:
      </p>
      <ul>
        <li>Overview of all monitored subaccounts</li>
        <li>Current position status and risk metrics</li>
        <li>Recent alerts and their severity</li>
        <li>Active alert rules</li>
        <li>Real-time market data</li>
      </ul>

      <h2>Next Steps</h2>
      <p>Now that you are set up, explore these features:</p>
      <ul>
        <li>View detailed subaccount metrics</li>
        <li>Create multiple alert rules with different conditions</li>
        <li>Check alert history</li>
        <li>Configure timezone preferences in Settings</li>
      </ul>

      <div className="note">
        <strong>Need Help?</strong> If you encounter any issues, check out the individual feature pages in this documentation 
        or visit our <a href="https://github.com/devmertt/dydx-alert-system" target="_blank" rel="noopener noreferrer">GitHub repository</a>.
      </div>
    </div>
  )
}
