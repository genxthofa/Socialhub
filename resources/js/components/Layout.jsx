import { useState, useRef, useEffect } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { clsx } from 'clsx'
import { 
  useAuthStore, useThemeStore, useUIStore, useNotificationsStore,
  usePostsStore, useSocialAccountsStore, useCampaignsStore, useAnalyticsStore, useMediaStore
} from '../store'
import { toast } from 'react-hot-toast'
import { Avatar, IconButton, Badge } from './ui'

// ─── Icons (inline SVG) ───────────────────────────────────────────────────────
function Icon({ d, size = 18, ...props }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d={d} />
    </svg>
  )
}

const NAV_ITEMS = [
  {
    section: 'Main',
    items: [
      { to: '/dashboard', label: 'Dashboard', icon: 'M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z' },
      { to: '/accounts', label: 'Accounts', icon: 'M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75' },
    ],
  },
  {
    section: 'Content',
    items: [
      { to: '/posts/create', label: 'Create Post', icon: 'M12 20h9M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4 12.5-12.5z' },
      { to: '/posts', label: 'Posts', icon: 'M14.5 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V7.5L14.5 2z' },
      { to: '/calendar', label: 'Calendar', icon: 'M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z' },
      { to: '/media', label: 'Media Library', icon: 'M21 19V5a2 2 0 00-2-2H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2zM8.5 13.5l2.5 3L14.5 12l4.5 6H5l3.5-4.5z' },
    ],
  },
  {
    section: 'Advertising',
    items: [
      { to: '/campaigns', label: 'Campaigns', icon: 'M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v4m0 0h10M9 7v10a2 2 0 002 2h6a2 2 0 002-2V7M9 7H5a2 2 0 00-2 2v10a2 2 0 002 2h4' },
      { to: '/campaigns/create', label: 'Create Campaign', icon: 'M12 20h9M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4 12.5-12.5z' },
    ],
  },
  {
    section: 'Insights',
    items: [
      { to: '/analytics', label: 'Analytics', icon: 'M18 20V10M12 20V4M6 20v-6' },
    ],
  },
]

// ─── Sidebar ──────────────────────────────────────────────────────────────────
export function Sidebar() {
  const { user } = useAuthStore()
  const { sidebarCollapsed, toggleSidebar } = useUIStore()

  const displayName = user?.name || (user?.email ? user.email.split('@')[0] : 'User')

  return (
    <aside className={clsx('sidebar', sidebarCollapsed && 'collapsed')}>
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon" style={{ overflow: 'hidden' }}>
          <img src="/genx_logo.png" alt="GenX Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        </div>
        <span className="sidebar-logo-text">GenX SocialHub</span>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        {NAV_ITEMS.map(({ section, items }) => (
          <div key={section}>
            <div className="sidebar-section-label">{section}</div>
            {items.map(({ to, label, icon, badge }) => (
              <NavLink
                key={to}
                to={to}
                end
                className={({ isActive }) => {
                  return clsx('sidebar-nav-item', isActive && 'active')
                }}
              >
                <span className="nav-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d={icon} />
                  </svg>
                </span>
                <span className="nav-label">{label}</span>
                {badge && <span className="nav-badge">{badge}</span>}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
        <button
          className="sidebar-nav-item"
          onClick={toggleSidebar}
          style={{ width: '100%', marginBottom: 8 }}
          title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <span className="nav-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d={sidebarCollapsed ? 'M13 17l5-5-5-5M6 17l5-5-5-5' : 'M11 17l-5-5 5-5M18 17l-5-5 5-5'} />
            </svg>
          </span>
          <span className="nav-label">{sidebarCollapsed ? 'Expand' : 'Collapse'}</span>
        </button>

        <NavLink to="/settings" className="sidebar-user">
          <Avatar name={displayName} size="sm" />
          <div className="sidebar-user-info">
            <div className="sidebar-user-name">{displayName}</div>
          </div>
        </NavLink>
      </div>
    </aside>
  )
}

// ─── Topbar ───────────────────────────────────────────────────────────────────
export function Topbar({ title, actions }) {
  const { theme, toggleTheme } = useThemeStore()
  const { notificationPanelOpen, toggleNotificationPanel, closeNotificationPanel } = useUIStore()
  const { logout, user } = useAuthStore()
  const navigate = useNavigate()
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const userMenuRef = useRef()
  const notifRef = useRef()
  const { notifications, fetchNotifications, fetched: notifsFetched } = useNotificationsStore()
  const unread = notifications?.filter(n => !n.is_read)?.length || 0

  const [refreshing, setRefreshing] = useState(false)
  const { fetchPosts } = usePostsStore()
  const { fetchAccounts } = useSocialAccountsStore()
  const { fetchCampaigns } = useCampaignsStore()
  const { fetchAnalytics } = useAnalyticsStore()
  const { fetchMedia } = useMediaStore()

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      await Promise.all([
        fetchPosts(),
        fetchAccounts(),
        fetchCampaigns(),
        fetchAnalytics(),
        fetchNotifications(),
        fetchMedia(),
      ])
    } catch (e) {
    } finally {
      setTimeout(() => setRefreshing(false), 600)
    }
  }

  useEffect(() => {
    if (!notifsFetched) fetchNotifications()
  }, [notifsFetched])

  useEffect(() => {
    function handleClickOutside(e) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setUserMenuOpen(false)
      }
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        closeNotificationPanel()
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [closeNotificationPanel])

  return (
    <header className="topbar">
      <div className="topbar-left">
        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)', fontWeight: 500, marginBottom: 2 }}>
          SocialHub
        </div>
        <h1 className="topbar-title">{title}</h1>
      </div>

      <div className="topbar-right">
        {/* Action buttons passed from page */}
        {actions}

        {/* Refresh button */}
        <button
          className="btn btn-secondary"
          onClick={handleRefresh}
          disabled={refreshing}
          title="Refresh All Data"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              animation: refreshing ? 'spin 0.7s linear infinite' : 'none',
            }}
          >
            <path d="M23 4v6h-6M1 20v-6h6"/>
            <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
          </svg>
          <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
        </button>

        {/* Theme toggle */}
        <button
          className="btn btn-ghost btn-icon"
          onClick={toggleTheme}
          title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
        >
          {theme === 'light' ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
            </svg>
          )}
        </button>

        {/* Notifications */}
        <div ref={notifRef} style={{ position: 'relative' }}>
          <button
            className="btn btn-ghost btn-icon"
            onClick={toggleNotificationPanel}
            style={{ position: 'relative' }}
            title="Notifications"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0"/>
            </svg>
            {unread > 0 && (
              <span style={{
                position: 'absolute', top: 4, right: 4,
                width: 8, height: 8, background: 'var(--color-error-500)',
                borderRadius: '50%', border: '2px solid var(--bg-primary)',
              }} />
            )}
          </button>
          {notificationPanelOpen && (
            <div style={{ position: 'absolute', right: 0, top: '100%', marginTop: 8, zIndex: 'var(--z-dropdown)' }}>
              <NotificationPanel />
            </div>
          )}
        </div>

        {/* User menu */}
        <div ref={userMenuRef} style={{ position: 'relative' }}>
          <button
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 8px', borderRadius: 'var(--radius-lg)', background: 'transparent', cursor: 'pointer', border: 'none', transition: 'background var(--transition-fast)' }}
            onClick={() => setUserMenuOpen(o => !o)}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <Avatar name={user?.name || user?.email || 'User'} size="sm" />
            <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, color: 'var(--text-primary)' }}>
              {(user?.name || user?.email || 'User').split(' ')[0]}
            </span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M6 9l6 6 6-6"/>
            </svg>
          </button>

          {userMenuOpen && (
            <>
              <div style={{ position: 'fixed', inset: 0, zIndex: 999 }} onClick={() => setUserMenuOpen(false)} />
              <div className="dropdown-menu" style={{ right: 0, top: 'calc(100% + 4px)', zIndex: 1000, minWidth: 200 }}>
                <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-primary)' }}>
                  <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 700, color: 'var(--text-primary)' }}>{user?.name || 'User'}</div>
                  <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}>{user?.email || ''}</div>
                </div>
                {[
                  { label: 'Profile & Settings', to: '/settings' },
                ].map(item => (
                  <button
                    key={item.to}
                    className="dropdown-item"
                    style={{ width: '100%', textAlign: 'left' }}
                    onClick={() => { navigate(item.to); setUserMenuOpen(false) }}
                  >
                    {item.label}
                  </button>
                ))}
                <div className="dropdown-divider" />
                <button
                  className="dropdown-item danger"
                  style={{ width: '100%', textAlign: 'left' }}
                  onClick={() => { logout(); navigate('/login') }}
                >
                  Sign Out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  )
}

// ─── NotificationPanel ────────────────────────────────────────────────────────
function NotificationPanel() {
  const { notifications, markAsRead, markAllAsRead } = useNotificationsStore()
  const typeColors = {
    success: 'var(--color-success-500)',
    error: 'var(--color-error-500)',
    warning: 'var(--color-warning-500)',
    info: 'var(--color-info-500)',
  }
  return (
    <div className="notification-panel">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '1px solid var(--border-primary)', position: 'sticky', top: 0, background: 'var(--bg-card)' }}>
        <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 700, color: 'var(--text-primary)' }}>Notifications</span>
        <button onClick={markAllAsRead} style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-brand-600)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, fontFamily: 'inherit' }}>
          Mark all read
        </button>
      </div>
      {(!notifications || notifications.length === 0) ? (
        <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-secondary)' }}>
          <p style={{ margin: 0, fontSize: 14 }}>No notifications</p>
        </div>
      ) : notifications.map(notif => (
        <div key={notif.id} onClick={() => markAsRead(notif.id)} className={clsx('notification-item', !notif.is_read && 'unread')}>
          <div style={{ width: 32, height: 32, borderRadius: 'var(--radius-lg)', background: `${typeColors[notif.type]}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={typeColors[notif.type]} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              {notif.type === 'success' && <path d="M22 11.08V12a10 10 0 11-5.93-9.14M22 4L12 14.01l-3-3"/>}
              {notif.type === 'error' && <><circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/></>}
              {notif.type === 'warning' && <><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><path d="M12 9v4M12 17h.01"/></>}
              {notif.type === 'info' && <><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></>}
            </svg>
          </div>
          <div className="notification-content">
            <div className="notification-title">{notif.title}</div>
            <div className="notification-message">{notif.message}</div>
            <div className="notification-time">{notif.created_at}</div>
          </div>
          {!notif.is_read && <div className="notification-dot-unread" />}
        </div>
      ))}
    </div>
  )
}

// ─── DashboardLayout ──────────────────────────────────────────────────────────
export function DashboardLayout({ title, children, actions }) {
  const { sidebarCollapsed } = useUIStore()
  return (
    <div className="app-layout">
      <Sidebar />
      <div className={clsx('main-content', sidebarCollapsed && 'sidebar-collapsed')}>
        <Topbar title={title} actions={actions} />
        <main className="page-content animate-fade-in">
          {children}
        </main>
      </div>
    </div>
  )
}
