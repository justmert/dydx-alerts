# Settings

Configure your account preferences and personalize your experience with the dYdX Alert System.

## Timezone Settings

All dates and times throughout the application are displayed in your selected timezone.

### Setting Your Timezone

1. Go to **Settings**
2. Find the **Timezone** dropdown
3. Select your preferred timezone from the list
4. Changes are saved automatically

### Where Timezone Affects

Your timezone setting applies to:
- Alert timestamps
- Subaccount activity logs
- Alert rule creation times
- Last updated indicators
- Trading activity timestamps

::: tip Current Time Preview
The current time in your selected timezone is displayed below the dropdown to help you verify your selection.
:::

## Account Connections

Manage how you sign in to the dYdX Alert System.

### Email Sign-In
If you registered with email, you can view and update your email address. Email verification may be required after changes.

### OAuth Providers
Connect additional authentication methods:
- **GitHub**: Link your GitHub account for quick sign-in
- **Google**: Connect Google for authentication (coming soon)

### Linking Additional Providers

1. Click **"Connect"** next to the desired provider
2. Authorize the connection
3. Provider will appear as "Connected"
4. Use any connected method to sign in

## Display Preferences

Customize how information is displayed:

### Theme
Switch between light and dark themes using the theme toggle in the header. Your preference is saved automatically.

### Currency Display
Currently, all values are displayed in USD. Additional currency support coming soon.

## Data & Privacy

### What Data We Store

- **Account Info**: Email and authentication tokens
- **Subaccounts**: dYdX addresses and nicknames you add
- **Alert Rules**: Your configured alert conditions
- **Notification Channels**: Channel credentials (encrypted)
- **Alert History**: Past alerts and their metadata
- **Preferences**: Timezone and other settings

### What We Don't Store

- Private keys or wallet credentials
- Trading passwords
- Detailed trading history beyond what's public on-chain

### Data Retention

- **Alert History**: Kept for 90 days
- **Subaccount Data**: Until you delete the subaccount
- **Account Data**: Until you delete your account

## Account Management

### Exporting Data
Export your alert history and configurations (coming soon).

### Deleting Your Account
To permanently delete your account and all associated data:

1. Contact support through GitHub issues
2. Verify your identity
3. All data will be permanently deleted within 7 days

::: danger Account Deletion
Account deletion is permanent and cannot be undone. Export any data you want to keep before deleting your account.
:::

## Security

### Best Practices

- Use a strong, unique password
- Enable two-factor authentication (coming soon)
- Review connected OAuth providers regularly
- Don't share your account credentials
- Log out from shared devices

### Notification Channel Security

- Keep bot tokens and webhook URLs private
- Rotate credentials if compromised
- Review channel permissions regularly

## Support & Feedback

Need help or have suggestions?

- **GitHub Issues**: [Report bugs or request features](https://github.com/justmert/dydx-alerts/issues)
- **Documentation**: This documentation site
- **Email**: Contact the developer

::: info Open Source
This project is open source under the Business Source License 1.1. Contributions and feedback are welcome!
:::
