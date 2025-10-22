# Settings

Configure your account preferences for the dYdX Alert System.

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

## Display Preferences

### Theme
Switch between light and dark themes using the theme toggle in the header. Your preference is saved automatically.

### Currency Display
Currently, all values are displayed in USD.

## Data & Privacy

### What Data We Store

- **Account Info**: Email and authentication tokens (managed by Supabase)
- **Subaccounts**: dYdX addresses and nicknames you add
- **Alert Rules**: Your configured alert conditions
- **Notification Channels**: Channel credentials (encrypted)
- **Alert History**: Past alerts and their metadata
- **Preferences**: Timezone setting

### What We Don't Store

- Private keys or wallet credentials
- Trading passwords
- Detailed trading history beyond what's public on-chain

## Managing Your Data

### Deleting Your Data

You can delete your data through the application:

- **Subaccounts**: Delete individual subaccounts from the Subaccounts page
- **Alert Rules**: Delete alert rules from the Alert Rules page
- **Notification Channels**: Delete channels from the Channels page
- **Alert History**: Clear all alerts or delete individual alerts from the Alerts page

## Security

### Best Practices

- Use a strong, unique password
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

::: info Open Source
This project is open source under the Business Source License 1.1. Contributions and feedback are welcome!
:::
