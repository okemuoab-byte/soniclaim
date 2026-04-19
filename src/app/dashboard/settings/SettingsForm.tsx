'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Props {
  initialDisplayName: string
  email: string
}

export default function SettingsForm({ initialDisplayName, email }: Props) {
  const [displayName, setDisplayName] = useState(initialDisplayName)
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 4,
    padding: '10px 14px',
    color: 'var(--text)',
    fontSize: '0.88rem',
    outline: 'none',
    fontFamily: 'inherit',
    boxSizing: 'border-box',
  }

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '0.72rem',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.1em',
    color: 'var(--text-muted)',
    marginBottom: 6,
    fontWeight: 500,
  }

  async function handleSave() {
    setSaving(true)
    setError(null)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setError('Not authenticated'); setSaving(false); return }

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ display_name: displayName.trim() || null })
      .eq('id', user.id)

    setSaving(false)
    if (updateError) { setError(updateError.message); return }
    setNotice('Saved.')
    setTimeout(() => setNotice(null), 2000)
  }

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>

      {/* Profile */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', padding: '24px' }}>
        <div style={{
          fontSize: '0.72rem', color: 'var(--text-muted)',
          textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 20,
        }}>
          Profile
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={labelStyle}>Display name</label>
            <input
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              placeholder="Your name"
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Email</label>
            <input value={email} disabled style={{ ...inputStyle, opacity: 0.5, cursor: 'not-allowed' }} />
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4 }}>
              Email cannot be changed here. Contact support if needed.
            </div>
          </div>
        </div>
        {notice && (
          <div style={{ fontSize: '0.82rem', color: 'var(--accent)', marginTop: 16 }}>{notice}</div>
        )}
        {error && (
          <div style={{ fontSize: '0.82rem', color: 'var(--danger)', marginTop: 16 }}>{error}</div>
        )}
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            marginTop: 20,
            background: 'var(--accent)', color: '#000', border: 'none',
            borderRadius: 4, padding: '10px 24px',
            fontSize: '0.85rem', fontWeight: 600,
            cursor: saving ? 'not-allowed' : 'pointer',
            opacity: saving ? 0.7 : 1,
          }}
        >
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </div>

      {/* Account */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', padding: '24px' }}>
        <div style={{
          fontSize: '0.72rem', color: 'var(--text-muted)',
          textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 20,
        }}>
          Account
        </div>
        <button
          onClick={handleSignOut}
          style={{
            background: 'transparent', color: 'var(--danger)',
            border: '1px solid rgba(255,69,69,0.3)',
            borderRadius: 4, padding: '10px 24px',
            fontSize: '0.85rem', cursor: 'pointer',
          }}
        >
          Sign out
        </button>
      </div>

    </div>
  )
}
