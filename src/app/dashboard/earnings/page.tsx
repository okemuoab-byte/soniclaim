import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { AudioLines, Upload, Radar, Banknote, Settings2, TrendingUp } from 'lucide-react'

interface Licence {
  id: string
  price_gbp: number
  status: 'pending' | 'active' | 'expired' | 'cancelled'
  valid_from: string | null
  created_at: string
  sounds: { title: string } | null
}

function formatGbp(pence: number) {
  return `£${(pence / 100).toFixed(2)}`
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

const navItems = [
  { icon: AudioLines, label: 'My Sounds', href: '/dashboard' },
  { icon: Upload, label: 'Upload Sound', href: '/dashboard/upload' },
  { icon: Radar, label: 'Usage Feed', href: '/dashboard/feed' },
  { icon: Banknote, label: 'Earnings', href: '/dashboard/earnings', active: true },
  { icon: Settings2, label: 'Settings', href: '/dashboard/settings' },
]

export default async function EarningsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, stripe_account_id')
    .eq('id', user.id)
    .single()

  const displayName = profile?.display_name ?? user.email ?? 'Creator'

  // Get licences for sounds owned by this creator
  const { data: rawLicences } = await supabase
    .from('licences')
    .select('id, price_gbp, status, valid_from, created_at, sounds(title)')
    .eq('sounds.creator_id', user.id)
    .order('created_at', { ascending: false })

  const licences: Licence[] = (rawLicences ?? []) as unknown as Licence[]

  const activeLicences = licences.filter(l => l.status === 'active')
  const totalEarnedPence = activeLicences.reduce((sum, l) => sum + l.price_gbp, 0)
  const creatorSharePence = Math.round(totalEarnedPence * 0.8)
  const pendingLicences = licences.filter(l => l.status === 'pending')
  const pendingValuePence = pendingLicences.reduce((sum, l) => sum + l.price_gbp, 0)

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
      <main style={{ marginLeft: 240, flex: 1, padding: '48px' }}>

        <div style={{ marginBottom: 48 }}>
          <div className="eyebrow" style={{ marginBottom: 12 }}>Revenue</div>
          <h1 style={{
            fontFamily: 'var(--font-instrument-serif)',
            fontSize: 'clamp(1.8rem, 3vw, 2.6rem)',
            lineHeight: 1.1, letterSpacing: '-0.02em',
          }}>
            Your <em style={{ fontStyle: 'italic', color: 'var(--accent)' }}>earnings</em>
          </h1>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2, marginBottom: 40 }}>
          {[
            {
              label: 'Your share (80%)',
              value: formatGbp(creatorSharePence),
              accent: creatorSharePence > 0,
              sub: `${formatGbp(totalEarnedPence)} total deal value`,
            },
            {
              label: 'Pending deals',
              value: formatGbp(pendingValuePence),
              sub: `${pendingLicences.length} licence${pendingLicences.length !== 1 ? 's' : ''} in progress`,
            },
            {
              label: 'Deals closed',
              value: String(activeLicences.length),
              accent: activeLicences.length > 0,
              sub: 'Active licences',
            },
          ].map(s => (
            <div key={s.label} style={{
              background: 'var(--surface)', border: '1px solid var(--border)', padding: '24px 28px',
            }}>
              <div style={{
                fontFamily: 'var(--font-instrument-serif)', fontSize: '2.2rem',
                color: s.accent ? 'var(--accent)' : 'var(--text)',
                lineHeight: 1, marginBottom: 6,
              }}>{s.value}</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
                {s.label}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{s.sub}</div>
            </div>
          ))}
        </div>

        {/* Stripe Connect banner */}
        {!profile?.stripe_account_id && (
          <div style={{
            background: 'var(--accent-dim)', border: '1px solid var(--accent-border)',
            padding: '16px 24px', marginBottom: 32,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div>
              <div style={{ fontSize: '0.88rem', fontWeight: 500, color: 'var(--accent)', marginBottom: 4 }}>
                Connect your bank account to receive payouts
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                SONICLAIM uses Stripe to send your 80% share directly to your account.
              </div>
            </div>
            <a
              href="/api/stripe/connect"
              style={{
                display: 'inline-block', background: 'var(--accent)', color: '#000',
                padding: '10px 20px', borderRadius: 4, fontWeight: 600,
                fontSize: '0.82rem', textDecoration: 'none', whiteSpace: 'nowrap',
              }}
            >
              Connect Stripe →
            </a>
          </div>
        )}

        {/* Split explanation */}
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--border)',
          padding: '20px 24px', marginBottom: 32,
          display: 'flex', alignItems: 'center', gap: 16,
        }}>
          <TrendingUp size={20} color="var(--accent)" style={{ flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: '0.85rem', fontWeight: 500, marginBottom: 4 }}>
              80 / 20 split — you keep the majority
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
              Every licence negotiated through SONICLAIM pays 80% directly to you. SONICLAIM retains 20% for handling detection, outreach, negotiation, and paperwork.
            </div>
          </div>
        </div>

        {/* Licences table */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 120px 100px 120px',
          padding: '10px 20px', gap: 16,
          background: 'var(--surface)', border: '1px solid var(--border)', borderBottom: 'none',
          fontSize: '0.68rem', color: 'var(--text-muted)',
          textTransform: 'uppercase', letterSpacing: '0.1em',
        }}>
          <div>Sound</div>
          <div>Your share</div>
          <div>Status</div>
          <div>Date</div>
        </div>

        {licences.length === 0 ? (
          <div style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            padding: '64px 24px', textAlign: 'center',
          }}>
            <Banknote size={32} color="var(--text-muted)" style={{ margin: '0 auto 16px', display: 'block' }} />
            <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', lineHeight: 1.7, maxWidth: 360, margin: '0 auto' }}>
              No licences yet. When brands pay for the right to use your sound, the deals will appear here.
            </p>
          </div>
        ) : licences.map((l, i) => (
          <div key={l.id} style={{
            display: 'grid', gridTemplateColumns: '1fr 120px 100px 120px',
            padding: '16px 20px', gap: 16,
            background: i % 2 === 0 ? 'var(--bg)' : 'var(--surface)',
            border: '1px solid var(--border)',
            borderTop: i === 0 ? '1px solid var(--border)' : 'none',
            alignItems: 'center',
          }}>
            <div style={{ fontSize: '0.88rem', fontWeight: 500, color: 'var(--text)' }}>
              {(l.sounds as { title: string } | null)?.title ?? '—'}
            </div>
            <div style={{
              fontSize: '0.88rem', fontWeight: 600,
              color: l.status === 'active' ? 'var(--accent)' : 'var(--text-muted)',
            }}>
              {formatGbp(Math.round(l.price_gbp * 0.8))}
            </div>
            <div style={{
              fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.08em',
              color: l.status === 'active' ? 'var(--accent)'
                : l.status === 'pending' ? 'var(--pending)'
                : 'var(--text-muted)',
            }}>
              {l.status}
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              {formatDate(l.created_at)}
            </div>
          </div>
        ))}

      </main>
    </div>
  )
}
