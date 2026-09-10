import { useState, useRef, useEffect } from 'react'
import { useNavigate, useSearchParams, useParams } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import { DashboardLayout } from '../../components/Layout'
import { Button, PlatformIcon, Avatar, Modal } from '../../components/ui'
import { useSocialAccountsStore, usePostsStore, useMediaStore } from '../../store'
import axios from 'axios'

const PLATFORM_COLORS = { facebook: '#1877f2', instagram: '#e1306c', linkedin: '#0077b5' }

const getBase64 = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.readAsDataURL(file);
  reader.onload = () => resolve(reader.result);
  reader.onerror = error => reject(error);
});

function PlatformPreview({ platform, account, content, media }) {
  if (!platform || !account) {
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12, color: 'var(--text-tertiary)' }}>
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>
        </svg>
        <p style={{ fontSize: 'var(--font-size-sm)' }}>Select a platform to see preview</p>
      </div>
    )
  }

  const renderFacebook = () => (
    <div style={{ border: '1px solid #ddd', borderRadius: 8, background: 'white', overflow: 'hidden', maxWidth: 380, fontFamily: 'Helvetica, Arial, sans-serif' }}>
      <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#1877f2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: 14 }}>
          {account.account_name[0]}
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 14, color: '#1c1e21' }}>{account.account_name}</div>
          <div style={{ fontSize: 12, color: '#65676b' }}>Just now</div>
        </div>
        <div style={{ marginLeft: 'auto', color: '#65676b', fontSize: 20 }}>···</div>
      </div>
      {content && <div style={{ padding: '0 16px 12px', fontSize: 14, color: '#1c1e21', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{content}</div>}
      {media && <img src={media} alt="Post media" style={{ width: '100%', maxHeight: 280, objectFit: 'cover' }} />}
      <div style={{ padding: '8px 16px', borderTop: '1px solid #e4e6eb', display: 'flex', gap: 20 }}>
        {['Like', 'Comment', 'Share'].map(a => (
          <button key={a} style={{ background: 'none', border: 'none', color: '#65676b', fontSize: 13, fontWeight: 600, cursor: 'pointer', padding: '6px 0' }}>{a}</button>
        ))}
      </div>
    </div>
  )

  const renderInstagram = () => (
    <div style={{ border: '1px solid #dbdbdb', borderRadius: 8, background: 'white', overflow: 'hidden', maxWidth: 380, fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>
      <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(45deg, #f09433,#e6683c,#dc2743,#cc2366,#bc1888)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: 12 }}>
          {account.account_name[1] || account.account_name[0]}
        </div>
        <div style={{ fontWeight: 600, fontSize: 14, color: '#262626' }}>{account.account_name}</div>
        <div style={{ marginLeft: 'auto', color: '#262626', fontSize: 20, cursor: 'pointer' }}>···</div>
      </div>
      {media ? (
        <img src={media} alt="Post" style={{ width: '100%', maxHeight: 380, objectFit: 'cover' }} />
      ) : (
        <div style={{ background: '#fafafa', height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#c7c7c7', flexDirection: 'column', gap: 8 }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/>
          </svg>
          <span style={{ fontSize: 12 }}>Add a photo or video</span>
        </div>
      )}
      <div style={{ padding: '12px 16px' }}>
        <div style={{ display: 'flex', gap: 14, marginBottom: 8, fontSize: 13, fontWeight: 600, color: '#262626' }}>
          <span>Like</span>
          <span>Comment</span>
          <span>Share</span>
        </div>
        <div style={{ fontSize: 14, color: '#262626', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
          <strong>{account.account_name}</strong>{' '}
          {content || <span style={{ color: '#c7c7c7' }}>Write a caption...</span>}
        </div>
      </div>
    </div>
  )

  const renderLinkedIn = () => (
    <div style={{ border: '1px solid #e0e0e0', borderRadius: 8, background: 'white', overflow: 'hidden', maxWidth: 380, fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>
      <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <div style={{ width: 48, height: 48, borderRadius: 4, background: '#0077b5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: 16, flexShrink: 0 }}>
          {account.account_name[0]}
        </div>
        <div>
          <div style={{ fontWeight: 600, fontSize: 14, color: '#000000de' }}>{account.account_name}</div>
          <div style={{ fontSize: 12, color: '#00000099' }}>Just now</div>
        </div>
        <div style={{ marginLeft: 'auto', cursor: 'pointer', color: '#00000099', fontSize: 20 }}>···</div>
      </div>
      {content && <div style={{ padding: '0 16px 12px', fontSize: 14, color: '#000000de', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{content}</div>}
      {media && <img src={media} alt="Post" style={{ width: '100%', maxHeight: 280, objectFit: 'cover' }} />}
      <div style={{ padding: '6px 16px', borderTop: '1px solid #e0e0e0', display: 'flex', gap: 16 }}>
        {['Like', 'Comment', 'Repost', 'Send'].map(a => (
          <button key={a} style={{ background: 'none', border: 'none', color: '#00000099', fontSize: 12, fontWeight: 600, cursor: 'pointer', padding: '8px 0' }}>{a}</button>
        ))}
      </div>
    </div>
  )

  const renderers = { facebook: renderFacebook, instagram: renderInstagram, linkedin: renderLinkedIn }
  return renderers[platform]?.() || null
}

export default function CreatePost() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEditing = !!id
  const fileInputRef = useRef()

  const [form, setForm] = useState({
    accountIds: [],
    content: '',
    hashtags: '',
    link: '',
    postType: 'text',
    scheduledAt: '',
    publishNow: true,
  })
  
  const [overrides, setOverrides] = useState({})
  const [activeTab, setActiveTab] = useState('default')

  const [media, setMedia] = useState(null)
  const [mediaPreview, setMediaPreview] = useState(null)
  const [loading, setLoading] = useState(false)
  const [charCount, setCharCount] = useState(0)
  const [mediaSourceModalOpen, setMediaSourceModalOpen] = useState(false)
  const [mediaLibraryModalOpen, setMediaLibraryModalOpen] = useState(false)

  const { accounts, fetchAccounts, fetched: accountsFetched } = useSocialAccountsStore()
  const { fetchPosts } = usePostsStore()
  const { media: libraryItems, fetchMedia, fetched: libraryFetched } = useMediaStore()

  useEffect(() => {
    if (!accountsFetched) fetchAccounts()
  }, [accountsFetched, fetchAccounts])

  useEffect(() => {
    if (isEditing) {
      axios.get(`/api/posts/${id}`).then(res => {
        if (res.data.success) {
          const p = res.data.post
          setForm({
            accountIds: [String(p.social_account_id)],
            content: p.content || '',
            hashtags: p.hashtags || '',
            link: p.link || '',
            postType: p.post_type || 'text',
            scheduledAt: p.scheduled_at ? p.scheduled_at.substring(0, 16) : '',
            publishNow: p.status === 'published' || p.status === 'queued' || !p.scheduled_at,
          })
          if (p.media_path) {
            setMediaPreview(p.media_path)
          }
        }
      }).catch(err => {
        toast.error('Failed to load post data')
      })
    }
  }, [isEditing, id])

  const toggleAccount = (accId) => {
    setForm(f => {
      if (isEditing) return { ...f, accountIds: [accId] };
      const ids = f.accountIds.includes(accId) ? f.accountIds.filter(i => i !== accId) : [...f.accountIds, accId];
      
      if (!f.accountIds.includes(accId)) {
        setOverrides(o => ({
          ...o,
          [accId]: { enabled: false, content: f.content, hashtags: f.hashtags, link: f.link, publishNow: f.publishNow, scheduledAt: f.scheduledAt }
        }));
      } else {
        if (activeTab === accId) setActiveTab('default');
      }
      return { ...f, accountIds: ids };
    });
  }

  const handleMediaChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (file.size > 50 * 1024 * 1024) { toast.error('File size must be under 50MB'); return }
    setMedia(file)
    const reader = new FileReader()
    reader.onloadend = () => setMediaPreview(reader.result)
    reader.readAsDataURL(file)
  }

  const updateField = (field, value) => {
    if (activeTab === 'default') {
      setForm(f => ({ ...f, [field]: value }))
      if (field === 'content') setCharCount(value.length)
    } else {
      setOverrides(o => ({
        ...o,
        [activeTab]: {
          ...o[activeTab],
          [field]: value
        }
      }))
      if (field === 'content') setCharCount(value.length)
    }
  }

  const handlePublish = async () => {
    if (form.accountIds.length === 0) { toast.error('Please select at least one account'); return }
    if (!form.content.trim() && !media && !Object.values(overrides).some(o => o.enabled && o.content.trim())) { toast.error('Add content or media to publish'); return }
    
    setLoading(true)
    
    try {
      let mediaBase64 = null;
      if (media) {
        if (media.isLibraryUrl) {
          mediaBase64 = media.url;
        } else if (media instanceof File) {
          mediaBase64 = await getBase64(media);
        } else if (mediaPreview) {
          mediaBase64 = mediaPreview;
        }
      }

      let res;
      if (isEditing) {
        const payload = {
          social_account_id: form.accountIds[0],
          content: form.content,
          status: form.publishNow ? 'publish_now' : 'scheduled',
          post_type: media ? (media.type.startsWith('video/') ? 'video' : 'image') : form.postType,
        };
        if (form.scheduledAt) payload.scheduled_at = form.scheduledAt.replace('T', ' ') + ':00';
        if (mediaBase64) payload.media_base64 = mediaBase64;

        
        res = await axios.put(`/api/posts/${id}`, payload, { headers: { 'Content-Type': 'application/json' } });
      } else {
        const payload = {
          post_type: media ? (media.type.startsWith('video/') ? 'video' : 'image') : 'text',
          posts: form.accountIds.map(accId => {
            const ov = overrides[accId]?.enabled ? overrides[accId] : form;
            return {
              social_account_id: accId,
              content: ov.content,
              hashtags: ov.hashtags,
              link: ov.link,
              status: ov.publishNow ? 'publish_now' : 'scheduled',
              scheduled_at: ov.scheduledAt ? ov.scheduledAt.replace('T', ' ') + ':00' : null
            }
          })
        };
        if (mediaBase64) payload.media_base64 = mediaBase64;
        
        res = await axios.post('/api/posts', payload, { headers: { 'Content-Type': 'application/json' } });
      }
      
      if (res.data.success) {
        let hasFailed = false;
        
        if (isEditing) {
          if (res.data.post && res.data.post.status === 'failed') {
            hasFailed = true;
          }
        } else {
          const posts = res.data.posts || [];
          if (posts.some(p => p.status === 'failed')) {
            hasFailed = true;
          }
        }

        if (hasFailed) {
          toast.error('One or more posts failed to publish. Check the posts list for details.');
        } else {
          toast.success(form.publishNow ? `Post ${isEditing ? 'updated' : 'published'} successfully!` : `Post ${isEditing ? 'updated' : 'scheduled'}!`);
        }
        
        fetchPosts() // refresh posts store
        navigate('/posts')
      }
    } catch (err) {
      toast.error('Failed to create post')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const currentContent = activeTab === 'default' || !overrides[activeTab]?.enabled ? form.content : overrides[activeTab].content;
  const currentHashtags = activeTab === 'default' || !overrides[activeTab]?.enabled ? form.hashtags : overrides[activeTab].hashtags;
  const currentLink = activeTab === 'default' || !overrides[activeTab]?.enabled ? form.link : overrides[activeTab].link;
  const currentPublishNow = activeTab === 'default' || !overrides[activeTab]?.enabled ? form.publishNow : overrides[activeTab].publishNow;
  const currentScheduledAt = activeTab === 'default' || !overrides[activeTab]?.enabled ? form.scheduledAt : overrides[activeTab].scheduledAt;

  const selectedAccountDetails = activeTab !== 'default' ? accounts.find(a => String(a.id) === activeTab) : null;
  const isOverrideEnabled = activeTab !== 'default' && overrides[activeTab]?.enabled;
  const opacity = (activeTab !== 'default' && !isOverrideEnabled) ? 0.5 : 1;
  const pointerEvents = (activeTab !== 'default' && !isOverrideEnabled) ? 'none' : 'auto';

  return (
    <DashboardLayout title={isEditing ? 'Edit Post' : 'Create Post'}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: 24, height: 'calc(100vh - 130px)', overflow: 'hidden' }}>
        {/* Left: Composer */}
        <div style={{ overflow: 'auto', paddingRight: 4, paddingBottom: 64 }}>
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-header">
              <h3 style={{ fontSize: 'var(--font-size-md)', fontWeight: 700, color: 'var(--text-primary)' }}>Select Platform & Account</h3>
            </div>
            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                {accounts.filter(a => a.status === 'active').length === 0 ? (
                  <div style={{ padding: '12px 16px', background: 'var(--color-warning-50)', borderRadius: 'var(--radius-lg)', fontSize: 'var(--font-size-sm)', color: 'var(--color-warning-600)', marginTop: 8 }}>
                    No active accounts found. <button onClick={() => navigate('/accounts')} style={{ fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontFamily: 'inherit' }}>Connect one →</button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 8, maxHeight: 200, overflowY: 'auto' }}>
                    {['facebook', 'instagram', 'linkedin'].map(p => {
                      const platformAccs = accounts.filter(a => a.platform === p && a.status === 'active');
                      if (platformAccs.length === 0) return null;
                      return (
                        <div key={p} style={{ background: 'var(--bg-secondary)', padding: '12px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-primary)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, color: PLATFORM_COLORS[p], fontWeight: 600, fontSize: 'var(--font-size-xs)', textTransform: 'uppercase' }}>
                            <PlatformIcon platform={p} size={14} /> {p}
                          </div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                            {platformAccs.map(a => (
                              <label key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: isEditing ? 'not-allowed' : 'pointer', fontSize: 'var(--font-size-sm)', background: 'var(--bg-primary)', padding: '6px 12px', borderRadius: 'var(--radius-full)', border: '1px solid var(--border-primary)' }}>
                                <input 
                                  type={isEditing ? "radio" : "checkbox"} 
                                  checked={form.accountIds.includes(String(a.id))} 
                                  onChange={() => !isEditing && toggleAccount(String(a.id))}
                                  disabled={isEditing}
                                  style={{ accentColor: PLATFORM_COLORS[p], width: 14, height: 14 }}
                                />
                                <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{a.account_name}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Customization Tabs */}
          {form.accountIds.length > 0 && !isEditing && (
            <div className="tabs" style={{ marginBottom: 16, maxWidth: '100%', overflowX: 'auto' }}>
              <button
                className={`tab-btn ${activeTab === 'default' ? 'active' : ''}`}
                onClick={() => { setActiveTab('default'); setCharCount(form.content.length); }}
              >
                Default Options
              </button>
              {form.accountIds.map(id => {
                const acc = accounts.find(a => String(a.id) === id);
                if (!acc) return null;
                return (
                  <button
                    key={id}
                    className={`tab-btn ${activeTab === id ? 'active' : ''}`}
                    onClick={() => { setActiveTab(id); setCharCount(overrides[id]?.content?.length || form.content.length); }}
                  >
                    <PlatformIcon platform={acc.platform} size={14} />
                    {acc.account_name}
                  </button>
                )
              })}
            </div>
          )}

          {activeTab !== 'default' && (
            <div style={{ marginBottom: 16, padding: '12px 16px', background: isOverrideEnabled ? 'var(--color-success-50)' : 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: isOverrideEnabled ? '1px solid var(--color-success-200)' : '1px solid transparent', transition: '0.2s' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <PlatformIcon platform={selectedAccountDetails?.platform} size={18} />
                <div style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)', color: 'var(--text-primary)' }}>
                  Customize for {selectedAccountDetails?.account_name}
                </div>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>
                <input 
                  type="checkbox" 
                  checked={isOverrideEnabled}
                  onChange={(e) => {
                    const enabled = e.target.checked;
                    setOverrides(o => ({
                      ...o,
                      [activeTab]: {
                        ...o[activeTab],
                        enabled,
                        content: enabled ? o[activeTab].content || form.content : form.content,
                        hashtags: enabled ? o[activeTab].hashtags || form.hashtags : form.hashtags,
                        link: enabled ? o[activeTab].link || form.link : form.link,
                        publishNow: enabled ? o[activeTab].publishNow ?? form.publishNow : form.publishNow,
                        scheduledAt: enabled ? o[activeTab].scheduledAt || form.scheduledAt : form.scheduledAt,
                      }
                    }))
                  }}
                  style={{ accentColor: 'var(--color-success-500)', width: 18, height: 18 }}
                />
                Enable Overrides
              </label>
            </div>
          )}

          <div style={{ opacity, pointerEvents, transition: '0.2s' }}>
            {/* Content */}
            <div className="card" style={{ marginBottom: 16 }}>
              <div className="card-header">
                <h3 style={{ fontSize: 'var(--font-size-md)', fontWeight: 700, color: 'var(--text-primary)' }}>Content</h3>
                <span style={{ fontSize: 'var(--font-size-xs)', color: charCount > 2200 ? 'var(--color-error-500)' : 'var(--text-tertiary)', fontWeight: 600 }}>
                  {charCount} chars
                </span>
              </div>
              <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div className="form-group">
                  <label className="form-label">Caption / Text</label>
                  <textarea
                    className="form-textarea"
                    placeholder={`Write your social media post here...\n\nTip: Use line breaks, emojis, and @mentions for better engagement!`}
                    value={currentContent}
                    onChange={(e) => updateField('content', e.target.value)}
                    rows={6}
                    style={{ resize: 'vertical' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div className="form-group">
                    <label className="form-label">Hashtags</label>
                    <input
                      className="form-input"
                      placeholder="#marketing #socialmedia"
                      value={currentHashtags}
                      onChange={(e) => updateField('hashtags', e.target.value)}
                    />
                    <span className="form-hint">Separate with spaces</span>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Link (optional)</label>
                    <input
                      className="form-input"
                      placeholder="https://yourwebsite.com"
                      type="url"
                      value={currentLink}
                      onChange={(e) => updateField('link', e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Media */}
            <div className="card" style={{ marginBottom: 16 }}>
              <div className="card-header">
                <h3 style={{ fontSize: 'var(--font-size-md)', fontWeight: 700, color: 'var(--text-primary)' }}>Media</h3>
                <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}>Applies to all accounts</span>
              </div>
              <div className="card-body">
                {mediaPreview ? (
                  <div style={{ position: 'relative' }}>
                    <img src={mediaPreview} alt="Preview" style={{ width: '100%', maxHeight: 240, objectFit: 'cover', borderRadius: 'var(--radius-lg)' }} />
                    <button
                      onClick={() => { setMedia(null); setMediaPreview(null) }}
                      style={{
                        position: 'absolute', top: 8, right: 8, width: 28, height: 28, borderRadius: '50%',
                        background: 'rgba(0,0,0,0.6)', color: 'white', border: 'none', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14,
                      }}
                    >×</button>
                  </div>
                ) : (
                  <div
                    className="upload-zone"
                    onClick={() => setMediaSourceModalOpen(true)}
                    style={{ padding: '32px' }}
                  >
                    <div className="upload-zone-icon">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
                      </svg>
                    </div>
                    <p style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, color: 'var(--text-secondary)' }}>
                      Click to choose media source
                    </p>
                    <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}>
                      Local System or Media Library
                    </p>
                    <input ref={fileInputRef} type="file" accept="image/*,video/*" style={{ display: 'none' }} onChange={handleMediaChange} />
                  </div>
                )}
              </div>
            </div>

          </div>

          <div className="card" style={{ padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ fontSize: 'var(--font-size-md)', fontWeight: 700, color: 'var(--text-primary)' }}>Content & Schedule</h3>
              {form.accountIds.length > 1 && (
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    type="button"
                    className={`btn btn-xs ${activeTab === 'global' ? 'btn-primary' : 'btn-ghost'}`}
                    onClick={() => setActiveTab('global')}
                  >
                    All Platforms
                  </button>
                  {form.accountIds.map(id => {
                    const acc = accounts.find(a => String(a.id) === id)
                    if (!acc) return null
                    return (
                      <button
                        key={id}
                        type="button"
                        className={`btn btn-xs ${activeTab === id ? 'btn-primary' : 'btn-ghost'}`}
                        onClick={() => setActiveTab(id)}
                      >
                        {acc.platform}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Post editor */}
            <div className="form-group">
              <label className="form-label">Message</label>
              <textarea
                className="form-input"
                rows={5}
                placeholder="Write your post content..."
                value={currentContent}
                onChange={e => updateField('content', e.target.value)}
                style={{ resize: 'vertical' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div className="form-group">
                <label className="form-label">Hashtags</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="#marketing #social"
                  value={currentHashtags}
                  onChange={e => updateField('hashtags', e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Link URL</label>
                <input
                  type="url"
                  className="form-input"
                  placeholder="https://example.com"
                  value={currentLink}
                  onChange={e => updateField('link', e.target.value)}
                />
              </div>
            </div>

            {/* Media upload */}
            <div className="form-group" style={{ marginBottom: 20 }}>
              <label className="form-label">Media Attachment</label>
              <input
                type="file"
                accept="image/*,video/*"
                onChange={handleMediaChange}
                style={{ display: 'none' }}
                ref={fileInputRef}
              />
              {mediaPreview ? (
                <div style={{ position: 'relative', width: 120, height: 120, borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--border-primary)' }}>
                  <img src={mediaPreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <button
                    type="button"
                    onClick={() => { setMediaFile(null); setMediaPreview(null) }}
                    style={{ position: 'absolute', top: 4, right: 4, background: 'rgba(0,0,0,0.6)', color: 'white', border: 'none', borderRadius: '50%', width: 22, height: 22, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Upload Image or Video
                </button>
              )}
            </div>

            {/* Publish options */}
            <div style={{ borderTop: '1px solid var(--border-primary)', paddingTop: 20, marginTop: 20 }}>
              <div className="form-group">
                <label className="form-label">Publishing Schedule</label>
                <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
                  {[
                    { value: true, label: 'Publish Now' },
                    { value: false, label: 'Schedule' },
                  ].map(opt => (
                    <button
                      key={String(opt.value)}
                      type="button"
                      onClick={() => updateField('publishNow', opt.value)}
                      style={{
                        flex: 1, padding: '10px', borderRadius: 'var(--radius-lg)',
                        border: `2px solid ${currentPublishNow === opt.value ? 'var(--color-brand-500)' : 'var(--border-primary)'}`,
                        background: currentPublishNow === opt.value ? 'var(--bg-active)' : 'var(--bg-secondary)',
                        color: currentPublishNow === opt.value ? 'var(--color-brand-600)' : 'var(--text-secondary)',
                        fontWeight: 600, fontSize: 'var(--font-size-sm)', cursor: 'pointer',
                        transition: 'all var(--transition-fast)', fontFamily: 'inherit',
                      }}
                    >
                      {opt.value ? 'Publish Now' : 'Schedule'}
                    </button>
                  ))}
                </div>

                {!currentPublishNow && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }} className="animate-slide-up">
                    <div className="form-group">
                      <label className="form-label">Date</label>
                      <input type="date" className="form-input" value={(currentScheduledAt || '').split('T')[0] || ''} min={new Date().toISOString().split('T')[0]}
                        onChange={e => updateField('scheduledAt', `${e.target.value}T${(currentScheduledAt || '').split('T')[1] || '09:00'}`)} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Time</label>
                      <input type="time" className="form-input" value={(currentScheduledAt || '').split('T')[1] || '09:00'}
                        onChange={e => updateField('scheduledAt', `${(currentScheduledAt || '').split('T')[0] || new Date().toISOString().split('T')[0]}T${e.target.value}`)} />
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            <div style={{ marginTop: 24, display: 'flex', gap: 12 }}>
              <Button variant="secondary" fullWidth onClick={() => navigate('/posts')}>
                Save as Draft
              </Button>
              <Button variant="primary" fullWidth loading={loading} onClick={handlePublish}>
                {form.publishNow ? 'Publish All' : 'Schedule All'}
              </Button>
            </div>
            
          </div>
        </div>

        {/* Right: Previews */}
        <div style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ fontSize: 'var(--font-size-md)', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>Live Previews</h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24, overflowY: 'auto', paddingRight: 8, paddingBottom: 64 }}>
            {form.accountIds.length === 0 ? (
              <div className="card" style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)', fontSize: 'var(--font-size-sm)' }}>
                Select accounts to see previews
              </div>
            ) : form.accountIds.map(id => {
              const acc = accounts.find(a => String(a.id) === id);
              if (!acc) return null;
              
              const ov = overrides[id]?.enabled ? overrides[id] : form;
              const fullText = [
                ov.content,
                ov.hashtags && ov.hashtags.split(' ').filter(Boolean).map(h => h.startsWith('#') ? h : `#${h}`).join(' '),
                ov.link
              ].filter(Boolean).join('\n\n');
              
              const isOverridden = overrides[id]?.enabled;

              return (
                <div key={id} className="card" style={{ border: isOverridden ? '2px solid var(--color-success-400)' : '1px solid var(--border-primary)' }}>
                  <div className="card-header" style={{ padding: '12px 16px', background: isOverridden ? 'var(--color-success-50)' : 'transparent', borderBottom: '1px solid var(--border-primary)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: PLATFORM_COLORS[acc.platform], fontWeight: 700, fontSize: 'var(--font-size-sm)' }}>
                        <PlatformIcon platform={acc.platform} size={16} /> {acc.account_name}
                      </div>
                      {isOverridden && (
                        <span style={{ fontSize: '11px', background: 'var(--color-success-500)', color: 'white', padding: '2px 6px', borderRadius: '4px', fontWeight: 700, textTransform: 'uppercase' }}>Custom</span>
                      )}
                    </div>
                    {!ov.publishNow && ov.scheduledAt && (
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                        Scheduled for {new Date(ov.scheduledAt).toLocaleString()}
                      </div>
                    )}
                  </div>
                  <div className="card-body" style={{ display: 'flex', justifyContent: 'center', padding: '16px', background: 'var(--bg-secondary)' }}>
                    <PlatformPreview platform={acc.platform} account={acc} content={fullText} media={mediaPreview} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Choice Modal: Local System vs Media Library */}
      <Modal
        isOpen={mediaSourceModalOpen}
        onClose={() => setMediaSourceModalOpen(false)}
        title="Select Media Source"
        size="md"
      >
        <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', marginBottom: 20 }}>
          Choose where you want to select your poster or media from:
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {/* Local System */}
          <button
            onClick={() => {
              setMediaSourceModalOpen(false)
              fileInputRef.current?.click()
            }}
            style={{
              padding: '24px 16px',
              borderRadius: 'var(--radius-xl)',
              background: 'var(--bg-secondary)',
              border: '1.5px solid var(--border-primary)',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 12,
              textAlign: 'center',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-brand-500)'; e.currentTarget.style.background = 'var(--color-brand-50)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-primary)'; e.currentTarget.style.background = 'var(--bg-secondary)' }}
          >
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--color-brand-100)', color: 'var(--color-brand-600)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 'var(--font-size-md)', color: 'var(--text-primary)' }}>Local System</div>
              <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)', marginTop: 4 }}>Upload image or video from your computer / device</div>
            </div>
          </button>

          {/* Media Library */}
          <button
            onClick={() => {
              setMediaSourceModalOpen(false)
              if (!libraryFetched) fetchMedia()
              setMediaLibraryModalOpen(true)
            }}
            style={{
              padding: '24px 16px',
              borderRadius: 'var(--radius-xl)',
              background: 'var(--bg-secondary)',
              border: '1.5px solid var(--border-primary)',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 12,
              textAlign: 'center',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#10b981'; e.currentTarget.style.background = '#ecfdf5' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-primary)'; e.currentTarget.style.background = 'var(--bg-secondary)' }}
          >
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#d1fae5', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 'var(--font-size-md)', color: 'var(--text-primary)' }}>Media Library</div>
              <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)', marginTop: 4 }}>Choose from posters/media in your SocialHub library</div>
            </div>
          </button>
        </div>
      </Modal>

      {/* Select from Media Library Modal */}
      <Modal
        isOpen={mediaLibraryModalOpen}
        onClose={() => setMediaLibraryModalOpen(false)}
        title="Select Media from Library"
        size="lg"
      >
        {libraryItems.length === 0 ? (
          <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-tertiary)' }}>
            <p>No media files found in your Media Library.</p>
            <p style={{ fontSize: 'var(--font-size-xs)', marginTop: 4 }}>Upload media files in the Media Library page or choose Local System.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 12, maxHeight: 380, overflowY: 'auto', paddingRight: 4 }}>
            {libraryItems.map((item) => (
              <div
                key={item.id}
                onClick={() => {
                  setMediaPreview(item.url)
                  setMedia({ isLibraryUrl: true, url: item.url, type: item.type === 'video' ? 'video/mp4' : 'image/jpeg' })
                  toast.success(`Attached ${item.name}!`)
                  setMediaLibraryModalOpen(false)
                }}
                style={{
                  position: 'relative',
                  aspectRatio: '1',
                  borderRadius: 'var(--radius-lg)',
                  overflow: 'hidden',
                  border: '2px solid var(--border-primary)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  background: 'var(--bg-secondary)',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-brand-500)'; e.currentTarget.style.transform = 'scale(1.03)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-primary)'; e.currentTarget.style.transform = 'scale(1)' }}
              >
                {item.type === 'video' ? (
                  <div style={{ width: '100%', height: '100%', background: '#1e1e2d', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                  </div>
                ) : (
                  <img src={item.url} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                )}
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '4px 6px', background: 'rgba(0,0,0,0.6)', color: 'white', fontSize: 10, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {item.name}
                </div>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </DashboardLayout>
  )
}
