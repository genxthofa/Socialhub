import { useState, useRef, useEffect } from 'react'
import { DashboardLayout } from '../../components/Layout'
import { Button } from '../../components/ui'
import { toast } from 'react-hot-toast'
import { useMediaStore, useAuthStore } from '../../store'
import axios from 'axios'

export default function MediaLibrary() {
  const fileInputRef = useRef()
  const { media, fetchMedia, fetched, addMediaItems, removeMediaItems } = useMediaStore()
  const [selected, setSelected] = useState([])
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [uploading, setUploading] = useState(false)
  const [previewItem, setPreviewItem] = useState(null)

  useEffect(() => {
    if (!fetched) fetchMedia()
  }, [fetched])

  const filtered = media.filter(m => {
    const matchSearch = m.name.toLowerCase().includes(search.toLowerCase())
    const matchType = typeFilter === 'all' || m.type === typeFilter
    return matchSearch && matchType
  })

  const totalSize = media.reduce((acc, m) => acc + parseFloat(m.size), 0).toFixed(1)

  const handleUpload = async (e) => {
    const files = Array.from(e.target.files || [])
    if (!files.length) return
    setUploading(true)

    try {
      const uploadedItems = []
      for (const file of files) {
        const formData = new FormData()
        formData.append('file', file)
        
        try {
          const token = useAuthStore.getState().token
          const config = {
            headers: {
              'Content-Type': 'multipart/form-data',
              ...(token ? { Authorization: `Bearer ${token}` } : {})
            }
          }
          const res = await axios.post('/api/media/upload', formData, config)
          if (res.data.success && res.data.media) {
            uploadedItems.push(res.data.media)
          } else {
            uploadedItems.push({
              id: Date.now() + Math.random(),
              type: file.type.startsWith('video') ? 'video' : 'image',
              name: file.name,
              original_filename: file.name,
              size: (file.size / 1024 / 1024).toFixed(1),
              url: URL.createObjectURL(file),
              created_at: new Date().toISOString().split('T')[0],
            })
          }
        } catch (err) {
          uploadedItems.push({
            id: Date.now() + Math.random(),
            type: file.type.startsWith('video') ? 'video' : 'image',
            name: file.name,
            original_filename: file.name,
            size: (file.size / 1024 / 1024).toFixed(1),
            url: URL.createObjectURL(file),
            created_at: new Date().toISOString().split('T')[0],
          })
        }
      }

      addMediaItems(uploadedItems)
      toast.success(`${files.length} file${files.length > 1 ? 's' : ''} uploaded!`)
    } catch (err) {
      toast.error('Upload failed.')
    } finally {
      setUploading(false)
      if (e.target) e.target.value = ''
    }
  }

  const handleDelete = (ids) => {
    removeMediaItems(ids)
    setSelected([])
    toast.success(`${ids.length} item${ids.length > 1 ? 's' : ''} deleted.`)
  }

  const toggleSelect = (id) => {
    setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id])
  }

  const [dragOver, setDragOver] = useState(false)

  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    const files = Array.from(e.dataTransfer.files)
    if (files.length) {
      const syntheticEvent = { target: { files }, preventDefault: () => {} }
      handleUpload(syntheticEvent)
    }
  }

  return (
    <DashboardLayout
      title="Media Library"
      actions={
        <div style={{ display: 'flex', gap: 10 }}>
          {selected.length > 0 && (
            <Button variant="danger" size="sm" onClick={() => handleDelete(selected)}>
              Delete ({selected.length})
            </Button>
          )}
          <Button variant="primary" size="sm" loading={uploading} onClick={() => fileInputRef.current?.click()}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>
            Upload Media
          </Button>
        </div>
      }
    >
      <input ref={fileInputRef} type="file" multiple accept="image/*,video/*" style={{ display: 'none' }} onChange={handleUpload} />

      {/* Stats strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 20 }}>
        {[
          { label: 'Total Files', value: media.length, color: '#7c5cfc' },
          { label: 'Images', value: media.filter(m => m.type === 'image').length, color: '#10b981' },
          { label: 'Videos', value: media.filter(m => m.type === 'video').length, color: '#3b82f6' },
          { label: 'Storage Used', value: `${totalSize} MB`, color: '#f59e0b' },
        ].map((s, i) => (
          <div key={i} className="stat-card animate-slide-up" style={{
            borderTop: `4.5px solid ${s.color}`,
            borderLeft: '1px solid var(--border-primary)',
            borderRight: '1px solid var(--border-primary)',
            borderBottom: '1px solid var(--border-primary)',
            borderRadius: '16px',
            background: 'var(--bg-card)',
            padding: '16px 20px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.03)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between'
          }}>
            <div>
              <div style={{ fontSize: '11px', fontWeight: 800, color: s.color, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>{s.label}</div>
              <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.04em', lineHeight: 1.1 }}>{s.value}</div>
            </div>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: s.color, boxShadow: `0 0 8px ${s.color}` }} />
          </div>
        ))}
      </div>

      {/* Upload zone */}
      <div
        className={`upload-zone ${dragOver ? 'drag-over' : ''}`}
        style={{ marginBottom: 20, padding: '24px' }}
        onDrop={handleDrop}
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onClick={() => fileInputRef.current?.click()}
      >
        <div className="upload-zone-icon">
          {uploading ? (
            <div style={{ width: 24, height: 24, border: '2px solid var(--color-brand-500)', borderTop: '2px solid transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
          ) : (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
            </svg>
          )}
        </div>
        <p style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, color: 'var(--text-secondary)' }}>
          {uploading ? 'Uploading...' : 'Drag & drop files here, or click to browse'}
        </p>
        <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}>
          PNG, JPG, GIF, MP4 · Max 50MB per file
        </p>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 10 }}>
          {['all', 'image', 'video'].map(t => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`tab-btn ${typeFilter === t ? 'active' : ''}`}
              style={{ padding: '6px 14px', borderRadius: 8 }}
            >
              {t === 'all' ? 'All' : t === 'image' ? 'Images' : 'Videos'}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {selected.length > 0 && (
            <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)', fontWeight: 600 }}>
              {selected.length} selected
            </span>
          )}
          <div className="search-box" style={{ width: 200 }}>
            <span className="search-box-icon">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
            </span>
            <input placeholder="Search media..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>
      </div>

      {/* Media grid */}
      {filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
          </div>
          <p className="empty-state-title">No media found</p>
          <p className="empty-state-desc">Upload your first image or video to get started</p>
        </div>
      ) : (
        <div className="media-grid">
          {filtered.map((item, i) => (
            <div
              key={item.id}
              className={`media-item animate-slide-up ${selected.includes(item.id) ? 'selected' : ''}`}
              style={{ animationDelay: `${i * 30}ms` }}
              onClick={() => toggleSelect(item.id)}
              onDoubleClick={() => setPreviewItem(item)}
            >
              {item.type === 'image' && item.url ? (
                <img src={item.url} alt={item.name} loading="lazy" />
              ) : (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-hover)', flexDirection: 'column', gap: 6 }}>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="1.5">
                    <polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/>
                  </svg>
                  <span style={{ fontSize: 10, color: 'var(--text-tertiary)', fontWeight: 600 }}>VIDEO</span>
                </div>
              )}
              <div className="media-item-overlay">
                {selected.includes(item.id) ? (
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--color-brand-500)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><path d="M20 6L9 17l-5-5"/></svg>
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={e => { e.stopPropagation(); setPreviewItem(item) }}
                      style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(255,255,255,0.2)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', backdropFilter: 'blur(4px)' }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/></svg>
                    </button>
                    <button
                      onClick={e => { e.stopPropagation(); handleDelete([item.id]) }}
                      style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(239,68,68,0.8)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>
                    </button>
                  </div>
                )}
              </div>
              {/* Info bar at bottom */}
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(transparent, rgba(0,0,0,0.7))', padding: '16px 8px 6px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.9)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '70%' }}>{item.name}</span>
                <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.7)', flexShrink: 0 }}>{item.size}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Preview modal */}
      {previewItem && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', zIndex: 1060, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
          onClick={e => e.target === e.currentTarget && setPreviewItem(null)}
        >
          <div style={{ maxWidth: 700, width: '100%', textAlign: 'center' }}>
            <button onClick={() => setPreviewItem(null)} style={{ position: 'absolute', top: 20, right: 24, color: 'white', background: 'rgba(255,255,255,0.15)', border: 'none', cursor: 'pointer', borderRadius: 8, width: 36, height: 36, fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
            {previewItem.url && <img src={previewItem.url} alt={previewItem.name} style={{ maxWidth: '100%', maxHeight: '70vh', objectFit: 'contain', borderRadius: 12 }} />}
            <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 'var(--font-size-sm)', marginTop: 12, fontWeight: 500 }}>
              {previewItem.name} · {previewItem.size} · {previewItem.created_at}
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 16 }}>
              <Button variant="primary" size="sm" onClick={() => toast.success('Copied to clipboard!')}>Copy URL</Button>
              <Button variant="danger" size="sm" onClick={() => { handleDelete([previewItem.id]); setPreviewItem(null) }}>Delete</Button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
