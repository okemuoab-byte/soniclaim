import Link from 'next/link'
import { AudioLines } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import LicenceButton from './LicenceButton'

interface Sound {
  id: string
  title: string
  description: string | null
  duration_seconds: number | null
  base_licence_price_gbp: number | null
  registered_at: string
  profiles: { display_name: string | null } | null
}

function formatGbp(pence: number | null) {
  if (!pence) return 'Contact us'
  return `From £${(pence / 100).toFixed(0)}`
}

export default async function MarketplacePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, role')
    .eq('id', user.id)
    .single()

  const displayName = profile?.display_name ?? user.email ?? 'Brand'

  const { data: rawSounds } = await supabase
    .from('sounds')
    .select('id, title, description, duration_seconds, base_licence_price_gbp, registered_at, profiles(display_name)')
    .eq('is_available_for_licensing', true)
    .order('registered_at', { ascending: false })

  const sounds: Sound[] = (rawSounds ?? []) as unknown as Sound[]

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>

      {/* Nav */}
      <nav style={{
        borderBottom: '1px solid var(--border)',
        background: 'rgba(10,10,10,0.92)',
        backdropFilter: 'blur(12px)',
        padding: '0 48px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        height: 64, position: 'sticky', top: 0, zIndex: 50,
      }}>
        <Link href="/" style={{
          fontFamily: 'var(--font-instrument-serif)', fontSize: '1.3rem',
          letterSpacing: '0.08em', color: 'var(--text)', textDecoration: 'none',
        }}>
          SONIC<span style={{ color: 'var(--accent)' }}>LAIM</span>
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{displayName}</span>
          <span style={{
            fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.1em',
            background: 'var(--accent-dim)', color: 'var(--accent)',
            border: '1px solid var(--accent-border)', padding: '4px 10px', borderRadius: 4,
          }}>Brand</span>
        </div>
      </nav>

      {/* Header */}
      <div style={{ padding: '64px 48px 40px', borderBottom: '1px solid var(--border)' }}>
        <div className="eyebrow" style={{ marginBottom: 16 }}>Sound Marketplace</div>
        <h1 style={{
          fontFamily: 'var(--font-instrument-serif)',
          fontSize: 'clamp(2rem, 4vw, 3.2rem)',
          lineHeight: 1.05, letterSpacing: '-0.02em',
        }}>
          Discover <em style={{ fontStyle: 'italic', color: 'var(--accent)' }}>licensed</em> sounds
        </h1>
        <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginTop: 16, maxWidth: 480 }}>
          Licence viral audio for your brand campaigns. SONICLAIM handles all rights paperwork — you just say yes.
        </p>
      </div>

      {/* Content */}
      <div style={{ padding: '48px' }}>
        {sounds.length === 0 ? (
          <div style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            padding: '80px 48px', textAlign: 'center',
          }}>
            <div style={{
              width: 56, height: 56, background: 'var(--surface-2)',
              border: '1px solid var(--border)', borderRadius: 8,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 24px',
            }}>
              <AudioLines size={24} color="var(--text-muted)" />
            </div>
            <h2 style={{
              fontFamily: 'var(--font-instrument-serif)', fontSize: '1.6rem',
              letterSpacing: '-0.02em', marginBottom: 12,
            }}>Sounds coming soon</h2>
            <p style={{
              fontSize: '0.88rem', color: 'var(--text-muted)', lineHeight: 1.7,
              maxWidth: 400, margin: '0 auto 32px',
            }}>
              Have a specific sound you want to licence? Contact us and we'll sort it.
            </p>
            <a href="mailto:arinze@soniclaim.com" style={{
              display: 'inline-block', background: 'var(--accent)', color: '#000',
              padding: '14px 32px', borderRadius: 4, fontWeight: 600,
              fontSize: '0.9rem', textDecoration: 'none',
            }}>
              Contact Arinze directly →
            </a>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 2 }}>
            {sounds.map(sound => (
              <div key={sound.id} style={{
                background: 'var(--surface)', border: '1px solid var(--border)',
                padding: '24px',
              }}>
                {/* Icon + title */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 16 }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 6,
                    background: 'var(--accent-dim)', border: '1px solid var(--accent-border)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    <AudioLines size={20} color="var(--accent)" />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text)', marginBottom: 2 }}>
                      {sound.title}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      by {(sound.profiles as { display_name: string | null } | null)?.display_name ?? 'Creator'}
                      {sound.duration_seconds && ` · ${Math.round(sound.duration_seconds)}s`}
                    </div>
                  </div>
                </div>

                {/* Description */}
                {sound.description && (
                  <p style={{
                    fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: 16,
                    overflow: 'hidden',
                    display: '-webkit-box',
                  }}>
                    {sound.description}
                  </p>
                )}

                {/* Price + CTA */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 16 }}>
                  <div>
                    <div style={{
                      fontSize: '0.72rem', color: 'var(--text-muted)',
                      textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 2,
                    }}>
                      Licence price
                    </div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text)' }}>
                      {formatGbp(sound.base_licence_price_gbp)}
                    </div>
                  </div>
                  <LicenceButton soundId={sound.id} soundTitle={sound.title} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
