export default function Settings() {
  return (
    <div>
      <h1>Settings</h1>
      <p>
        Configure your account preferences and personalize your experience with the dYdX Alert System.
      </p>

      <h2>Timezone Settings</h2>
      <p>
        All dates and times throughout the application are displayed in your selected timezone.
      </p>

      <h3>Setting Your Timezone</h3>
      <ol>
        <li>Go to <strong>Settings</strong></li>
        <li>Find the <strong>Timezone</strong> dropdown</li>
        <li>Select your preferred timezone from the list</li>
        <li>Changes are saved automatically</li>
      </ol>

      <h3>Where Timezone Affects</h3>
      <p>Your timezone setting applies to:</p>
      <ul>
        <li>Alert timestamps</li>
        <li>Subaccount activity logs</li>
        <li>Alert rule creation times</li>
        <li>Last updated indicators</li>
        <li>Trading activity timestamps</li>
      </ul>

      <div className="tip">
        <strong>Tip:</strong> The current time in your selected timezone is displayed 
        below the dropdown to help you verify your selection.
      </div>

      <h2>Account Connections</h2>
      <p>Manage how you sign in to the dYdX Alert System.</p>

      <h3>Email Sign-In</h3>
      <p>
        If you registered with email, you can view and update your email address. 
        Email verification may be required after changes.
      </p>

      <h3>OAuth Providers</h3>
      <p>Connect additional authentication methods:</p>
      <ul>
        <li><strong>GitHub:</strong> Link your GitHub account for quick sign-in</li>
        <li><strong>Google:</strong> Connect Google for authentication (coming soon)</li>
      </ul>

      <h3>Linking Additional Providers</h3>
      <ol>
        <li>Click <strong>"Connect"</strong> next to the desired provider</li>
        <li>Authorize the connection</li>
        <li>Provider will appear as "Connected"</li>
        <li>Use any connected method to sign in</li>
      </ol>

      <h2>Notification Preferences</h2>
      <p>Configure how you receive notifications (coming soon):</p>
      <ul>
        <li>Set quiet hours for non-critical alerts</li>
        <li>Group similar alerts together</li>
        <li>Configure alert sound preferences</li>
        <li>Set up alert digest emails</li>
      </ul>

      <h2>Display Preferences</h2>
      <p>Customize how information is displayed:</p>

      <h3>Theme</h3>
      <p>
        Switch between light and dark themes using the theme toggle in the header. 
        Your preference is saved automatically.
      </p>

      <h3>Currency Display</h3>
      <p>
        Currently, all values are displayed in USD. Additional currency support coming soon.
      </p>

      <h2>Data & Privacy</h2>

      <h3>What Data We Store</h3>
      <ul>
        <li><strong>Account Info:</strong> Email and authentication tokens</li>
        <li><strong>Subaccounts:</strong> dYdX addresses and nicknames you add</li>
        <li><strong>Alert Rules:</strong> Your configured alert conditions</li>
        <li><strong>Notification Channels:</strong> Channel credentials (encrypted)</li>
        <li><strong>Alert History:</strong> Past alerts and their metadata</li>
        <li><strong>Preferences:</strong> Timezone and other settings</li>
      </ul>

      <h3>What We Don't Store</h3>
      <ul>
        <li>Private keys or wallet credentials</li>
        <li>Trading passwords</li>
        <li>Detailed trading history beyond what's public on-chain</li>
      </ul>

      <h3>Data Retention</h3>
      <ul>
        <li><strong>Alert History:</strong> Kept for 90 days</li>
        <li><strong>Subaccount Data:</strong> Until you delete the subaccount</li>
        <li><strong>Account Data:</strong> Until you delete your account</li>
      </ul>

      <h2>Account Management</h2>

      <h3>Exporting Data</h3>
      <p>
        Export your alert history and configurations (coming soon).
      </p>

      <h3>Deleting Your Account</h3>
      <p>
        To permanently delete your account and all associated data:
      </p>
      <ol>
        <li>Contact support through GitHub issues</li>
        <li>Verify your identity</li>
        <li>All data will be permanently deleted within 7 days</li>
      </ol>

      <div className="warning">
        <strong>Warning:</strong> Account deletion is permanent and cannot be undone. 
        Export any data you want to keep before deleting your account.
      </div>

      <h2>Security</h2>

      <h3>Best Practices</h3>
      <ul>
        <li>Use a strong, unique password</li>
        <li>Enable two-factor authentication (coming soon)</li>
        <li>Review connected OAuth providers regularly</li>
        <li>Don't share your account credentials</li>
        <li>Log out from shared devices</li>
      </ul>

      <h3>Notification Channel Security</h3>
      <ul>
        <li>Keep bot tokens and webhook URLs private</li>
        <li>Rotate credentials if compromised</li>
        <li>Review channel permissions regularly</li>
      </ul>

      <h2>Support & Feedback</h2>
      <p>Need help or have suggestions?</p>
      <ul>
        <li><strong>GitHub Issues:</strong> <a href="https://github.com/devmertt/dydx-alert-system/issues" target="_blank" rel="noopener noreferrer">Report bugs or request features</a></li>
        <li><strong>Documentation:</strong> This documentation site</li>
        <li><strong>Email:</strong> Contact the developer</li>
      </ul>

      <div className="note">
        <strong>Open Source:</strong> This project is open source under the Business Source License 1.1. 
        Contributions and feedback are welcome!
      </div>
    </div>
  )
}
