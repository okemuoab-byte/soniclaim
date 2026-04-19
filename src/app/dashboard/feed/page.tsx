import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import {
  AudioLines, Upload, Radar, Banknote, Settings2,
  ExternalLink, AlertTriangle, Users, Mail,
} from 'lucide-react'

type Classification = 'ORGANIC' | 'COMMERCIAL' | 'AMBIGUOUS'
type OutreachStatus =
  | 'pending' | 'organic' | 'draft' | 'approved'
  | 'sent' | 'followed_up' | 'responded' | 'licensed'
  | 'escalated' | 'dismissed'

interface Usage {
  id: string
  platform: string
  external_url: string | null
  channel_name: string | null
  channel_follower_count: number | null
  classification: Classification | null
  outreach_status: OutreachStatus
  detected_at: string
  is_sponsored: boolean
  sounds: { id: string; title: string } | null
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

function formatFollowers(n: number | null) {
  if (!n) return null
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`
  return String(n)
}

const platformBadge: Record<string, string> = { tiktok: 'TK', instagram: 'IG', youtube: 'YT' }

function statusLabel(u: Usage): string {
  if (!u.classification) return 'Awaiting review'
  if (u.classification === 'ORGANIC') return 'Organic use'
  if (u.classification === 'AMBIGUOUS') return 'Under review'
  const map: Partial<Record<OutreachStatus, string>> = {
    pending: 'Commercial — outreach pending',
    draft: 'Outreach drafted',
    approved: 'Outreach approved',
    sent: 'Outreach sent',
    followed_up: 'Follow-up sent',
    responded: 'Brand responded',
    licensed: 'Licensed ✓',
    escalated: 'Escalated',
    dismissed: 'Dismissed',
  }
  return map[u.outreach_status] ?? u.outreach_status
}

function statusColor(u: Usage): string {
  if (!u.classification) return 'var(--text-muted)'
  if (u.classification === 'ORGANIC') return 'var(--text-muted)'
  if (u.classification === 'AMBIGUOUS') return 'var(--pending)'
  if (u.outreach_status === 'licensed') return 'var(--accent)'
  if (['sent', 'followed_up', 'responded'].includes(u.outreach_status)) return 'var(--accent)'
  if (['draft', 'approved'].includes(u.outreach_status)) return 'var(--pending)'
  if (u.outreach_status === 'escalated') return 'var(--danger)'
  if (u.outreach_status === 'dismissed') return 'var(--text-muted)'
  return 'var(--danger)' // pending + COMMERCIAL
}

const navItems = [
  { icon: AudioLines, label: 'My Sounds', href: '/dashboard' },
  { icon: Upload, label: 'Upload Sound', href: '/dashboard/upload' },
  { icon: Radar, label: 'Usage Feed', href: '/dashboard/feed', active: true },
  { icon: Banknote, label: 'Earnings', href: '/dashboard/earnings' },
  { icon: Settings2, label: 'Settings', href: '/dashboard/settings' },
]

export default async function FeedPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name')
    .eq('id', user.id)
    .single()

  const displayName = profile?.display_name ?? user.email ?? 'Creator'

  // Get all usages for creator's sounds
  const { data: rawUsages } = await supabase
    .from('usages')
    .select('*, sounds!inner(id, title, creator_id)')
    .eq('sounds.creator_id', user.id)
    .order('detected_at', { ascending: false })

  const usages: Usage[] = (rawUsages ?? []) as unknown as Usage[]

  const commercial = usages.filter(u => u.classification === 'COMMERCIAL')
  const actionNeeded = commercial.filter(u => u.outreach_status === 'pending')

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
          <div className="eyebrow" style={{ marginBottom: 12 }}>Monitoring</div>
          <h1 style={{
            fontFamily: 'var(--font-instrument-serif)',
            fontSize: 'clamp(1.8rem, 3vw, 2.6rem)',
            lineHeight: 1.1, letterSpacing: '-0.02em',
          }}>
            Usage <em style={{ fontStyle: 'italic', color: 'var(--accent)' }}>feed</em>
          </h1>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 2, marginBottom: 40 }}>
          {[
            { label: 'Total detections', value: usages.length },
            { label: 'Commercial uses', value: commercial.length, warn: commercial.length > 0 },
            { label: 'Active outreach', value: usages.filter(u => ['sent', 'followed_up', 'responded'].includes(u.outreach_status)).length, accent: true },
            { label: 'Deals closed', value: usages.filter(u => u.outreach_status === 'licensed').length, accent: true },
          ].map(s => (
            <div key={s.label} style={{
              background: 'var(--surface)', border: '1px solid var(--border)', padding: '20px 24px',
            }}>
              <div style={{
                fontFamily: 'var(--font-instrument-serif)', fontSize: '2rem', lineHeight: 1, marginBottom: 6,
                color: s.accent && s.value > 0 ? 'var(--accent)' : s.warn && s.value > 0 ? 'var(--danger)' : 'var(--text)',
              }}>{s.value}</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                {s.label}
              </div>
            </div>
          ))}
        </div>

        {/* Action needed banner */}
        {actionNeeded.length > 0 && (
          <div style={{
            background: 'rgba(255,69,69,0.06)', border: '1px solid rgba(255,69,69,0.2)',
            padding: '14px 20px', marginBottom: 2,
            display: 'flex', alignItems: 'center', gap: 10,
            fontSize: '0.82rem', color: 'var(--danger)',
          }}>
            <AlertTriangle size={14} />
            {actionNeeded.length} commercial usage{actionNeeded.length !== 1 ? 's' : ''} detected — SONICLAIM is preparing outreach
          </div>
        )}

        {/* Feed header */}
        <div style={{
          display: 'grid', gridTemplateColumns: '40px 1fr 200px 80px 100px',
          padding: '10px 20px', gap: 16,
          background: 'var(--surface)', border: '1px solid var(--border)', borderBottom: 'none',
          fontSize: '0.68rem', color: 'var(--text-muted)',
          textTransform: 'uppercase', letterSpacing: '0.1em',
        }}>
          <div />
          <div>Channel / Sound</div>
          <div>Status</div>
          <div>Followers</div>
          <div>Detected</div>
        </div>

        {usages.length === 0 ? (
          <div style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            padding: '64px 24px', textAlign: 'center',
          }}>
            <Radar size={32} color="var(--text-muted)" style={{ margin: '0 auto 16px', display: 'block' }} />
            <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', lineHeight: 1.7, maxWidth: 360, margin: '0 auto' }}>
              No detections yet. Once your sounds are registered with AudD monitoring, uses across TikTok, Instagram and YouTube will appear here automatically.
            </p>
          </div>
        ) : usages.map((u, i) => (
          <div key={u.id} style={{
            display: 'grid', gridTemplateColumns: '40px 1fr 200px 80px 100px',
            padding: '14px 20px', gap: 16,
            background: i % 2 === 0 ? 'var(--bg)' : 'var(--surface)',
            border: '1px solid var(--border)',
            borderTop: i === 0 ? '1px solid var(--border)' : 'none',
            alignItems: 'center',
          }}>
            {/* Platform badge */}
            <div style={{
              width: 32, height: 32, borderRadius: 4,
              background: 'var(--surface-2)', border: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.6rem', fontWeight: 700, color: 'var(--text-muted)',
            }}>
              {platformBadge[u.platform] ?? u.platform.slice(0, 2).toUpperCase()}
            </div>

            {/* Channel + sound */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                <span style={{ fontSize: '0.88rem', fontWeight: 500, color: 'var(--text)' }}>
                  {u.channel_name ?? 'Unknown channel'}
                </span>
                {u.is_sponsored && (
                  <span style={{ fontSize: '0.65rem', color: 'var(--danger)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    Sponsored
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  {(u.sounds as { id: string; title: string } | null)?.title ?? '—'}
                </span>
                {u.external_url && (
                  <a href={u.external_url} target="_blank" rel="noopener noreferrer" style={{
                    display: 'inline-flex', alignItems: 'center', gap: 3,
                    fontSize: '0.68rem', color: 'var(--text-muted)', textDecoration: 'none',
                  }}>
                    <ExternalLink size={10} />
                  </a>
                )}
              </div>
            </div>

            {/* Status */}
            <div style={{
              fontSize: '0.72rem', color: statusColor(u),
              textTransform: 'uppercase', letterSpacing: '0.08em',
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              {u.classification === 'COMMERCIAL' && ['sent', 'followed_up'].includes(u.outreach_status) && (
                <Mail size={11} />
              )}
              {u.classification === 'COMMERCIAL' && u.outreach_status === 'pending' && (
                <AlertTriangle size={11} />
              )}
              {u.classification === 'ORGANIC' && (
                <Users size={11} />
              )}
              {statusLabel(u)}
            </div>

            {/* Followers */}
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              {formatFollowers(u.channel_follower_count) ?? '—'}
            </div>

            {/* Date */}
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              {formatDate(u.detected_at)}
            </div>
          </div>
        ))}

      </main>
    </div>
  )
}
