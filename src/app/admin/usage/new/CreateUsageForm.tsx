'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Sound {
  id: string
  title: string
}

export default function CreateUsageForm({ sounds }: { sounds: Sound[] }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState({
    sound_id: sounds[0]?.id ?? '',
    platform: 'tiktok',
    external_url: '',
    channel_name: '',
    channel_follower_count: '',
    is_sponsored: false,
    post_caption: '',
    classification: '',
  })

  function set(key: string, value: string | boolean) {
    setForm(f => ({ ...f, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.sound_id || !form.external_url) {
      setError('Sound and URL are required.')
      return
    }
    setLoading(true)
    setError(null)

    const res = await fetch('/api/admin/usages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        channel_follower_count: form.channel_follower_count ? parseInt(form.channel_follower_count) : null,
        classification: form.classification || null,
      }),
    })

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error ?? 'Failed to create usage.')
      setLoading(false)
      return
    }

    const { usageId } = await res.json()
    router.push(`/admin/usage/${usageId}`)
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 4,
    padding: '10px 14px',
    color: 'var(--text)',
    fontSize: '0.88rem',
    outline: 'none',
  }

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '0.72rem',
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
    color: 'var(--text-muted)',
    marginBottom: 6,
    fontWeight: 500,
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      <div>
        <label style={labelStyle}>Sound <span style={{ color: 'var(--danger)' }}>*</span></label>
        <select
          value={form.sound_id}
          onChange={e => set('sound_id', e.target.value)}
          style={{ ...inputStyle, colorScheme: 'dark' }}
        >
          {sounds.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
        </select>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div>
          <label style={labelStyle}>Platform <span style={{ color: 'var(--danger)' }}>*</span></label>
          <select
            value={form.platform}
            onChange={e => set('platform', e.target.value)}
            style={{ ...inputStyle, colorScheme: 'dark' }}
          >
            <option value="tiktok">TikTok</option>
            <option value="instagram">Instagram</option>
            <option value="youtube">YouTube</option>
          </select>
        </div>
        <div>
          <label style={labelStyle}>Classification</label>
          <select
            value={form.classification}
            onChange={e => set('classification', e.target.value)}
            style={{ ...inputStyle, colorScheme: 'dark' }}
          >
            <option value="">— unclassified —</option>
            <option value="COMMERCIAL">Commercial</option>
            <option value="ORGANIC">Organic</option>
            <option value="AMBIGUOUS">Ambiguous</option>
          </select>
        </div>
      </div>

      <div>
        <label style={labelStyle}>Post URL <span style={{ color: 'var(--danger)' }}>*</span></label>
        <input
          type="url"
          value={form.external_url}
          onChange={e => set('external_url', e.target.value)}
          placeholder="https://www.tiktok.com/@brand/video/..."
          style={inputStyle}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div>
          <label style={labelStyle}>Channel name</label>
          <input
            value={form.channel_name}
            onChange={e => set('channel_name', e.target.value)}
            placeholder="@brandname"
            style={inputStyle}
          />
        </div>
        <div>
          <label style={labelStyle}>Follower count</label>
          <input
            type="number"
            value={form.channel_follower_count}
            onChange={e => set('channel_follower_count', e.target.value)}
            placeholder="e.g. 450000"
            style={inputStyle}
          />
        </div>
      </div>

      <div>
        <label style={labelStyle}>Post caption</label>
        <textarea
          value={form.post_caption}
          onChange={e => set('post_caption', e.target.value)}
          rows={3}
          placeholder="Text from the post caption…"
          style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit', minHeight: 72 }}
        />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <input
          type="checkbox"
          id="sponsored"
          checked={form.is_sponsored}
          onChange={e => set('is_sponsored', e.target.checked)}
          style={{ width: 16, height: 16, accentColor: 'var(--accent)' }}
        />
        <label htmlFor="sponsored" style={{ fontSize: '0.85rem', color: 'var(--text)', cursor: 'pointer' }}>
          This post is sponsored / paid partnership
        </label>
      </div>

      {error && (
        <div style={{ fontSize: '0.82rem', color: 'var(--danger)', padding: '10px 14px', border: '1px solid rgba(255,69,69,0.3)', borderRadius: 4 }}>
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        style={{
          background: 'var(--accent)', color: '#000', border: 'none',
          borderRadius: 4, padding: '14px 32px',
          fontSize: '0.9rem', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
          opacity: loading ? 0.7 : 1,
        }}
      >
        {loading ? 'Creating…' : 'Create usage →'}
      </button>

    </form>
  )
}
