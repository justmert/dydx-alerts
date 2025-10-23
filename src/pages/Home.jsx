export default function Home() {
  return (
    <div>
      <div className="hero">
        <h1 className="hero-title">dYdX v4 Alert System</h1>
        <p className="hero-subtitle">
          Real-time position monitoring and custom alerts for dYdX v4 traders
        </p>
        <div className="hero-actions">
          <a href="https://alertsdydx.com" target="_blank" rel="noopener noreferrer" className="btn btn-primary">
            Get Started →
          </a>
          <a href="https://github.com/devmertt/dydx-alert-system" target="_blank" rel="noopener noreferrer" className="btn btn-secondary">
            View on GitHub
          </a>
        </div>
      </div>

      <div className="features-grid">
        <div className="feature-card">
          <div className="feature-icon">📊</div>
          <h3 className="feature-title">Real-time Monitoring</h3>
          <p className="feature-description">
            Track multiple dYdX v4 subaccounts with live position updates, margin ratios, and liquidation distances.
          </p>
        </div>

        <div className="feature-card">
          <div className="feature-icon">🔔</div>
          <h3 className="feature-title">Custom Alert Rules</h3>
          <p className="feature-description">
            Create flexible alert rules with account-level and position-level conditions.
          </p>
        </div>

        <div className="feature-card">
          <div className="feature-icon">📢</div>
          <h3 className="feature-title">Multi-Channel Notifications</h3>
          <p className="feature-description">
            Receive alerts via Telegram, Discord, Slack, Email, PagerDuty, or custom webhooks.
          </p>
        </div>

        <div className="feature-card">
          <div className="feature-icon">⚡</div>
          <h3 className="feature-title">Instant Alerts</h3>
          <p className="feature-description">
            Get notified within seconds when your positions approach liquidation.
          </p>
        </div>

        <div className="feature-card">
          <div className="feature-icon">📈</div>
          <h3 className="feature-title">Comprehensive Metrics</h3>
          <p className="feature-description">
            View detailed position metrics including PnL, leverage, and liquidation prices.
          </p>
        </div>

        <div className="feature-card">
          <div className="feature-icon">🎯</div>
          <h3 className="feature-title">Easy to Use</h3>
          <p className="feature-description">
            Simple interface with real-time data visualization. No coding required.
          </p>
        </div>
      </div>

      <h2>What is dYdX Alert System?</h2>
      <p>
        The dYdX Alert System is a comprehensive monitoring and notification platform for dYdX v4 traders. 
        It continuously monitors your positions and sends real-time alerts when conditions you define are met.
      </p>

      <h3>Key Features</h3>
      <ul>
        <li>Monitor multiple subaccounts simultaneously</li>
        <li>Create up to 25 custom alert rules per account</li>
        <li>Real-time position tracking with WebSocket updates</li>
        <li>Flexible alert conditions for both account and position levels</li>
        <li>Multiple notification channels with delivery confirmation</li>
        <li>Detailed alert history and analytics</li>
      </ul>

      <div className="note">
        <strong>Note:</strong> This is an independent monitoring tool and is not officially affiliated with dYdX Trading Inc. 
        It uses the public dYdX v4 Indexer API to fetch position and market data.
      </div>
    </div>
  )
}
