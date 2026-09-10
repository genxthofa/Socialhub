import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import axios from 'axios'
import { DashboardLayout } from '../../components/Layout'
import { Button, PlatformIcon, StatusBadge, Badge, Modal } from '../../components/ui'

const PLATFORM_INFO = {
  facebook: {
    name: 'Facebook',
    desc: 'Connect Facebook Pages to publish posts and run ads.',
    color: '#1877f2',
    scopes: ['pages_manage_posts', 'pages_read_engagement', 'ads_management'],
  },
  instagram: {
    name: 'Instagram',
    desc: 'Connect Instagram Business accounts for content and ads.',
    color: '#e1306c',
    scopes: ['instagram_basic', 'instagram_content_publish', 'ads_management'],
  },
  linkedin: {
    name: 'LinkedIn',
    desc: 'Connect LinkedIn Company Pages to publish and advertise.',
    color: '#0077b5',
    scopes: ['r_liteprofile', 'w_member_social', 'r_ads', 'w_ads'],
  },
  gmb: {
    name: 'Google Business Profile',
    desc: 'Connect Google Business locations to post updates and manage reviews.',
    color: '#4285F4',
    scopes: ['business.manage'],
  },
  google_ads: {
    name: 'Google Ads',
    desc: 'Connect Google Ads to create and manage search campaigns.',
    color: '#0F9D58',
    scopes: ['adwords'],
  },
}

function SelectMetaAccountsModal({ metaKey, onClose, onConfirm }) {
  const [accounts, setAccounts] = useState([])
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (metaKey) {
      setLoading(true)
      axios.get(`/api/social/meta/pending?key=${metaKey}`)
        .then(res => {
          if (res.data.success) {
            setAccounts(res.data.accounts)
            // Pre-select all by default
            setSelectedIds(new Set(res.data.accounts.map(a => a.id)))
          }
        })
        .catch(err => {
          toast.error('Failed to load pending accounts')
          onClose()
        })
        .finally(() => setLoading(false))
    }
  }, [metaKey])

  const toggleSelection = (id) => {
    const next = new Set(selectedIds)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelectedIds(next)
  }

  const toggleAll = () => {
    if (selectedIds.size === accounts.length) setSelectedIds(new Set())
    else setSelectedIds(new Set(accounts.map(a => a.id)))
  }

  const handleConfirm = () => {
    if (selectedIds.size === 0) {
      toast.error('Please select at least one account')
      return
    }

    setSubmitting(true)
    axios.post('/api/social/meta/confirm', {
      key: metaKey,
      selected_ids: Array.from(selectedIds)
    })
    .then(res => {
      if (res.data.success) {
        toast.success(res.data.message)
        onConfirm()
      }
    })
    .catch(err => toast.error('Failed to connect accounts'))
    .finally(() => setSubmitting(false))
  }

  if (!metaKey) return null;

  return (
    <Modal
      isOpen={!!metaKey}
      onClose={onClose}
      title="Select Accounts"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={submitting}>Cancel</Button>
          <Button variant="primary" onClick={handleConfirm} disabled={submitting || loading}>
            {submitting ? 'Connecting...' : 'Finish Connection'}
          </Button>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 24, color: 'var(--text-tertiary)' }}>Loading accounts...</div>
        ) : accounts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 24, color: 'var(--text-tertiary)' }}>No accounts found.</div>
        ) : (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 12, borderBottom: '1px solid var(--border-secondary)' }}>
              <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
                {selectedIds.size} selected
              </span>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 'var(--font-size-sm)', cursor: 'pointer', color: 'var(--text-primary)' }}>
                <input 
                  type="checkbox" 
                  checked={selectedIds.size === accounts.length && accounts.length > 0} 
                  onChange={toggleAll}
                  style={{ cursor: 'pointer' }}
                />
                Select All
              </label>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: 300, overflowY: 'auto' }}>
              {accounts.map(acc => (
                <label 
                  key={acc.id} 
                  style={{ 
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
                    padding: '12px 16px', border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-lg)', 
                    cursor: 'pointer', transition: 'all 0.2s',
                    background: selectedIds.has(acc.id) ? 'var(--bg-secondary)' : 'var(--bg-card)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 36, height: 36, borderRadius: acc.platform === 'instagram' ? '50%' : 'var(--radius-md)', background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <PlatformIcon platform={acc.platform} size={20} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 'var(--font-size-sm)' }}>
                        {acc.account_name}
                      </div>
                      <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', marginTop: 2 }}>
                        {acc.platform === 'facebook' ? 'Page' : 'Instagram Business'}
                      </div>
                    </div>
                  </div>
                  <input 
                    type="checkbox" 
                    checked={selectedIds.has(acc.id)}
                    onChange={() => toggleSelection(acc.id)}
                    style={{ cursor: 'pointer', transform: 'scale(1.2)' }}
                  />
                </label>
              ))}
            </div>
          </>
        )}
      </div>
    </Modal>
  )
}

function SelectGoogleAccountsModal({ googleKey, onClose, onConfirm }) {
  const [accounts, setAccounts] = useState([])
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (googleKey) {
      setLoading(true)
      axios.get(`/api/social/google-business/locations?key=${googleKey}`)
        .then(res => {
          if (res.data.success) {
            setAccounts(res.data.accounts)
            setSelectedIds(new Set(res.data.accounts.map(a => a.id)))
          }
        })
        .catch(() => { toast.error('Failed to load Google accounts'); onClose() })
        .finally(() => setLoading(false))
    }
  }, [googleKey])

  const toggleSelection = (id) => {
    const next = new Set(selectedIds)
    if (next.has(id)) next.delete(id); else next.add(id)
    setSelectedIds(next)
  }

  const handleConfirm = () => {
    if (selectedIds.size === 0) { toast.error('Please select at least one account'); return }
    setSubmitting(true)
    axios.post('/api/social/google-business/confirm', { key: googleKey, selected_ids: Array.from(selectedIds) })
      .then(res => { if (res.data.success) { toast.success(res.data.message); onConfirm() } })
      .catch(() => toast.error('Failed to connect accounts'))
      .finally(() => setSubmitting(false))
  }

  if (!googleKey) return null

  return (
    <Modal isOpen={!!googleKey} onClose={onClose} title="Select Google Accounts"
      footer={<><Button variant="ghost" onClick={onClose} disabled={submitting}>Cancel</Button><Button variant="primary" onClick={handleConfirm} disabled={submitting || loading}>{submitting ? 'Connecting...' : 'Finish Connection'}</Button></>}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {loading ? <div style={{ textAlign: 'center', padding: 24, color: 'var(--text-tertiary)' }}>Loading accounts...</div>
        : accounts.length === 0 ? <div style={{ textAlign: 'center', padding: 24, color: 'var(--text-tertiary)' }}>No accounts found.</div>
        : <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: 300, overflowY: 'auto' }}>
            {accounts.map(acc => (
              <label key={acc.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-lg)', cursor: 'pointer', background: selectedIds.has(acc.id) ? 'var(--bg-secondary)' : 'var(--bg-card)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 'var(--radius-md)', background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <PlatformIcon platform={acc.platform} size={20} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 'var(--font-size-sm)' }}>{acc.account_name}</div>
                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', marginTop: 2 }}>
                      {acc.platform_type === 'google_ads' ? 'Google Ads Account' : 'Google Business Profile'}
                    </div>
                  </div>
                </div>
                <input type="checkbox" checked={selectedIds.has(acc.id)} onChange={() => toggleSelection(acc.id)} style={{ cursor: 'pointer', transform: 'scale(1.2)' }} />
              </label>
            ))}
          </div>
        }
      </div>
    </Modal>
  )
}

function AccountSettingsModal({ isOpen, onClose, account }) {
  const [settings, setSettings] = useState({
    requireApproval: true,
    autoRetry: true,
    notifySuccess: true,
    notifyExpire: true,
    postAsPage: true
  });

  useEffect(() => {
    if (account) {
      const saved = localStorage.getItem(`socialhub_settings_${account.id}`);
      if (saved) {
        try { setSettings(JSON.parse(saved)); } catch (e) {}
      } else {
        setSettings({ requireApproval: true, autoRetry: true, notifySuccess: true, notifyExpire: true, postAsPage: true });
      }
    }
  }, [account]);

  const handleSave = () => {
    localStorage.setItem(`socialhub_settings_${account.id}`, JSON.stringify(settings));
    toast.success('Settings saved successfully!');
    onClose();
  };

  const updateSetting = (key, value) => setSettings(prev => ({ ...prev, [key]: value }));

  if (!account) return null;

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={`${account.account_name} Settings`} 
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={handleSave}>Save Changes</Button>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div>
          <h4 style={{ margin: '0 0 12px 0', fontSize: 'var(--font-size-sm)', color: 'var(--text-primary)' }}>Default Publishing Behavior</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', cursor: 'pointer' }}>
              <input type="checkbox" checked={settings.requireApproval} onChange={e => updateSetting('requireApproval', e.target.checked)} style={{ cursor: 'pointer' }} /> Require approval before publishing
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', cursor: 'pointer' }}>
              <input type="checkbox" checked={settings.autoRetry} onChange={e => updateSetting('autoRetry', e.target.checked)} style={{ cursor: 'pointer' }} /> Auto-retry failed posts (up to 1 time)
            </label>
          </div>
        </div>
        
        <div style={{ height: 1, background: 'var(--border-secondary)' }} />
        
        <div>
          <h4 style={{ margin: '0 0 12px 0', fontSize: 'var(--font-size-sm)', color: 'var(--text-primary)' }}>Email Notifications</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', cursor: 'pointer' }}>
              <input type="checkbox" checked={settings.notifySuccess} onChange={e => updateSetting('notifySuccess', e.target.checked)} style={{ cursor: 'pointer' }} /> Notify me when a post is successfully published
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', cursor: 'pointer' }}>
              <input type="checkbox" checked={settings.notifyExpire} onChange={e => updateSetting('notifyExpire', e.target.checked)} style={{ cursor: 'pointer' }} /> Notify me if this account connection expires
            </label>
          </div>
        </div>
        
        {account.platform === 'facebook' && (
          <>
            <div style={{ height: 1, background: 'var(--border-secondary)' }} />
            <div>
              <h4 style={{ margin: '0 0 12px 0', fontSize: 'var(--font-size-sm)', color: 'var(--text-primary)' }}>Facebook Preferences</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                  <input type="checkbox" checked={settings.postAsPage} onChange={e => updateSetting('postAsPage', e.target.checked)} style={{ cursor: 'pointer' }} /> Publish posts as the Page identity
                </label>
              </div>
            </div>
          </>
        )}
      </div>
    </Modal>
  )
}

function AccountCard({ account, onDisconnect, onReconnect, onSettingsClick }) {
  const info = PLATFORM_INFO[account.platform] || {
    name: account.platform,
    color: '#6b7280',
    scopes: [],
  }
  const isExpired = account.status === 'expired'

  return (
    <div className="card animate-slide-up" style={{ padding: 0 }}>
      <div style={{ padding: '20px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 44, height: 44, borderRadius: 'var(--radius-lg)', background: `${info.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <PlatformIcon platform={account.platform} size={24} />
            </div>
            <div>
              <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: 'var(--font-size-md)' }}>{account.account_name}</div>
              <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)', marginTop: 2 }}>
                {info.name}
                {account.followers > 0 && ` · ${account.followers.toLocaleString()} followers`}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {isExpired ? (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 'var(--radius-full)', fontSize: 'var(--font-size-xs)', fontWeight: 600, background: 'var(--color-warning-50)', color: 'var(--color-warning-600)' }}>
                Expired
              </span>
            ) : (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 'var(--radius-full)', fontSize: 'var(--font-size-xs)', fontWeight: 600, background: 'var(--color-success-50)', color: 'var(--color-success-600)' }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--color-success-500)', animation: 'pulse 2s ease-in-out infinite', display: 'inline-block' }} />
                Active
              </span>
            )}
          </div>
        </div>

        {/* Permission badges */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 16 }}>
          {info.scopes.map(scope => (
            <span key={scope} style={{ padding: '2px 8px', borderRadius: 'var(--radius-full)', background: 'var(--bg-tertiary)', color: 'var(--text-tertiary)', fontSize: 10, fontWeight: 600 }}>
              {scope}
            </span>
          ))}
        </div>

        {/* Stats row - Currently only showing connected date as backend metrics aren't built yet */}
        {!isExpired && (
          <div style={{ display: 'flex', gap: 24, marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border-secondary)' }}>
            <div>
              <div style={{ fontSize: 10, color: 'var(--text-tertiary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Connected Since</div>
              <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 700, color: 'var(--text-primary)', marginTop: 2 }}>
                {new Date(account.connected_at).toLocaleDateString()}
              </div>
            </div>
          </div>
        )}

        {isExpired && (
          <div style={{ marginTop: 12, padding: '10px 14px', background: 'var(--color-warning-50)', borderRadius: 'var(--radius-lg)', fontSize: 'var(--font-size-xs)', color: 'var(--color-warning-600)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>Your {info.name} connection has expired. Reconnect to continue publishing.</span>
          </div>
        )}
      </div>

      <div style={{ padding: '12px 24px', borderTop: '1px solid var(--border-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
        <Button variant="ghost" size="sm" onClick={() => onSettingsClick(account)}>
          Settings
        </Button>
        {isExpired ? (
          <Button variant="primary" size="sm" onClick={() => onReconnect(account)}>
            Reconnect
          </Button>
        ) : (
          <Button variant="secondary" size="sm" onClick={() => onDisconnect(account)}>
            Disconnect
          </Button>
        )}
      </div>
    </div>
  )
}

function ConnectModal({ isOpen, onClose }) {
  const [connecting, setConnecting] = useState(null)
  const [showFbOptions, setShowFbOptions] = useState(false)

  const handleConnect = (platform) => {
    if (platform === 'facebook' && !showFbOptions) {
      setShowFbOptions(true)
      return
    }

    setConnecting(platform)

    if (platform === 'facebook_page' || platform === 'facebook_group' || platform === 'instagram') {
      const type = platform === 'facebook_group' ? 'group' : 'page'
      axios.get(`/api/social/meta/url?type=${type}&target=${platform}`)
        .then(res => {
          if (res.data?.url) {
            window.location.href = res.data.url
          } else {
            toast.error('Could not generate Meta login URL')
            setConnecting(null)
            setShowFbOptions(false)
          }
        })
        .catch(err => {
          console.error('Meta connect error:', err)
          toast.error(err.response?.data?.message || 'Failed to initialize Meta login. Check network & Meta API credentials.')
          setConnecting(null)
          setShowFbOptions(false)
        })
    } else if (platform === 'linkedin') {
      axios.get(`/api/social/oauth/linkedin`)
        .then(res => {
          if (res.data?.url) {
            window.location.href = res.data.url
          } else {
            toast.error('Could not generate LinkedIn login URL')
            setConnecting(null)
          }
        })
        .catch(err => {
          console.error('LinkedIn connect error:', err)
          toast.error(err.response?.data?.message || 'Failed to initialize LinkedIn login')
          setConnecting(null)
        })
    } else if (platform === 'gmb') {
      axios.get(`/api/social/google-business/url`)
        .then(res => {
          if (res.data?.url) {
            window.location.href = res.data.url
          } else {
            toast.error('Could not generate Google Business login URL')
            setConnecting(null)
          }
        })
        .catch(err => {
          console.error('Google connect error:', err)
          toast.error(err.response?.data?.message || 'Failed to initialize Google login')
          setConnecting(null)
        })
    } else if (platform === 'google_ads') {
      axios.get(`/api/social/google-ads/url`)
        .then(res => {
          if (res.data?.url) {
            window.location.href = res.data.url
          } else {
            toast.error('Could not generate Google Ads login URL')
            setConnecting(null)
          }
        })
        .catch(err => {
          console.error('Google Ads connect error:', err)
          toast.error(err.response?.data?.message || 'Failed to initialize Google Ads login')
          setConnecting(null)
        })
    } else {
      window.location.href = `/api/oauth/${platform}`
    }
  }

  const handleClose = () => {
    setShowFbOptions(false)
    setConnecting(null)
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={showFbOptions ? "Select Facebook Account Type" : "Connect Social Account"}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {showFbOptions ? (
          <>
            <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', marginBottom: 8 }}>
              Check out our guide to supported channels for more details.
            </p>
            <button
              disabled={!!connecting}
              onClick={() => handleConnect('facebook_page')}
              style={{
                display: 'flex', alignItems: 'flex-start', gap: 16, padding: '16px 20px',
                background: 'var(--bg-secondary)', border: '1.5px solid var(--border-primary)',
                borderRadius: 'var(--radius-lg)', cursor: 'pointer', width: '100%',
                transition: 'all var(--transition-base)', fontFamily: 'inherit', textAlign: 'left',
              }}
              onMouseEnter={e => { if (!connecting) e.currentTarget.style.borderColor = '#1877f2' }}
              onMouseLeave={e => { if (connecting !== 'facebook_page') e.currentTarget.style.borderColor = 'var(--border-primary)' }}
            >
              <div style={{ width: 44, height: 44, borderRadius: 12, background: '#1877f218', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {connecting === 'facebook_page' ? (
                   <div style={{ width: 20, height: 20, border: '2px solid #1877f240', borderTop: '2px solid #1877f2', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                ) : (
                   <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1877f2" strokeWidth="2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>
                )}
              </div>
              <div>
                <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: 'var(--font-size-sm)' }}>Page</div>
                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)', marginTop: 2, lineHeight: 1.5 }}>
                  A page is for businesses, brands, organizations and public figures. Connecting to personal profiles is not supported by Meta.
                </div>
              </div>
            </button>
            <button
              disabled={!!connecting}
              onClick={() => handleConnect('facebook_group')}
              style={{
                display: 'flex', alignItems: 'flex-start', gap: 16, padding: '16px 20px',
                background: 'var(--bg-secondary)', border: '1.5px solid var(--border-primary)',
                borderRadius: 'var(--radius-lg)', cursor: 'pointer', width: '100%',
                transition: 'all var(--transition-base)', fontFamily: 'inherit', textAlign: 'left',
              }}
              onMouseEnter={e => { if (!connecting) e.currentTarget.style.borderColor = '#1877f2' }}
              onMouseLeave={e => { if (connecting !== 'facebook_group') e.currentTarget.style.borderColor = 'var(--border-primary)' }}
            >
              <div style={{ width: 44, height: 44, borderRadius: 12, background: '#1877f218', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {connecting === 'facebook_group' ? (
                   <div style={{ width: 20, height: 20, border: '2px solid #1877f240', borderTop: '2px solid #1877f2', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                ) : (
                   <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1877f2" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
                )}
              </div>
              <div>
                <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: 'var(--font-size-sm)' }}>Group</div>
                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)', marginTop: 2, lineHeight: 1.5 }}>
                  Share to Groups as a member or an admin. Direct publishing to Facebook Groups is restricted by Meta for new apps.
                </div>
              </div>
            </button>
            <Button variant="ghost" onClick={() => setShowFbOptions(false)} disabled={!!connecting} style={{ alignSelf: 'flex-start', marginTop: 8 }}>
              ← Back
            </Button>
          </>
        ) : (
          <>
            <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', marginBottom: 8 }}>
              Choose a platform to connect. You&apos;ll be redirected to authorize access.
            </p>
            {Object.entries(PLATFORM_INFO).map(([key, info]) => (
              <button
                key={key}
                disabled={!!connecting}
                onClick={() => handleConnect(key)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 16, padding: '16px 20px',
                  background: 'var(--bg-secondary)', border: `1.5px solid ${connecting === key ? info.color : 'var(--border-primary)'}`,
                  borderRadius: 'var(--radius-lg)', cursor: 'pointer', width: '100%',
                  transition: 'all var(--transition-base)', fontFamily: 'inherit', textAlign: 'left',
                }}
                onMouseEnter={e => { if (!connecting) { e.currentTarget.style.borderColor = info.color; e.currentTarget.style.background = `${info.color}08` } }}
                onMouseLeave={e => { if (connecting !== key) { e.currentTarget.style.borderColor = 'var(--border-primary)'; e.currentTarget.style.background = 'var(--bg-secondary)' } }}
              >
                <div style={{ width: 44, height: 44, borderRadius: 12, background: `${info.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {connecting === key ? (
                    <div style={{ width: 20, height: 20, border: `2px solid ${info.color}40`, borderTop: `2px solid ${info.color}`, borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                  ) : (
                    <PlatformIcon platform={key} size={24} />
                  )}
                </div>
                <div>
                  <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: 'var(--font-size-sm)' }}>{info.name}</div>
                  <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)', marginTop: 2 }}>{info.desc}</div>
                </div>
                {connecting === key ? (
                  <span style={{ marginLeft: 'auto', fontSize: 'var(--font-size-xs)', color: info.color, fontWeight: 600 }}>Connecting...</span>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: 'auto', color: 'var(--text-tertiary)' }}>
                    <path d="M9 18l6-6-6-6"/>
                  </svg>
                )}
              </button>
            ))}
          </>
        )}
      </div>
    </Modal>
  )
}

export default function ConnectedAccounts() {
  const [accounts, setAccounts] = useState([])
  const [loading, setLoading] = useState(true)
  const [connectModalOpen, setConnectModalOpen] = useState(false)
  const [disconnectTarget, setDisconnectTarget] = useState(null)
  const [settingsTarget, setSettingsTarget] = useState(null)
  const [searchParams] = useSearchParams()
  const [selectMetaKey, setSelectMetaKey] = useState(searchParams.get('select_meta'))
  const [selectGoogleKey, setSelectGoogleKey] = useState(searchParams.get('select_google'))

  useEffect(() => {
    // Check for OAuth callbacks
    const successMsg = searchParams.get('success')
    const errorMsg = searchParams.get('error')
    const metaKey = searchParams.get('select_meta')

    if (metaKey || successMsg || errorMsg) {
      // Clear URL params cleanly
      window.history.replaceState({}, document.title, window.location.pathname)
    }

    if (metaKey) {
      setSelectMetaKey(metaKey)
    } else if (successMsg === 'facebook_connected' || successMsg === 'meta_connected') {
      toast.success('Facebook account(s) successfully connected!')
    } else if (errorMsg) {
      toast.error('Failed to connect account: ' + errorMsg)
    }

    fetchAccounts()
  }, [])

  const fetchAccounts = () => {
    setLoading(true)
    axios.get('/api/social/accounts')
      .then(res => {
        const accs = res.data?.accounts || (Array.isArray(res.data) ? res.data : (res.data?.data?.data || res.data?.data || []))
        setAccounts(Array.isArray(accs) ? accs : [])
      })
      .catch(err => {
        console.error('Failed to fetch accounts:', err)
        setAccounts([])
      })
      .finally(() => setLoading(false))
  }

  const handleDisconnect = (account) => setDisconnectTarget(account)
  
  const confirmDisconnect = () => {
    axios.delete(`/api/social/accounts/${disconnectTarget.id}`)
      .then(res => {
        if (res.data.success) {
          setAccounts(a => a.filter(x => x.id !== disconnectTarget.id))
          toast.success(`${disconnectTarget.account_name} disconnected.`)
        }
      })
      .catch(err => toast.error('Failed to disconnect account'))
      .finally(() => setDisconnectTarget(null))
  }

  const handleReconnect = (account) => {
    axios.post(`/api/social/accounts/${account.id}/reconnect`)
      .then(res => {
        if (res.data.redirect_url) {
          window.location.href = res.data.redirect_url
        }
      })
      .catch(err => toast.error('Failed to initiate reconnect'))
  }

  return (
    <DashboardLayout
      title="Connected Accounts"
      actions={
        <Button variant="primary" size="sm" onClick={() => setConnectModalOpen(true)}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg>
          Connect Account
        </Button>
      }
    >
      {/* Platform availability notice */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-xl)', padding: '16px 20px', marginBottom: 24, display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ width: 32, height: 32, borderRadius: 'var(--radius-md)', background: 'var(--color-info-50)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-info-600)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>
          </svg>
        </div>
        <div>
      <div style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)', color: 'var(--text-primary)' }}>OAuth Integration Notice</div>
          <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', marginTop: 2, lineHeight: 1.6 }}>
            To enable real platform connections, configure your Facebook App ID, Instagram App ID, and LinkedIn Client ID in the backend <code style={{ background: 'var(--bg-tertiary)', padding: '1px 4px', borderRadius: 4 }}>.env</code> file. See the backend setup guide for OAuth configuration.
          </div>
        </div>
      </div>

      {/* Summary strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Total Connected', value: accounts.length, color: '#7c5cfc' },
          { label: 'Active Accounts', value: accounts.filter(a => a.status === 'active').length, color: '#10b981' },
          { label: 'Requires Reconnect', value: accounts.filter(a => a.status === 'expired').length, color: '#f59e0b' },
        ].map((s, i) => (
          <div key={i} className="stat-card animate-slide-up" style={{
            borderTop: `4.5px solid ${s.color}`,
            borderLeft: '1px solid var(--border-primary)',
            borderRight: '1px solid var(--border-primary)',
            borderBottom: '1px solid var(--border-primary)',
            borderRadius: '16px',
            background: 'var(--bg-card)',
            padding: '20px 22px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.03)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between'
          }}>
            <div>
              <div style={{ fontSize: '11px', fontWeight: 800, color: s.color, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>{s.label}</div>
              <div style={{ fontSize: '26px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.04em', lineHeight: 1.1 }}>{s.value}</div>
            </div>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: s.color, boxShadow: `0 0 10px ${s.color}` }} />
          </div>
        ))}
      </div>

      {/* Account cards */}
      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-tertiary)' }}>Loading accounts...</div>
      ) : accounts.length === 0 ? (
        <div style={{ padding: 40, textAlign: 'center', background: 'var(--bg-card)', borderRadius: 'var(--radius-xl)', border: '1px dashed var(--border-primary)' }}>
          <p style={{ color: 'var(--text-secondary)' }}>No social accounts connected yet.</p>
          <Button variant="primary" style={{ marginTop: 16 }} onClick={() => setConnectModalOpen(true)}>Connect Your First Account</Button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {accounts.map(acc => (
            <AccountCard
              key={acc.id}
              account={acc}
              onDisconnect={handleDisconnect}
              onReconnect={handleReconnect}
              onSettingsClick={(acc) => setSettingsTarget(acc)}
            />
          ))}
        </div>
      )}

      {/* Connect Modal */}
      <ConnectModal isOpen={connectModalOpen} onClose={() => setConnectModalOpen(false)} />

      {/* Select Meta Accounts Modal */}
      <SelectMetaAccountsModal 
        metaKey={selectMetaKey} 
        onClose={() => setSelectMetaKey(null)} 
        onConfirm={() => { setSelectMetaKey(null); fetchAccounts(); }} 
      />

      {/* Select Google Accounts Modal */}
      <SelectGoogleAccountsModal 
        googleKey={selectGoogleKey} 
        onClose={() => setSelectGoogleKey(null)} 
        onConfirm={() => { setSelectGoogleKey(null); fetchAccounts(); }} 
      />

      {/* Disconnect Confirm Modal */}
      <Modal
        isOpen={!!disconnectTarget}
        onClose={() => setDisconnectTarget(null)}
        title="Disconnect Account"
        footer={
          <>
            <Button variant="ghost" onClick={() => setDisconnectTarget(null)}>Cancel</Button>
            <Button variant="danger" onClick={confirmDisconnect}>Disconnect</Button>
          </>
        }
      >
        <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', lineHeight: 1.7 }}>
          <p>Are you sure you want to disconnect <strong>{disconnectTarget?.account_name}</strong>?</p>
          <br />
          <p>All scheduled posts for this account will be cancelled. This action cannot be undone.</p>
        </div>
      </Modal>

      {/* Account Settings Modal */}
      <AccountSettingsModal 
        isOpen={!!settingsTarget} 
        onClose={() => setSettingsTarget(null)} 
        account={settingsTarget} 
      />
    </DashboardLayout>
  )
}
