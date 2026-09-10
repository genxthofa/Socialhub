import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import axios from 'axios'

export function formatUserName(user) {
  if (user?.name && typeof user.name === 'string' && user.name.trim()) {
    const trimmed = user.name.trim()
    const lower = trimmed.toLowerCase()
    if (lower !== 'user' && lower !== 'administrator' && lower !== 'member' && lower !== 'socialhub member' && lower !== 'google user') {
      return trimmed
    }
  }
  if (user?.email && typeof user.email === 'string' && user.email.trim()) {
    const prefix = user.email.split('@')[0]
    const words = prefix.split(/[._-]/).filter(Boolean)
    if (words.length > 0) {
      return words.map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
    }
  }
  return 'SocialHub User'
}


// export const useAuthStore = create(
//   persist(
//     (set) => ({
//       token: 'socialhub-token',
//       isAuthenticated: true,
//       login: (user, token) => {
//         const formattedName = formatUserName(user)
//         set({ user: { ...user, name: formattedName }, token, isAuthenticated: true })
//       },
//       setUser: (user, token) => {
//         if (!user) {
//           set({ user: null, token: null, isAuthenticated: false })
//           return
//         }
//         const formattedName = formatUserName(user)
//         set({ user: { ...user, name: formattedName }, token: token || 'socialhub-token', isAuthenticated: true })
//       },
//       logout: () => {
//         set({ user: null, token: null, isAuthenticated: false })
//       },
//       updateUser: (data) => {
//         set((state) => ({ user: { ...state.user, ...data } }))
//       },
//     }),
//     { name: 'socialhub-auth' }
//   )
// )


export const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      login: (user, token) => {
        if (!token) { set({ user: null, token: null, isAuthenticated: false }); return }
        const formattedName = formatUserName(user)
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
        set({ user: { ...user, name: formattedName }, token, isAuthenticated: true })
      },
      setUser: (user, token) => {
        if (!user || !token) {
          delete axios.defaults.headers.common['Authorization']
          set({ user: null, token: null, isAuthenticated: false })
          return
        }
        const formattedName = formatUserName(user)
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
        set({ user: { ...user, name: formattedName }, token, isAuthenticated: true })
      },
      logout: () => {
        delete axios.defaults.headers.common['Authorization']
        set({ user: null, token: null, isAuthenticated: false })
      },
      updateUser: (data) => set((state) => ({ user: { ...state.user, ...data } })),
    }),
    { name: 'socialhub-auth' }
  )
)

// ─── Accent Colors ────────────────────────────────────────────────────────────
export const ACCENT_COLORS = [
  { id: 'violet', label: 'Violet', primary: '#7c5cfc', dark: '#5b3fd4' },
  { id: 'blue', label: 'Blue', primary: '#3b82f6', dark: '#1d4ed8' },
  { id: 'emerald', label: 'Emerald', primary: '#10b981', dark: '#047857' },
  { id: 'rose', label: 'Rose', primary: '#f43f5e', dark: '#be123c' },
  { id: 'amber', label: 'Amber', primary: '#f59e0b', dark: '#b45309' },
  { id: 'cyan', label: 'Cyan', primary: '#06b6d4', dark: '#0e7490' },
]

function applyAccent(colorId) {
  const color = ACCENT_COLORS.find(c => c.id === colorId) || ACCENT_COLORS[0]
  const r = document.documentElement
  r.style.setProperty('--color-brand-500', color.primary)
  r.style.setProperty('--color-brand-600', color.primary)
  r.style.setProperty('--color-brand-700', color.dark)
  r.style.setProperty('--color-brand-800', color.dark)
}

// ─── Theme Store ──────────────────────────────────────────────────────────────
export const useThemeStore = create(
  persist(
    (set) => ({
      theme: 'light',
      accent: 'violet',
      toggleTheme: () =>
        set((state) => {
          const newTheme = state.theme === 'light' ? 'dark' : 'light'
          document.documentElement.setAttribute('data-theme', newTheme)
          localStorage.setItem('socialhub-theme', newTheme)
          return { theme: newTheme }
        }),
      setTheme: (theme) => {
        document.documentElement.setAttribute('data-theme', theme)
        localStorage.setItem('socialhub-theme', theme)
        set({ theme })
      },
      setAccent: (colorId) => {
        applyAccent(colorId)
        set({ accent: colorId })
      },
    }),
    { name: 'socialhub-theme-store' }
  )
)

// ─── UI Store ─────────────────────────────────────────────────────────────────
export const useUIStore = create((set) => ({
  sidebarCollapsed: false,
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  setSidebarCollapsed: (val) => set({ sidebarCollapsed: val }),
  notificationPanelOpen: false,
  toggleNotificationPanel: () =>
    set((state) => ({ notificationPanelOpen: !state.notificationPanelOpen })),
  closeNotificationPanel: () => set({ notificationPanelOpen: false }),
}))

// ─── Data Stores ──────────────────────────────────────────────────────────────
export const useSocialAccountsStore = create((set) => ({
  accounts: [],
  fetched: false,
  fetchAccounts: async () => {
    try {
      const token = useAuthStore.getState().token
      const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {}
      const res = await axios.get('/api/social/accounts', config)
      const accounts = res.data.accounts || (Array.isArray(res.data) ? res.data : (res.data.data?.data || res.data.data || []))
      set({ accounts: Array.isArray(accounts) ? accounts : [], fetched: true })
    } catch (e) {
      set({ accounts: [], fetched: true })
    }
  }
}))

export const usePostsStore = create((set) => ({
  posts: [],
  fetched: false,
  fetchPosts: async () => {
    try {
      const token = useAuthStore.getState().token
      const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {}
      const res = await axios.get('/api/posts', config)
      const posts = Array.isArray(res.data) ? res.data : (res.data.data?.data || res.data.data || [])
      set({ posts: Array.isArray(posts) ? posts : [], fetched: true })
    } catch (e) {
      set({ posts: [], fetched: true })
    }
  }
}))

export const useCampaignsStore = create((set) => ({
  campaigns: [],
  fetched: false,
  fetchCampaigns: async () => {
    try {
      const token = useAuthStore.getState().token
      const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {}
      const res = await axios.get('/api/campaigns', config)
      const campaigns = Array.isArray(res.data) ? res.data : (res.data.data?.data || res.data.data || [])
      set({ campaigns: Array.isArray(campaigns) ? campaigns : [], fetched: true })
    } catch (e) {
      set({ campaigns: [], fetched: true })
    }
  }
}))

export const useAnalyticsStore = create((set) => ({
  analytics: { chart_data: [], organic: {}, advertising: {} },
  fetched: false,
  fetchAnalytics: async () => {
    try {
      const token = useAuthStore.getState().token
      const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {}
      const res = await axios.get('/api/analytics/overview', config)
      const data = res.data.data || res.data
      set({ analytics: data, fetched: true })
    } catch (e) {
      set({ analytics: { chart_data: [], organic: {}, advertising: {} }, fetched: true })
    }
  }
}))

export const useNotificationsStore = create((set) => ({
  notifications: [],
  fetched: false,
  fetchNotifications: async () => {
    try {
      const token = useAuthStore.getState().token
      const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {}
      const res = await axios.get('/api/notifications', config)
      const data = res.data.data || res.data || []
      set({ notifications: Array.isArray(data) ? data : [], fetched: true })
    } catch (e) {
      set({ notifications: [], fetched: true })
    }
  },
  markAsRead: async (id) => {
    try {
      const token = useAuthStore.getState().token
      const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {}
      await axios.put(`/api/notifications/${id}/read`, {}, config)
      set((state) => ({
        notifications: state.notifications.map(n => n.id === id ? { ...n, is_read: true } : n)
      }))
    } catch (e) {}
  },
  markAllAsRead: async () => {
    try {
      const token = useAuthStore.getState().token
      const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {}
      await axios.put('/api/notifications/read-all', {}, config)
      set((state) => ({
        notifications: state.notifications.map(n => ({ ...n, is_read: true }))
      }))
    } catch (e) {}
  }
}))

export const useMediaStore = create((set) => ({
  media: [],
  fetched: false,
  fetchMedia: async () => {
    try {
      const token = useAuthStore.getState().token
      const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {}
      const res = await axios.get('/api/media', config)
      const data = res.data.data || res.data || []
      set({ media: Array.isArray(data) ? data : [], fetched: true })
    } catch (e) {
      set({ media: [], fetched: true })
    }
  },
  addMediaItems: (items) => set((state) => ({ media: [...items, ...state.media] })),
  removeMediaItems: (ids) => set((state) => ({ media: state.media.filter(x => !ids.includes(x.id)) })),
}))
