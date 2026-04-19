import Link from 'next/link'
import { AudioLines, Upload, Radar, Banknote, Settings2, AlertTriangle, Users } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

interface Sound {
  id: string
  title: string
  duration_seconds: number | null
  registered_at: string
  audd_track_id: string | null
  usages: { classification: string | null; outreach_status: string }[]
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const [profileResult, soundsResult] = await Promise.all([
    supabase.from('profiles').select('display_name, role').eq('id', user.id).single(),
    supabase
      .from('sounds')
      .select('id, title, duration_seconds, registered_at, audd_track_id, usages(classification, outreach_status)')
      .eq('creator_id', user.id)
      .order('registered_at', { ascending: false }),
  ])

  const displayName = profileResult.data?.display_name ?? user.email ?? 'Creator'
  const sounds: Sound[] = (soundsResult.data ?? []) as Sound[]

  // Aggregate stats
  const totalUsages = sounds.reduce((acc, s) => acc + s.usages.length, 0)
  const commercialUsages = sounds.reduce(
    (acc, s) => acc + s.usages.filter(u => u.classification === 'COMMERCIAL').length, 0
  )
  const dealsLicensed = sounds.reduce(
    (acc, s) => acc + s.usages.filter(u => u.outreach_status === 'licensed').length, 0
  )

  const navItems = [
    { icon: AudioLines, label: 'My Sounds', href: '/dashboard', active: true },
    { icon: Upload, label: 'Upload Sound', href: '/dashboard/upload', active: false },
    { icon: Radar, label: 'Usage Feed', href: '/dashboard/feed', active: false },
    { icon: Banknote, label: 'Earnings', href: '/dashboard/earnings', active: false },
    { icon: Settings2, label: 'Settings', href: '/dashboard/settings', active: false },
  ]

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg)' }}>

      {/* Sidebar */}
      <aside style={{
        width: 240,
        background: 'var(--surface)',
        borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column',
        position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 50,
      }}>
        <div style={{ padding: '28px 24px', borderBottom: '1px solid var(--border)' }}>
          <Link href="/" style={{
            fontFamily: 'var(--font-instrument-serif)',
            fontSize: '1.3rem', letterSpacing: '0.08em',
            color: 'var(--text)', textDecoration: 'none',
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
          <div style={{ color: 'var(--text)', fontWeight: 500, marginBottom: 2, fontSize: '0.85rem' }}>
            {displayName}
          </div>
          Creator account
        </div>
      </aside>

      {/* Main */}
      <main style={{ marginLeft: 240, flex: 1, padding: '48px' }}>

        {/* Header */}
        <div style={{ marginBottom: 48 }}>
          <div className="eyebrow" style={{ marginBottom: 12 }}>Dashboard</div>
          <h1 style={{
            fontFamily: 'var(--font-instrument-serif)',
            fontSize: 'clamp(1.8rem, 3vw, 2.6rem)',
            lineHeight: 1.1, letterSpacing: '-0.02em',
          }}>
            Your <em style={{ fontStyle: 'italic', color: 'var(--accent)' }}>sounds</em>
          </h1>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 2, marginBottom: 40 }}>
          {[
            { label: 'Registered Sounds', value: String(sounds.length) },
            { label: 'Total Detections', value: String(totalUsages) },
            { label: 'Commercial Uses', value: String(commercialUsages), warn: commercialUsages > 0 },
            { label: 'Deals Closed', value: String(dealsLicensed), accent: dealsLicensed > 0 },
          ].map(s => (
            <div key={s.label} style={{
              background: 'var(--surface)', border: '1px solid var(--border)', padding: '24px 28px',
            }}>
              <div style={{
                fontFamily: 'var(--font-instrument-serif)',
                fontSize: '2rem',
                color: s.accent ? 'var(--accent)' : s.warn ? 'var(--danger)' : 'var(--text)',
                lineHeight: 1, marginBottom: 6,
              }}>{s.value}</div>
              <div style={{
                fontSize: '0.72rem', color: 'var(--text-muted)',
                textTransform: 'uppercase', letterSpacing: '0.08em',
              }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Sounds list header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 24px',
          background: 'var(--surface)', border: '1px solid var(--border)', borderBottom: 'none',
        }}>
          <span style={{ fontSize: '0.82rem', fontWeight: 500 }}>
            {sounds.length === 0 ? 'No sounds registered' : `${sounds.length} sound${sounds.length !== 1 ? 's' : ''}`}
          </span>
          <Link href="/dashboard/upload" style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: 'var(--accent)', color: '#000',
            padding: '8px 16px', borderRadius: 4,
            fontWeight: 600, fontSize: '0.78rem', textDecoration: 'none',
          }}>
            <Upload size={12} /> Upload
          </Link>
        </div>

        {sounds.length === 0 ? (
          <div style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            padding: '64px 48px', textAlign: 'center',
          }}>
            <div style={{
              width: 56, height: 56,
              background: 'var(--accent-dim)', border: '1px solid var(--accent-border)',
              borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 24px',
            }}>
              <AudioLines size={24} color="var(--accent)" />
            </div>
            <h2 style={{
              fontFamily: 'var(--font-instrument-serif)',
              fontSize: '1.6rem', letterSpacing: '-0.02em', marginBottom: 12,
            }}>
              No sounds registered yet
            </h2>
            <p style={{
              fontSize: '0.88rem', color: 'var(--text-muted)',
              lineHeight: 1.7, maxWidth: 360, margin: '0 auto 32px',
            }}>
              Upload your first viral audio to register ownership, generate your certificate, and start monitoring for commercial use.
            </p>
            <Link href="/dashboard/upload" style={{
              display: 'inline-block', background: 'var(--accent)', color: '#000',
              padding: '14px 32px', borderRadius: 4, fontWeight: 600,
              fontSize: '0.9rem', textDecoration: 'none',
            }}>
              Upload Your First Sound →
            </Link>
          </div>
        ) : (
          <div>
            {sounds.map((sound, i) => {
              const usageCount = sound.usages.length
              const commercialCount = sound.usages.filter(u => u.classification === 'COMMERCIAL').length
              const organicCount = sound.usages.filter(u => u.classification === 'ORGANIC').length
              const hasLicensed = sound.usages.some(u => u.outreach_status === 'licensed')

              return (
                <Link
                  key={sound.id}
                  href={`/dashboard/sounds/${sound.id}`}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    gap: 24,
                    background: 'var(--bg)',
                    border: '1px solid var(--border)',
                    borderTop: i === 0 ? '1px solid var(--border)' : 'none',
                    padding: '16px 24px',
                    textDecoration: 'none',
                  }}
                >
                  {/* Icon */}
                  <div style={{
                    width: 36, height: 36,
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <AudioLines size={16} color="var(--text-muted)" />
                  </div>

                  {/* Title + date */}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.92rem', fontWeight: 500, color: 'var(--text)', marginBottom: 3 }}>
                      {sound.title}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      Registered {new Date(sound.registered_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      {sound.duration_seconds ? ` · ${Math.round(sound.duration_seconds)}s` : ''}
                    </div>
                  </div>

                  {/* Usage badges */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                    {commercialCount > 0 && (
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        fontSize: '0.72rem', color: 'var(--danger)',
                        textTransform: 'uppercase', letterSpacing: '0.08em',
                      }}>
                        <AlertTriangle size={11} /> {commercialCount} commercial
                      </span>
                    )}
                    {organicCount > 0 && (
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        fontSize: '0.72rem', color: 'var(--text-muted)',
                        textTransform: 'uppercase', letterSpacing: '0.08em',
                      }}>
                        <Users size={11} /> {organicCount} organic
                      </span>
                    )}
                    {usageCount === 0 && (
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        fontSize: '0.72rem', color: 'var(--text-muted)',
                        textTransform: 'uppercase', letterSpacing: '0.08em',
                      }}>
                        <Radar size={11} /> Monitoring
                      </span>
                    )}
                    {hasLicensed && (
                      <span style={{
                        fontSize: '0.72rem', color: 'var(--accent)',
                        textTransform: 'uppercase', letterSpacing: '0.08em',
                      }}>
                        Licensed
                      </span>
                    )}
                  </div>

                  {/* Monitoring dot */}
                  <div style={{
                    width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
                    background: sound.audd_track_id ? 'var(--accent)' : 'var(--text-muted)',
                  }} className={sound.audd_track_id ? 'status-live' : ''} />
                </Link>
              )
            })}
          </div>
        )}

      </main>
    </div>
  )
}
