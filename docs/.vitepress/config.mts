import { defineConfig } from 'vitepress'

export default defineConfig({
  title: "dYdX Alert System",
  description: "Real-time position monitoring and custom alerts for dYdX v4 traders",
  themeConfig: {
    logo: '/logo.svg',
    nav: [
      { text: 'Guide', link: '/guide/getting-started' },
      { text: 'Features', link: '/features/dashboard' },
      { text: 'GitHub', link: 'https://github.com/justmert/dydx-alerts' }
    ],

    sidebar: [
      {
        text: 'Introduction',
        items: [
          { text: 'What is dYdX Alerts?', link: '/guide/introduction' },
          { text: 'Getting Started', link: '/guide/getting-started' }
        ]
      },
      {
        text: 'Features',
        items: [
          { text: 'Dashboard', link: '/features/dashboard' },
          { text: 'Subaccounts', link: '/features/subaccounts' },
          { text: 'Alert Rules', link: '/features/alert-rules' },
          { text: 'Notification Channels', link: '/features/notification-channels' },
          { text: 'Markets', link: '/features/markets' },
          { text: 'Settings', link: '/features/settings' }
        ]
      }
    ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/justmert/dydx-alerts' }
    ],

    footer: {
      message: 'Released under the Business Source License 1.1',
      copyright: 'Copyright © 2024 Mert Köklü'
    },

    search: {
      provider: 'local'
    }
  }
})
