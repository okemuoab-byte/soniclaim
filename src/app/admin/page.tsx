import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { AlertTriangle, Users, Clock, Mail, CheckCircle2, Radar, Plus } from 'lucide-react'

type OutreachStatus =
  | 'pending' | 'organic' | 'draft' | 'approved'
  | 'sent' | 'followed_up' | 'responded' | 'licensed'
  | 'escalated' | 'dismissed'

type Classification = 'ORGANIC' | 'COMMERCIAL' | 'AMBIGUOUS'

interface Usage {
  id: string
  platform: string
  channel_name: string | null
  channel_follower_count: number | null
  classification: Classification | null
  outreach_status: OutreachStatus
  detected_at: string
  is_sponsored: boolean
  sounds: { title: string } | null
}

const PIPELINE_STAGES: { status: OutreachStatus | 'unclassified'; label: string; color: string }[] = [
  { status: 'unclassified', label: 'Unclassified', color: 'var(--text-muted)' },
  { status: 'draft', label: 'Draft ready', color: 'var(--pending)' },
  { status: 'approved', label: 'Approved', color: 'var(--pending)' },
  { status: 'sent', label: 'Sent', color: 'var(--accent)' },
  { status: 'followed_up', label: 'Followed up', color: 'var(--accent)' },
  { status: 'responded', label: 'Responded', color: 'var(--accent)' },
  { status: 'licensed', label: 'Licensed', color: 'var(--accent)' },
]

function formatFollowers(n: number | null) {
  if (!n) return '—'
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`
  return String(n)
}

function statusLabel(u: Usage): string {
  if (!u.classification) return 'Unclassified'
  if (u.classification === 'ORGANIC') return 'Organic'
  if (u.classification === 'AMBIGUOUS') return 'Under review'
  const map: Partial<Record<OutreachStatus, string>> = {
    pending: 'Needs draft',
    draft: 'Draft ready',
    approved: 'Approved',
    sent: 'Outreach sent',
    followed_up: 'Followed up',
    responded: 'Brand responded',
    licensed: 'Licensed',
    escalated: 'Escalated',
    dismissed: 'Dismissed',
  }
  return map[u.outreach_status] ?? u.outreach_status
}

function statusColor(u: Usage): string {
  if (!u.classification || u.classification === 'ORGANIC') return 'var(--text-muted)'
  if (u.classification === 'AMBIGUOUS') return 'var(--pending)'
  if (u.outreach_status === 'licensed') return 'var(--accent)'
  if (['sent', 'followed_up', 'responded'].includes(u.outreach_status)) return 'var(--accent)'
  if (['draft', 'approved'].includes(u.outreach_status)) return 'var(--pending)'
  if (u.outreach_status === 'escalated') return 'var(--danger)'
  return 'var(--danger)' // pending + COMMERCIAL = needs action
}

const platformBadge: Record<string, string> = { tiktok: 'TK', instagram: 'IG', youtube: 'YT' }

export default async function AdminPage() {
  const supabase = await createClient()

  const [soundsResult, usagesResult] = await Promise.all([
    supabase.from('sounds').select('id', { count: 'exact', head: true }),
    supabase.from('usages').select(`
      id, platform, channel_name, channel_follower_count,
      classification, outreach_status, detected_at, is_sponsored,
      sounds(title)
    `).order('detected_at', { ascending: false }),
  ])

  const totalSounds = soundsResult.count ?? 0
  const usages: Usage[] = (usagesResult.data ?? []) as unknown as Usage[]

  const commercial = usages.filter(u => u.classification === 'COMMERCIAL')
  const activeOutreach = usages.filter(u => ['sent', 'followed_up', 'responded'].includes(u.outreach_status))
  const licensed = usages.filter(u => u.outreach_status === 'licensed')
  const needsAction = commercial.filter(u => u.outreach_status === 'pending')

  const stageCount = (stage: string) => {
    if (stage === 'unclassified') return usages.filter(u => !u.classification).length
    return commercial.filter(u => u.outreach_status === stage).length
  }

  return (
    <div style={{ padding: '48px' }}>

      {/* Header */}
      <div style={{ marginBottom: 48 }}>
        <div className="eyebrow" style={{ marginBottom: 12 }}>Operations</div>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <h1 style={{
            fontFamily: 'var(--font-instrument-serif)',
            fontSize: 'clamp(1.8rem, 3vw, 2.6rem)',
            lineHeight: 1.1, letterSpacing: '-0.02em',
          }}>
            Outreach <em style={{ fontStyle: 'italic', color: 'var(--accent)' }}>pipeline</em>
          </h1>
          <Link href="/admin/usage/new" style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: 'var(--surface)', border: '1px solid var(--border)',
            color: 'var(--text-muted)', padding: '8px 16px', borderRadius: 4,
            fontSize: '0.82rem', textDecoration: 'none',
          }}>
            <Plus size={13} /> Add usage
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 2, marginBottom: 40 }}>
        {[
          { label: 'Registered sounds', value: totalSounds, icon: null },
          { label: 'Total detections', value: usages.length, icon: null },
          { label: 'Commercial uses', value: commercial.length, warn: commercial.length > 0 },
          { label: 'Active outreach', value: activeOutreach.length, accent: activeOutreach.length > 0 },
          { label: 'Deals closed', value: licensed.length, accent: licensed.length > 0 },
        ].map(s => (
          <div key={s.label} style={{
            background: 'var(--surface)', border: '1px solid var(--border)', padding: '20px 24px',
          }}>
            <div style={{
              fontFamily: 'var(--font-instrument-serif)', fontSize: '2rem', lineHeight: 1, marginBottom: 6,
              color: s.accent ? 'var(--accent)' : s.warn ? 'var(--danger)' : 'var(--text)',
            }}>{s.value}</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              {s.label}
            </div>
          </div>
        ))}
      </div>

      {/* Pipeline strip */}
      <div style={{
        display: 'grid', gridTemplateColumns: `repeat(${PIPELINE_STAGES.length}, 1fr)`,
        gap: 2, marginBottom: 40,
      }}>
        {PIPELINE_STAGES.map(({ status, label, color }) => {
          const count = stageCount(status)
          return (
            <div key={status} style={{
              background: 'var(--surface)', border: '1px solid var(--border)',
              padding: '16px 20px',
              borderTop: count > 0 ? `2px solid ${color}` : '2px solid var(--border)',
            }}>
              <div style={{
                fontFamily: 'var(--font-instrument-serif)', fontSize: '1.6rem',
                color: count > 0 ? color : 'var(--text-muted)', lineHeight: 1, marginBottom: 4,
              }}>{count}</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                {label}
              </div>
            </div>
          )
        })}
      </div>

      {/* Needs action banner */}
      {needsAction.length > 0 && (
        <div style={{
          background: 'rgba(255,69,69,0.06)', border: '1px solid rgba(255,69,69,0.2)',
          padding: '14px 20px', marginBottom: 2,
          display: 'flex', alignItems: 'center', gap: 10,
          fontSize: '0.82rem', color: 'var(--danger)',
        }}>
          <AlertTriangle size={14} />
          {needsAction.length} commercial usage{needsAction.length !== 1 ? 's' : ''} need outreach drafts
        </div>
      )}

      {/* Usages table header */}
      <div style={{
        display: 'grid', gridTemplateColumns: '40px 1fr 180px 120px 100px 80px',
        padding: '10px 20px', gap: 16,
        background: 'var(--surface)', border: '1px solid var(--border)', borderBottom: 'none',
        fontSize: '0.68rem', color: 'var(--text-muted)',
        textTransform: 'uppercase', letterSpacing: '0.1em',
      }}>
        <div />
        <div>Channel / Sound</div>
        <div>Status</div>
        <div>Platform</div>
        <div>Followers</div>
        <div>Detected</div>
      </div>

      {/* Usages table */}
      {usages.length === 0 ? (
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--border)',
          padding: '64px 24px', textAlign: 'center',
        }}>
          <Radar size={32} color="var(--text-muted)" style={{ margin: '0 auto 16px', display: 'block' }} />
          <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>
            No usages yet. Add a test usage or wait for AudD detections.
          </p>
        </div>
      ) : (
        <div>
          {usages.map((u, i) => (
            <Link key={u.id} href={`/admin/usage/${u.id}`} style={{
              display: 'grid', gridTemplateColumns: '40px 1fr 180px 120px 100px 80px',
              padding: '14px 20px', gap: 16,
              background: i % 2 === 0 ? 'var(--bg)' : 'var(--surface)',
              border: '1px solid var(--border)',
              borderTop: i === 0 ? '1px solid var(--border)' : 'none',
              textDecoration: 'none',
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
                <div style={{ fontSize: '0.88rem', fontWeight: 500, color: 'var(--text)', marginBottom: 2 }}>
                  {u.channel_name ?? 'Unknown channel'}
                  {u.is_sponsored && (
                    <span style={{
                      marginLeft: 8, fontSize: '0.65rem', color: 'var(--danger)',
                      textTransform: 'uppercase', letterSpacing: '0.08em',
                    }}>Sponsored</span>
                  )}
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  {(u.sounds as { title: string } | null)?.title ?? '—'}
                </div>
              </div>

              {/* Status */}
              <div style={{
                fontSize: '0.72rem', color: statusColor(u),
                textTransform: 'uppercase', letterSpacing: '0.08em',
              }}>
                {statusLabel(u)}
              </div>

              {/* Platform */}
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>
                {u.platform}
              </div>

              {/* Followers */}
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                {formatFollowers(u.channel_follower_count)}
              </div>

              {/* Date */}
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                {new Date(u.detected_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
              </div>
            </Link>
          ))}
        </div>
      )}

    </div>
  )
}
