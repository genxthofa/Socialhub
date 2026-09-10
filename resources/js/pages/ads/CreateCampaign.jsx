import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import axios from 'axios'
import { useSocialAccountsStore, useMediaStore } from '../../store'
import { DashboardLayout } from '../../components/Layout'
import { Button, PlatformIcon, StepWizard, Modal } from '../../components/ui'

const STEPS = ['Platform', 'Campaign', 'Audience', 'Budget', 'Creative', 'Review']

const OBJECTIVES = [
  { key: 'awareness', label: 'Brand Awareness', desc: 'Reach people more likely to remember your ad', icon: '📢' },
  { key: 'traffic', label: 'Traffic', desc: 'Send people to a destination on or off Facebook', icon: '🔗' },
  { key: 'engagement', label: 'Engagement', desc: 'Get more post reactions, comments, and shares', icon: '👍' },
  { key: 'leads', label: 'Lead Generation', desc: 'Collect leads for your business directly from ads', icon: '📋' },
  { key: 'app_installs', label: 'App Installs', desc: 'Send people to the store to purchase your app', icon: '📱' },
  { key: 'conversions', label: 'Conversions', desc: 'Get people to take valuable actions on your site', icon: '🎯' },
]

const INTERESTS = ['Technology', 'Business', 'Marketing', 'Fashion', 'Travel', 'Food', 'Fitness', 'Gaming', 'Finance', 'Education', 'Parenting', 'Sports', 'Photography', 'Art', 'Music']
const COUNTRIES = ['United States', 'United Kingdom', 'Canada', 'Australia', 'India', 'Germany', 'France', 'Brazil', 'Singapore', 'UAE']

const CURRENCY_SYMBOLS = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  INR: '₹',
  CAD: 'CA$',
}

const StepPanel = ({ title, subtitle, children }) => (
  <div className="card animate-slide-up" style={{ maxWidth: 680, margin: '0 auto' }}>
    <div className="card-header" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 4 }}>
      <h2 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>{title}</h2>
      <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>{subtitle}</p>
    </div>
    <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {children}
    </div>
  </div>
)

export default function CreateCampaign() {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [submitting, setSubmitting] = useState(false)

  const [campaign, setCampaign] = useState({
    platforms: [],
    name: '',
    objective: '',
    // Audience
    locations: [],
    ageMin: 18,
    ageMax: 65,
    gender: 'all',
    interests: [],
    // Budget
    budgetType: 'daily',
    budget: '',
    currency: 'USD',
    startDate: '',
    endDate: '',
    // Creative
    primaryText: '',
    headline: '',
    description: '',
    cta: 'Learn More',
    destinationUrl: '',
    adMedia: null,
  })

  const fileInputRef = useRef()
  const [adMediaPreview, setAdMediaPreview] = useState(null)
  const [mediaSourceModalOpen, setMediaSourceModalOpen] = useState(false)
  const [mediaLibraryModalOpen, setMediaLibraryModalOpen] = useState(false)
  const { media: libraryItems, fetchMedia, fetched: libraryFetched } = useMediaStore()

  const update = (key, val) => setCampaign(c => ({ ...c, [key]: val }))
  const togglePlatform = (p) => setCampaign(c => ({ ...c, platforms: c.platforms.includes(p) ? c.platforms.filter(x => x !== p) : [...c.platforms, p] }))
  const addInterest = (i) => setCampaign(c => ({ ...c, interests: c.interests.includes(i) ? c.interests.filter(x => x !== i) : [...c.interests, i] }))
  const addLocation = (l) => setCampaign(c => ({ ...c, locations: c.locations.includes(l) ? c.locations.filter(x => x !== l) : [...c.locations, l] }))

  const canProceed = () => {
    if (step === 0) return campaign.platforms.length > 0
    if (step === 1) return !!campaign.name && !!campaign.objective
    if (step === 2) return campaign.locations.length > 0
    if (step === 3) return !!campaign.budget && !!campaign.startDate
    if (step === 4) return !!campaign.primaryText && !!campaign.headline && !!campaign.destinationUrl
    return true
  }

  const { accounts, fetchAccounts, fetched: accountsFetched } = useSocialAccountsStore()
  
  useEffect(() => {
    if (!accountsFetched) fetchAccounts()
  }, [accountsFetched, fetchAccounts])

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      const payload = {
        name: campaign.name,
        platforms: campaign.platforms,
        objective: campaign.objective,
        budget: campaign.budget,
        budget_type: campaign.budgetType,
        start_date: campaign.startDate,
        end_date: campaign.endDate || null,
        locations: campaign.locations,
        age_min: campaign.ageMin,
        age_max: campaign.ageMax,
        gender: campaign.gender,
        interests: campaign.interests,
        primary_text: campaign.primaryText,
        headline: campaign.headline,
        description: campaign.description,
        cta: campaign.cta,
        destination_url: campaign.destinationUrl,
        ad_media_path: adMediaPreview || null,
      }

      await axios.post('/api/campaigns', payload, { headers: { 'Content-Type': 'application/json' } })
      toast.success('Campaign created successfully!')
      navigate('/campaigns')
    } catch (err) {
      console.error(err)
      toast.error(err.response?.data?.message || 'Failed to create campaign')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <DashboardLayout title="Create Campaign">
      {/* Step wizard */}
      <div style={{ maxWidth: 680, margin: '0 auto 32px' }}>
        <StepWizard steps={STEPS} currentStep={step} />
      </div>

      {/* Step 0: Platform */}
      {step === 0 && (
        <StepPanel title="Select Platforms" subtitle="Choose the advertising platforms for your campaign">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
            {['facebook', 'instagram', 'linkedin', 'google_ads'].map(p => {
              const names = { facebook: 'Facebook Ads', instagram: 'Instagram Ads', linkedin: 'LinkedIn Ads', google_ads: 'Google Ads' }
              const descs = { facebook: 'Reach 3B+ users with targeted ads', instagram: 'Visual ads for engaged audiences', linkedin: 'B2B ads for professionals', google_ads: 'Reach customers searching on Google' }
              const colors = { facebook: 'var(--color-brand-500)', instagram: '#ec4899', linkedin: '#0a66c2', google_ads: '#4285F4' }
              const connectedAccount = accounts.find(a => a.platform === p && a.status === 'active')
              
              return (
                <button
                  key={p}
                  onClick={() => togglePlatform(p)}
                  style={{
                    padding: 24, borderRadius: 'var(--radius-xl)', border: `2px solid ${campaign.platforms.includes(p) ? colors[p] : 'var(--border-primary)'}`,
                    background: 'var(--bg-card)', cursor: 'pointer', textAlign: 'center', transition: 'all var(--transition-fast)',
                    boxShadow: campaign.platforms.includes(p) ? `0 0 0 4px ${colors[p]}15` : 'var(--shadow-sm)',
                    fontFamily: 'inherit', display: 'flex', flexDirection: 'column', alignItems: 'center'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
                    <PlatformIcon platform={p} size={36} />
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 'var(--font-size-md)', color: 'var(--text-primary)', marginBottom: 6 }}>{names[p]}</div>
                  <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)', lineHeight: 1.5, marginBottom: 10 }}>{descs[p]}</div>
                  
                  {connectedAccount ? (
                    <div style={{ fontSize: '11px', background: 'var(--color-success-50)', color: 'var(--color-success-600)', padding: '4px 10px', borderRadius: 'var(--radius-full)', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      ✓ {connectedAccount.account_name}
                    </div>
                  ) : (
                    <div style={{ fontSize: '11px', background: 'var(--bg-secondary)', color: 'var(--text-tertiary)', padding: '4px 10px', borderRadius: 'var(--radius-full)', fontWeight: 600 }}>
                      Auto-linked Meta Account
                    </div>
                  )}

                  {campaign.platforms.includes(p) && (
                    <div style={{ marginTop: 12, width: 24, height: 24, borderRadius: '50%', background: colors[p], display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '12px auto 0', color: 'white', fontSize: 12 }}>✓</div>
                  )}
                </button>
              )
            })}
          </div>
        </StepPanel>
      )}

      {/* Step 1: Campaign Details */}
      {step === 1 && (
        <StepPanel title="Campaign Details" subtitle="Set your campaign name and objective">
          <div className="form-group">
            <label className="form-label">Campaign Name <span className="form-label-required">*</span></label>
            <input className="form-input" placeholder="e.g. Spring Product Launch 2024" value={campaign.name} onChange={e => update('name', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Campaign Objective <span className="form-label-required">*</span></label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginTop: 4 }}>
              {OBJECTIVES.map(obj => (
                <button
                  key={obj.key}
                  onClick={() => update('objective', obj.key)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
                    border: `2px solid ${campaign.objective === obj.key ? 'var(--color-brand-500)' : 'var(--border-primary)'}`,
                    borderRadius: 'var(--radius-lg)', background: campaign.objective === obj.key ? 'var(--bg-active)' : 'var(--bg-secondary)',
                    cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit', transition: 'all var(--transition-fast)',
                  }}
                >
                  <span style={{ fontSize: 22, flexShrink: 0 }}>{obj.icon}</span>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)', color: campaign.objective === obj.key ? 'var(--color-brand-600)' : 'var(--text-primary)' }}>{obj.label}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>{obj.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </StepPanel>
      )}

      {/* Step 2: Audience */}
      {step === 2 && (
        <StepPanel title="Define Your Audience" subtitle="Target the right people with your ads">
          <div className="form-group">
            <label className="form-label">Locations <span className="form-label-required">*</span></label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
              {COUNTRIES.map(country => (
                <button
                  key={country}
                  onClick={() => addLocation(country)}
                  style={{
                    padding: '6px 14px', borderRadius: 'var(--radius-full)', fontSize: 'var(--font-size-xs)',
                    fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', transition: 'all var(--transition-fast)',
                    border: `1.5px solid ${campaign.locations.includes(country) ? 'var(--color-brand-500)' : 'var(--border-primary)'}`,
                    background: campaign.locations.includes(country) ? 'var(--bg-active)' : 'var(--bg-secondary)',
                    color: campaign.locations.includes(country) ? 'var(--color-brand-600)' : 'var(--text-secondary)',
                  }}
                >
                  {campaign.locations.includes(country) ? '✓ ' : ''}{country}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div className="form-group">
              <label className="form-label">Age Range</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <input type="number" className="form-input" value={campaign.ageMin} min={13} max={campaign.ageMax - 1} onChange={e => update('ageMin', e.target.value)} style={{ width: 80 }} />
                <span style={{ color: 'var(--text-tertiary)' }}>–</span>
                <input type="number" className="form-input" value={campaign.ageMax} min={campaign.ageMin + 1} max={65} onChange={e => update('ageMax', e.target.value)} style={{ width: 80 }} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Gender</label>
              <select className="form-select" value={campaign.gender} onChange={e => update('gender', e.target.value)}>
                <option value="all">All Genders</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Interests</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
              {INTERESTS.map(interest => (
                <button
                  key={interest}
                  onClick={() => addInterest(interest)}
                  style={{
                    padding: '6px 14px', borderRadius: 'var(--radius-full)', fontSize: 'var(--font-size-xs)',
                    fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', transition: 'all var(--transition-fast)',
                    border: `1.5px solid ${campaign.interests.includes(interest) ? 'var(--color-brand-500)' : 'var(--border-primary)'}`,
                    background: campaign.interests.includes(interest) ? 'var(--bg-active)' : 'var(--bg-secondary)',
                    color: campaign.interests.includes(interest) ? 'var(--color-brand-600)' : 'var(--text-secondary)',
                  }}
                >
                  {campaign.interests.includes(interest) ? '✓ ' : ''}{interest}
                </button>
              ))}
            </div>
            {campaign.interests.length > 0 && <p className="form-hint">{campaign.interests.length} interests selected</p>}
          </div>
        </StepPanel>
      )}

      {/* Step 3: Budget */}
      {step === 3 && (
        <StepPanel title="Set Budget & Schedule" subtitle="Control how much you spend and when">
          <div style={{ display: 'flex', gap: 12 }}>
            {[{ value: 'daily', label: 'Daily Budget', desc: 'Average amount per day' }, { value: 'lifetime', label: 'Lifetime Budget', desc: 'Total amount for campaign' }].map(opt => (
              <button
                key={opt.value}
                onClick={() => update('budgetType', opt.value)}
                style={{
                  flex: 1, padding: '16px', borderRadius: 'var(--radius-lg)', border: `2px solid ${campaign.budgetType === opt.value ? 'var(--color-brand-500)' : 'var(--border-primary)'}`,
                  background: campaign.budgetType === opt.value ? 'var(--bg-active)' : 'var(--bg-secondary)',
                  cursor: 'pointer', textAlign: 'center', fontFamily: 'inherit', transition: 'all var(--transition-fast)',
                }}
              >
                <div style={{ fontWeight: 700, fontSize: 'var(--font-size-sm)', color: campaign.budgetType === opt.value ? 'var(--color-brand-600)' : 'var(--text-primary)' }}>{opt.label}</div>
                <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>{opt.desc}</div>
              </button>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div className="form-group">
              <label className="form-label">{campaign.budgetType === 'daily' ? 'Daily' : 'Lifetime'} Budget <span className="form-label-required">*</span></label>
              <div className="input-wrapper">
                <span className="input-icon-left" style={{ fontWeight: 700, color: 'var(--text-secondary)' }}>{CURRENCY_SYMBOLS[campaign.currency] || '$'}</span>
                <input type="number" className="form-input has-icon-left" placeholder="50.00" value={campaign.budget} onChange={e => update('budget', e.target.value)} min="1" step="0.01" />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Currency</label>
              <select className="form-select" value={campaign.currency} onChange={e => update('currency', e.target.value)}>
                <option value="USD">USD — US Dollar</option>
                <option value="EUR">EUR — Euro</option>
                <option value="GBP">GBP — British Pound</option>
                <option value="INR">INR — Indian Rupee</option>
                <option value="CAD">CAD — Canadian Dollar</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Start Date <span className="form-label-required">*</span></label>
              <input type="date" className="form-input" value={campaign.startDate} onChange={e => update('startDate', e.target.value)} min={new Date().toISOString().split('T')[0]} />
            </div>
            <div className="form-group">
              <label className="form-label">End Date</label>
              <input type="date" className="form-input" value={campaign.endDate} onChange={e => update('endDate', e.target.value)} min={campaign.startDate} />
              <span className="form-hint">Leave blank for no end date</span>
            </div>
          </div>
        </StepPanel>
      )}

      {/* Step 4: Creative */}
      {step === 4 && (
        <StepPanel title="Ad Creative" subtitle="Design the ad that will be shown to your audience">
          <div className="form-group">
            <label className="form-label">Primary Text <span className="form-label-required">*</span></label>
            <textarea className="form-textarea" placeholder="Tell people what your ad is about..." value={campaign.primaryText} onChange={e => update('primaryText', e.target.value)} rows={4} />
            <span className="form-hint">{campaign.primaryText.length} / 125 characters (recommended)</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div className="form-group">
              <label className="form-label">Headline <span className="form-label-required">*</span></label>
              <input className="form-input" placeholder="e.g. Shop Our New Collection" value={campaign.headline} onChange={e => update('headline', e.target.value)} maxLength={40} />
              <span className="form-hint">{campaign.headline.length} / 40 characters</span>
            </div>
            <div className="form-group">
              <label className="form-label">Description</label>
              <input className="form-input" placeholder="Additional details about your offer" value={campaign.description} onChange={e => update('description', e.target.value)} maxLength={125} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div className="form-group">
              <label className="form-label">Call to Action</label>
              <select className="form-select" value={campaign.cta} onChange={e => update('cta', e.target.value)}>
                {['Learn More', 'Shop Now', 'Sign Up', 'Download', 'Get Quote', 'Book Now', 'Contact Us', 'Apply Now'].map(cta => (
                  <option key={cta} value={cta}>{cta}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Destination URL <span className="form-label-required">*</span></label>
              <input type="url" className="form-input" placeholder="https://yourwebsite.com" value={campaign.destinationUrl} onChange={e => update('destinationUrl', e.target.value)} />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Ad Image / Video</label>
            {adMediaPreview ? (
              <div style={{ position: 'relative', width: '100%', maxHeight: 220, borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
                <img src={adMediaPreview} alt="Ad Media" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <button
                  onClick={() => setAdMediaPreview(null)}
                  style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.6)', color: 'white', border: 'none', borderRadius: '50%', width: 26, height: 26, cursor: 'pointer' }}
                >×</button>
              </div>
            ) : (
              <div className="upload-zone" onClick={() => setMediaSourceModalOpen(true)} style={{ padding: '28px' }}>
                <div className="upload-zone-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>
                </div>
                <p style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, color: 'var(--text-secondary)' }}>Click to upload ad creative</p>
                <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}>Local System or Media Library</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    const file = e.target.files[0]
                    if (file) {
                      setAdMediaPreview(URL.createObjectURL(file))
                    }
                  }}
                />
              </div>
            )}
          </div>
        </StepPanel>
      )}

      {/* Step 5: Review */}
      {step === 5 && (
        <StepPanel title="Review & Submit" subtitle="Confirm all details before submitting">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {[
              { label: 'Platforms', value: campaign.platforms.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(', ') || 'None' },
              { label: 'Campaign Name', value: campaign.name },
              { label: 'Objective', value: campaign.objective },
              { label: 'Locations', value: campaign.locations.join(', ') || 'Not set' },
              { label: 'Audience', value: `${campaign.ageMin}–${campaign.ageMax} yrs, ${campaign.gender}` },
              { label: 'Interests', value: campaign.interests.join(', ') || 'None' },
              { label: 'Budget', value: `${campaign.currency} ${CURRENCY_SYMBOLS[campaign.currency] || '$'}${campaign.budget} / ${campaign.budgetType}` },
              { label: 'Schedule', value: `${campaign.startDate}${campaign.endDate ? ` – ${campaign.endDate}` : ' (no end date)'}` },
              { label: 'Headline', value: campaign.headline },
              { label: 'CTA', value: campaign.cta },
              { label: 'Destination', value: campaign.destinationUrl },
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border-secondary)' }}>
                <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, color: 'var(--text-tertiary)', minWidth: 140 }}>{item.label}</span>
                <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-primary)', fontWeight: 500, textAlign: 'right', maxWidth: '55%' }}>{item.value}</span>
              </div>
            ))}
          </div>

          <div style={{ background: 'var(--color-info-50)', borderRadius: 'var(--radius-lg)', padding: '14px 16px', fontSize: 'var(--font-size-xs)', color: 'var(--color-info-600)', lineHeight: 1.6 }}>
            ℹ️ After submission, your campaign will be reviewed by the platform (typically 24h). You&apos;ll be notified when it&apos;s approved.
          </div>
        </StepPanel>
      )}

      {/* Navigation buttons */}
      <div style={{ maxWidth: 680, margin: '24px auto 0', display: 'flex', justifyContent: 'space-between' }}>
        <Button variant="secondary" onClick={() => step === 0 ? navigate('/campaigns') : setStep(s => s - 1)}>
          {step === 0 ? 'Cancel' : '← Back'}
        </Button>
        {step < STEPS.length - 1 ? (
          <Button variant="primary" disabled={!canProceed()} onClick={() => setStep(s => s + 1)}>
            Continue →
          </Button>
        ) : (
          <Button variant="success" loading={submitting} onClick={handleSubmit}>
            Submit Campaign 🚀
          </Button>
        )}
      </div>

      {/* Choice Modal: Local System vs Media Library */}
      <Modal
        isOpen={mediaSourceModalOpen}
        onClose={() => setMediaSourceModalOpen(false)}
        title="Select Media Source"
        size="md"
      >
        <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', marginBottom: 20 }}>
          Choose where you want to select your ad creative from:
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <button
            onClick={() => {
              setMediaSourceModalOpen(false)
              fileInputRef.current?.click()
            }}
            style={{
              padding: '24px 16px', borderRadius: 'var(--radius-xl)', background: 'var(--bg-secondary)',
              border: '1.5px solid var(--border-primary)', cursor: 'pointer', display: 'flex',
              flexDirection: 'column', alignItems: 'center', gap: 12, textAlign: 'center', transition: 'all 0.2s ease',
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

          <button
            onClick={() => {
              setMediaSourceModalOpen(false)
              if (!libraryFetched) fetchMedia()
              setMediaLibraryModalOpen(true)
            }}
            style={{
              padding: '24px 16px', borderRadius: 'var(--radius-xl)', background: 'var(--bg-secondary)',
              border: '1.5px solid var(--border-primary)', cursor: 'pointer', display: 'flex',
              flexDirection: 'column', alignItems: 'center', gap: 12, textAlign: 'center', transition: 'all 0.2s ease',
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
                  setAdMediaPreview(item.url)
                  toast.success(`Selected ${item.name}!`)
                  setMediaLibraryModalOpen(false)
                }}
                style={{
                  position: 'relative', aspectRatio: '1', borderRadius: 'var(--radius-lg)', overflow: 'hidden',
                  border: '2px solid var(--border-primary)', cursor: 'pointer', transition: 'all 0.2s ease', background: 'var(--bg-secondary)',
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
