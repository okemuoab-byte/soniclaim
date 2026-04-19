import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { AudioLines, Upload, Radar, Banknote, Settings2 } from 'lucide-react'
import SettingsForm from './SettingsForm'

const navItems = [
  { icon: AudioLines, label: 'My Sounds', href: '/dashboard' },
  { icon: Upload, label: 'Upload Sound', href: '/dashboard/upload' },
  { icon: Radar, label: 'Usage Feed', href: '/dashboard/feed' },
  { icon: Banknote, label: 'Earnings', href: '/dashboard/earnings' },
  { icon: Settings2, label: 'Settings', href: '/dashboard/settings', active: true },
]

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, avatar_url')
    .eq('id', user.id)
    .single()

  const displayName = profile?.display_name ?? user.email ?? 'Creator'

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg)' }}>

      {/* Sidebar */}
      <aside style={{
        width: 240, background: 'var(--surface)',
        borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column',
        position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 50,
      }}>
        <div style={{ padding: '28px 24px', borderBottom: '1px solid var(--border)' }}>
          <Link href="/" style={{
            fontFamily: 'var(--font-instrument-serif)', fontSize: '1.3rem',
            letterSpacing: '0.08em', color: 'var(--text)', textDecoration: 'none',
          }}>
            SONIC<span style={{ color: 'var(--accent)' }}>LAIM</span>
          </Link>
        </div>
        <nav style={{ flex: 1, padding: '16px 0' }}>
          {navItems.map(item => (
            <Link key={item.href} href={item.href} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '12px 24px', fontSize: '0.85rem',
              color: item.active ? 'var(--accent)' : 'var(--text-muted)',
              textDecoration: 'none',
              borderLeft: `2px solid ${item.active ? 'var(--accent)' : 'transparent'}`,
              background: item.active ? 'var(--accent-dim2)' : 'transparent',
            }}>
              <item.icon size={16} />
              {item.label}
            </Link>
          ))}
        </nav>
        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
          <div style={{ color: 'var(--text)', fontWeight: 500, marginBottom: 2, fontSize: '0.85rem' }}>{displayName}</div>
          Creator account
        </div>
      </aside>

      {/* Main */}
      <main style={{ marginLeft: 240, flex: 1, padding: '48px', maxWidth: 680 }}>

        <div style={{ marginBottom: 48 }}>
          <div className="eyebrow" style={{ marginBottom: 12 }}>Account</div>
          <h1 style={{
            fontFamily: 'var(--font-instrument-serif)',
            fontSize: 'clamp(1.8rem, 3vw, 2.6rem)',
            lineHeight: 1.1, letterSpacing: '-0.02em',
          }}>
            <em style={{ fontStyle: 'italic', color: 'var(--accent)' }}>Settings</em>
          </h1>
        </div>

        <SettingsForm
          initialDisplayName={profile?.display_name ?? ''}
          email={user.email ?? ''}
        />

      </main>
    </div>
  )
}
