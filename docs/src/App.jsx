import { useState, useEffect } from 'react'
import './App.css'
import Home from './pages/Home'
import GettingStarted from './pages/GettingStarted'
import Dashboard from './pages/Dashboard'
import Subaccounts from './pages/Subaccounts'
import AlertRules from './pages/AlertRules'
import NotificationChannels from './pages/NotificationChannels'
import Markets from './pages/Markets'
import Settings from './pages/Settings'

function App() {
  const [currentPage, setCurrentPage] = useState('home')
  const [isDark, setIsDark] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme')
    if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      setIsDark(true)
      document.documentElement.classList.add('dark')
    }
  }, [])

  const toggleTheme = () => {
    setIsDark(!isDark)
    if (isDark) {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('theme', 'light')
    } else {
      document.documentElement.classList.add('dark')
      localStorage.setItem('theme', 'dark')
    }
  }

  const pages = {
    home: <Home />,
    'getting-started': <GettingStarted />,
    dashboard: <Dashboard />,
    subaccounts: <Subaccounts />,
    'alert-rules': <AlertRules />,
    'notification-channels': <NotificationChannels />,
    markets: <Markets />,
    settings: <Settings />
  }

  const navigation = [
    { id: 'home', label: 'Introduction', section: 'Getting Started' },
    { id: 'getting-started', label: 'Quick Start', section: 'Getting Started' },
    { id: 'dashboard', label: 'Dashboard', section: 'Features' },
    { id: 'subaccounts', label: 'Subaccounts', section: 'Features' },
    { id: 'alert-rules', label: 'Alert Rules', section: 'Features' },
    { id: 'notification-channels', label: 'Notification Channels', section: 'Features' },
    { id: 'markets', label: 'Markets', section: 'Features' },
    { id: 'settings', label: 'Settings', section: 'Features' }
  ]

  const sections = {}
  navigation.forEach(item => {
    if (!sections[item.section]) {
      sections[item.section] = []
    }
    sections[item.section].push(item)
  })

  return (
    <div className="app">
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-content">
          <div className="logo">
            ⚡ dYdX Alerts
          </div>
          
          {Object.entries(sections).map(([section, items]) => (
            <div key={section} className="nav-section">
              <div className="nav-section-title">{section}</div>
              <ul className="nav-list">
                {items.map(item => (
                  <li key={item.id} className="nav-item">
                    <div
                      className={`nav-link ${currentPage === item.id ? 'active' : ''}`}
                      onClick={() => {
                        setCurrentPage(item.id)
                        setSidebarOpen(false)
                      }}
                    >
                      {item.label}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </aside>

      <div className="content-wrapper">
        <header className="header">
          <div className="header-content">
            <div className="header-left">
              <button
                className="menu-toggle"
                onClick={() => setSidebarOpen(!sidebarOpen)}
                aria-label="Toggle menu"
              >
                ☰
              </button>
            </div>
            <div className="header-right">
              <button
                className="theme-toggle"
                onClick={toggleTheme}
                aria-label="Toggle theme"
              >
                {isDark ? '☀️' : '🌙'}
              </button>
              <a
                href="https://github.com/devmertt/dydx-alert-system"
                target="_blank"
                rel="noopener noreferrer"
                className="github-link"
                aria-label="GitHub"
              >
                <svg width="20" height="20" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
                </svg>
              </a>
            </div>
          </div>
        </header>

        <main className="main-content">
          {pages[currentPage]}
        </main>
      </div>
    </div>
  )
}

export default App
