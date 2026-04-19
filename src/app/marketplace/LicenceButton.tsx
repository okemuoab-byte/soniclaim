'use client'

import { useState } from 'react'

interface Props {
  soundId: string
  soundTitle: string
}

const LICENCE_TYPES = [
  { value: 'content', label: 'Content', description: 'Social media content use' },
  { value: 'commercial', label: 'Commercial', description: 'Ads, campaigns, promotions (2×)' },
  { value: 'exclusive', label: 'Exclusive', description: 'Full exclusive rights (5×)' },
]

export default function LicenceButton({ soundId, soundTitle }: Props) {
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState('content')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleCheckout() {
    setLoading(true)
    setError(null)
    const res = await fetch('/api/stripe/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ soundId, licenceType: selected }),
    })
    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      setError(d.error ?? 'Checkout failed')
      setLoading(false)
      return
    }
    const { url } = await res.json()
    if (url) window.location.href = url
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        style={{
          background: 'var(--accent)', color: '#000',
          border: 'none', borderRadius: 4,
          padding: '10px 18px', fontSize: '0.82rem', fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        Get licence →
      </button>
    )
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 100,
    }} onClick={() => setOpen(false)}>
      <div
        style={{
          background: 'var(--bg)', border: '1px solid var(--border)',
          padding: '32px', width: 440, borderRadius: 4,
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ marginBottom: 24 }}>
          <div className="eyebrow" style={{ marginBottom: 8 }}>Licence</div>
          <div style={{ fontFamily: 'var(--font-instrument-serif)', fontSize: '1.4rem', lineHeight: 1.2 }}>
            {soundTitle}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
          {LICENCE_TYPES.map(type => (
            <button
              key={type.value}
              onClick={() => setSelected(type.value)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '14px 16px', borderRadius: 4, border: '1px solid',
                borderColor: selected === type.value ? 'var(--accent)' : 'var(--border)',
                background: selected === type.value ? 'var(--accent-dim2)' : 'var(--surface)',
                cursor: 'pointer', textAlign: 'left',
              }}
            >
              <div>
                <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text)', marginBottom: 2 }}>
                  {type.label}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {type.description}
                </div>
              </div>
              <div style={{
                width: 16, height: 16, borderRadius: '50%',
                border: `2px solid ${selected === type.value ? 'var(--accent)' : 'var(--border)'}`,
                background: selected === type.value ? 'var(--accent)' : 'transparent',
                flexShrink: 0,
              }} />
            </button>
          ))}
        </div>

        {error && (
          <div style={{ fontSize: '0.82rem', color: 'var(--danger)', marginBottom: 16 }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={() => setOpen(false)}
            style={{
              flex: 1, padding: '12px', border: '1px solid var(--border)',
              background: 'var(--surface)', color: 'var(--text-muted)',
              borderRadius: 4, fontSize: '0.85rem', cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleCheckout}
            disabled={loading}
            style={{
              flex: 2, padding: '12px', border: 'none',
              background: 'var(--accent)', color: '#000',
              borderRadius: 4, fontSize: '0.85rem', fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? 'Redirecting…' : 'Proceed to checkout →'}
          </button>
        </div>

        <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: 12 }}>
          Secure payment via Stripe · SONICLAIM handles all rights paperwork
        </p>
      </div>
    </div>
  )
}
