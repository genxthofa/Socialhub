import { clsx } from 'clsx'

// ─── Button ───────────────────────────────────────────────────────────────────
export function Button({
  children, variant = 'primary', size = 'md',
  icon: Icon, iconRight: IconRight,
  fullWidth, loading, disabled, className, onClick, type = 'button', ...props
}) {
  return (
    <button
      type={type}
      className={clsx(
        'btn',
        `btn-${variant}`,
        `btn-${size}`,
        fullWidth && 'btn-full',
        className
      )}
      disabled={disabled || loading}
      onClick={onClick}
      {...props}
    >
      {loading && <span className="btn-spinner" />}
      {!loading && Icon && <Icon size={size === 'xs' ? 12 : size === 'sm' ? 14 : 16} />}
      {children}
      {!loading && IconRight && <IconRight size={size === 'xs' ? 12 : size === 'sm' ? 14 : 16} />}
    </button>
  )
}

// ─── IconButton ───────────────────────────────────────────────────────────────
export function IconButton({ icon: Icon, variant = 'ghost', size = 'md', className, title, ...props }) {
  return (
    <button
      className={clsx('btn', 'btn-icon', `btn-${variant}`, `btn-${size}`, className)}
      title={title}
      {...props}
    >
      <Icon size={size === 'sm' ? 14 : 16} />
    </button>
  )
}

// ─── Badge ────────────────────────────────────────────────────────────────────
export function Badge({ children, variant = 'neutral', className }) {
  return <span className={clsx('badge', `badge-${variant}`, className)}>{children}</span>
}

// ─── Avatar ───────────────────────────────────────────────────────────────────
export function Avatar({ src, name, size = 'md', className }) {
  const sizeClass = `avatar-${size}`
  if (src) {
    return <img src={src} alt={name || 'Avatar'} className={clsx('avatar', sizeClass, className)} />
  }
  const cleanName = (name && name.trim()) ? name : 'User'
  const initials = cleanName
    .split(' ')
    .filter(Boolean)
    .map(n => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'U'

  const px = { xs: 24, sm: 32, md: 40, lg: 48, xl: 56, '2xl': 80 }[size] || 40
  return (
    <div
      className={clsx('avatar-fallback', sizeClass, className)}
      style={{ width: px, height: px }}
    >
      {initials}
    </div>
  )
}

// ─── Platform Icon ────────────────────────────────────────────────────────────
export function PlatformIcon({ platform, size = 20 }) {
  const icons = {
    facebook: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="#1877f2">
        <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047v-2.66c0-3.025 1.791-4.697 4.533-4.697 1.312 0 2.686.236 2.686.236v2.97h-1.513c-1.491 0-1.956.93-1.956 1.886v2.265h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z"/>
      </svg>
    ),
    instagram: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="url(#ig-grad)">
        <defs>
          <linearGradient id="ig-grad" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#fd5949"/>
            <stop offset="50%" stopColor="#d6249f"/>
            <stop offset="100%" stopColor="#285AEB"/>
          </linearGradient>
        </defs>
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
      </svg>
    ),
    linkedin: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="#0077b5">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
      </svg>
    ),
    google: (
      <svg width={size} height={size} viewBox="0 0 24 24">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
      </svg>
    ),
    gmb: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <rect width="24" height="24" rx="4" fill="#4285F4" />
        <path d="M4.5 7h15l1 3.5c0 1.2-.8 2-1.8 2-.9 0-1.4-.8-1.4-.8s-.5.8-1.4.8c-.9 0-1.4-.8-1.4-.8s-.5.8-1.4.8c-.9 0-1.4-.8-1.4-.8s-.5.8-1.4.8c-.9 0-1.4-.8-1.4-.8s-.5.8-1.4.8c-1 0-1.8-.8-1.8-2L4.5 7z" fill="white" />
        <path d="M5.5 11.5v6c0 .8.7 1.5 1.5 1.5h10c.8 0 1.5-.7 1.5-1.5v-6H5.5z" fill="white" />
        <path d="M14.2 14.8c0 1.2-1 2.2-2.2 2.2-1.2 0-2.2-1-2.2-2.2s1-2.2 2.2-2.2c.6 0 1.1.2 1.5.6l-1 1c-.1-.1-.3-.2-.5-.2-.7 0-1.2.5-1.2 1.2 0 .7.5 1.2 1.2 1.2.6 0 .9-.3 1-.6h-1v-.8h2.2c0 .1.1.2.1.4z" fill="#4285F4" />
      </svg>
    ),
  }
  return icons[platform] || (platform === 'google_ads' ? icons.google : null)
}

// ─── StatusBadge ──────────────────────────────────────────────────────────────
export function StatusBadge({ status }) {
  const icons = {
    published:  '✓',
    scheduled:  '•',
    draft:      '•',
    failed:     '✕',
    publishing: '↑',
    cancelled:  '−',
    active:     '•',
    paused:     '∥',
    completed:  '✓',
    pending:    '•',
  }
  const safeStatus = status || 'active'
  return (
    <span className={`post-status ${safeStatus}`}>
      {icons[safeStatus] || '•'} {safeStatus.charAt(0).toUpperCase() + safeStatus.slice(1)}
    </span>
  )
}

// ─── Toggle ───────────────────────────────────────────────────────────────────
export function Toggle({ on, onChange, label }) {
  return (
    <label className="toggle-wrapper">
      <div className={clsx('toggle', on && 'on')} onClick={onChange} />
      {label && <span className="form-check-label">{label}</span>}
    </label>
  )
}

// ─── Spinner ──────────────────────────────────────────────────────────────────
export function Spinner({ size = 20, color = 'var(--color-brand-500)' }) {
  return (
    <div
      style={{
        width: size, height: size,
        border: `2px solid ${color}22`,
        borderTop: `2px solid ${color}`,
        borderRadius: '50%',
        animation: 'spin 0.7s linear infinite',
      }}
    />
  )
}

// ─── LoadingPage ──────────────────────────────────────────────────────────────
export function LoadingPage() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', flexDirection: 'column', gap: 16 }}>
      <Spinner size={36} />
      <p style={{ color: 'var(--text-tertiary)', fontSize: 14 }}>Loading...</p>
    </div>
  )
}

// ─── EmptyState ───────────────────────────────────────────────────────────────
export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon">
        {Icon && <Icon size={28} />}
      </div>
      <p className="empty-state-title">{title}</p>
      {description && <p className="empty-state-desc">{description}</p>}
      {action}
    </div>
  )
}

// ─── Modal ────────────────────────────────────────────────────────────────────
export function Modal({ isOpen, onClose, title, children, size = 'md', footer }) {
  if (!isOpen) return null
  const maxWidths = { sm: 440, md: 560, lg: 720, xl: 900 }
  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal animate-bounce-in" style={{ maxWidth: maxWidths[size] }}>
        <div className="modal-header">
          <h2 className="modal-title">{title}</h2>
          <IconButton icon={XIcon} variant="ghost" size="sm" onClick={onClose} />
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  )
}

function XIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"/>
      <line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  )
}

// ─── Dropdown ─────────────────────────────────────────────────────────────────
export function Dropdown({ trigger, children, isOpen, onClose }) {
  return (
    <div className="dropdown">
      {trigger}
      {isOpen && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 'calc(var(--z-dropdown) - 1)' }} onClick={onClose} />
          <div className="dropdown-menu" style={{ zIndex: 'var(--z-dropdown)' }}>
            {children}
          </div>
        </>
      )}
    </div>
  )
}

// ─── ProgressBar ──────────────────────────────────────────────────────────────
export function ProgressBar({ value, max = 100, variant = 'brand' }) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100))
  return (
    <div className="progress-bar">
      <div className="progress-fill" style={{ width: `${pct}%`, background: variant === 'brand' ? 'var(--color-brand-500)' : undefined }} />
    </div>
  )
}

// ─── StepWizard ──────────────────────────────────────────────────────────────
export function StepWizard({ steps, currentStep }) {
  return (
    <div className="steps">
      {steps.map((step, i) => (
        <div key={i} className="step-item" style={{ flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
            <div className={clsx('step-circle', i < currentStep && 'completed', i === currentStep && 'active')}>
              {i < currentStep ? '✓' : i + 1}
            </div>
            {i < steps.length - 1 && <div className={clsx('step-line', i < currentStep && 'completed')} />}
          </div>
          <span className={clsx('step-label', i === currentStep && 'active', i < currentStep && 'completed')}>
            {step}
          </span>
        </div>
      ))}
    </div>
  )
}

// ─── Card ─────────────────────────────────────────────────────────────────────
export function Card({ children, className, style }) {
  return <div className={clsx('card', className)} style={style}>{children}</div>
}

// ─── Tabs ─────────────────────────────────────────────────────────────────────
export function Tabs({ tabs, activeTab, onTabChange }) {
  return (
    <div className="tabs">
      {tabs.map(tab => (
        <button
          key={tab.value}
          className={clsx('tab-btn', activeTab === tab.value && 'active')}
          onClick={() => onTabChange(tab.value)}
        >
          {tab.label}
          {tab.count !== undefined && (
            <Badge variant="neutral" style={{ marginLeft: 6 }}>{tab.count}</Badge>
          )}
        </button>
      ))}
    </div>
  )
}
