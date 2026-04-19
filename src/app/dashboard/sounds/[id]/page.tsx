import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, AudioLines, Award, Radar, Download,
  ExternalLink, AlertTriangle, Users,
  Clock, Mail,
} from 'lucide-react'
import WaveformPlayer from './WaveformPlayer'
import GenerateCertificateButton from './GenerateCertificateButton'

// ─── Types ────────────────────────────────────────────────────────────────────

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
  classification_reason: string | null
  outreach_status: OutreachStatus
  detected_at: string
  is_sponsored: boolean
}

interface Sound {
  id: string
  title: string
  description: string | null
  file_url: string
  file_hash: string
  duration_seconds: number | null
  created_by_date: string
  registered_at: string
  is_available_for_licensing: boolean
  audd_track_id: string | null
}

interface Certificate {
  id: string
  certificate_url: string | null
  issued_at: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

function formatFollowers(n: number | null): string {
  if (!n) return '—'
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`
  return String(n)
}

const platformIcon: Record<string, string> = {
  tiktok: 'TK',
  instagram: 'IG',
  youtube: 'YT',
}

// ─── Status dot ───────────────────────────────────────────────────────────────

function UsageStatusDot({ status, classification }: { status: OutreachStatus; classification: Classification | null }) {
  let color = 'var(--text-muted)'
  let label = 'Pending'
  let pulse = false

  if (classification === 'ORGANIC') {
    color = 'var(--text-muted)'; label = 'Organic'
  } else if (classification === 'COMMERCIAL') {
    switch (status) {
      case 'draft':
      case 'approved':
        color = 'var(--pending)'; label = 'Outreach queued'; break
      case 'sent':
      case 'followed_up':
        color = 'var(--pending)'; label = 'Outreach sent'; pulse = true; break
      case 'responded':
        color = 'var(--accent)'; label = 'Brand responded'; break
      case 'licensed':
        color = 'var(--accent)'; label = 'Licensed'; break
      case 'escalated':
        color = 'var(--danger)'; label = 'Escalated'; break
      case 'dismissed':
        color = 'var(--text-muted)'; label = 'Dismissed'; break
      default:
        color = 'var(--danger)'; label = 'Commercial use'
    }
  } else if (classification === 'AMBIGUOUS') {
    color = 'var(--pending)'; label = 'Under review'
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div className={pulse ? 'status-live' : ''} style={{
        width: 6,
        height: 6,
        borderRadius: '50%',
        background: color,
        flexShrink: 0,
      }} />
      <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.1em', color }}>
        {label}
      </span>
    </div>
  )
}

// ─── Classification badge ─────────────────────────────────────────────────────

function ClassificationIcon({ c }: { c: Classification | null }) {
  if (c === 'COMMERCIAL') return <AlertTriangle size={14} color="var(--danger)" />
  if (c === 'ORGANIC') return <Users size={14} color="var(--text-muted)" />
  return <Clock size={14} color="var(--pending)" />
}

// ─── Outreach status label (creator-facing) ───────────────────────────────────

function outreachLabel(status: OutreachStatus): string | null {
  const map: Partial<Record<OutreachStatus, string>> = {
    sent: "We've reached out to this brand.",
    followed_up: "Follow-up sent. Awaiting response.",
    responded: "Brand has responded — deal in progress.",
    licensed: "Deal closed. Payment incoming.",
    escalated: "Escalated to platform reporting.",
  }
  return map[status] ?? null
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function SoundDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // Fetch sound
  const { data: sound, error } = await supabase
    .from('sounds')
    .select('*')
    .eq('id', id)
    .eq('creator_id', user.id)
    .single()

  if (error || !sound) notFound()

  // Fetch usages
  const { data: usages } = await supabase
    .from('usages')
    .select('*')
    .eq('sound_id', id)
    .order('detected_at', { ascending: false })

  // Fetch certificate
  const { data: certificate } = await supabase
    .from('certificates')
    .select('*')
    .eq('sound_id', id)
    .single()

  const typedSound = sound as Sound
  const typedUsages: Usage[] = (usages ?? []) as Usage[]
  const typedCert: Certificate | null = certificate as Certificate | null

  const commercialCount = typedUsages.filter(u => u.classification === 'COMMERCIAL').length
  const organicCount = typedUsages.filter(u => u.classification === 'ORGANIC').length
  const licensedCount = typedUsages.filter(u => u.outreach_status === 'licensed').length

  const sidebarNavItems = [
    { label: 'My Sounds', href: '/dashboard' },
    { label: 'Upload Sound', href: '/dashboard/upload' },
    { label: 'Usage Feed', href: '/dashboard/feed' },
    { label: 'Earnings', href: '/dashboard/earnings' },
  ]

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg)' }}>

      {/* Sidebar */}
      <aside style={{
        width: 240,
        background: 'var(--surface)',
        borderRight: '1px solid var(--border)',
        position: 'fixed',
        top: 0, left: 0, bottom: 0,
        display: 'flex', flexDirection: 'column',
        zIndex: 50,
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
          <Link href="/dashboard" style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '12px 24px', fontSize: '0.82rem',
            color: 'var(--text-muted)', textDecoration: 'none',
            borderLeft: '2px solid transparent',
          }}>
            <ArrowLeft size={14} /> Back to sounds
          </Link>
          {sidebarNavItems.slice(1).map(item => (
            <Link key={item.href} href={item.href} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '12px 24px', fontSize: '0.85rem',
              color: 'var(--text-muted)', textDecoration: 'none',
              borderLeft: '2px solid transparent',
            }}>
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>

      {/* Main */}
      <main style={{ marginLeft: 240, flex: 1, padding: '48px' }}>

        {/* Header */}
        <div style={{ marginBottom: 40 }}>
          <div className="eyebrow" style={{ marginBottom: 12 }}>Sound detail</div>
          <h1 style={{
            fontFamily: 'var(--font-instrument-serif)',
            fontSize: 'clamp(1.8rem, 3vw, 2.6rem)',
            lineHeight: 1.1, letterSpacing: '-0.02em', marginBottom: 8,
          }}>
            {typedSound.title}
          </h1>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            Registered {formatDate(typedSound.registered_at)}
            {typedSound.duration_seconds && ` · ${Math.round(typedSound.duration_seconds)}s`}
            {typedSound.audd_track_id && (
              <span style={{ color: 'var(--accent)', marginLeft: 12 }}>
                ● Monitoring active
              </span>
            )}
          </p>
        </div>

        {/* Waveform player */}
        <WaveformPlayer
          fileUrl={typedSound.file_url}
          title={typedSound.title}
        />

        {/* Stats row */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 2,
          marginBottom: 40,
        }}>
          {[
            { label: 'Total detections', value: String(typedUsages.length) },
            { label: 'Commercial uses', value: String(commercialCount), accent: commercialCount > 0 },
            { label: 'Organic uses', value: String(organicCount) },
            { label: 'Deals closed', value: String(licensedCount), accent: licensedCount > 0 },
          ].map(s => (
            <div key={s.label} style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              padding: '20px 24px',
            }}>
              <div style={{
                fontFamily: 'var(--font-instrument-serif)',
                fontSize: '1.8rem',
                color: s.accent ? 'var(--accent)' : 'var(--text)',
                lineHeight: 1, marginBottom: 4,
              }}>{s.value}</div>
              <div style={{
                fontSize: '0.72rem', color: 'var(--text-muted)',
                textTransform: 'uppercase', letterSpacing: '0.08em',
              }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Two-column layout */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 2 }}>

          {/* Usage feed */}
          <div>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '16px 24px',
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderBottom: 'none',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Radar size={16} color="var(--text-muted)" />
                <span style={{ fontSize: '0.82rem', fontWeight: 500 }}>Detected usages</span>
              </div>
              <span style={{
                fontSize: '0.72rem', color: 'var(--text-muted)',
                textTransform: 'uppercase', letterSpacing: '0.08em',
              }}>
                {typedUsages.length} total
              </span>
            </div>

            {typedUsages.length === 0 ? (
              <div style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                padding: '48px 24px',
                textAlign: 'center',
              }}>
                <Radar size={32} color="var(--text-muted)" style={{ margin: '0 auto 16px', display: 'block' }} />
                <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                  Monitoring active. Detections will appear here as they come in.
                </p>
              </div>
            ) : (
              <div>
                {typedUsages.map((usage, i) => {
                  const creatorLabel = outreachLabel(usage.outreach_status)
                  return (
                    <div key={usage.id} style={{
                      background: usage.classification === 'COMMERCIAL' ? 'var(--surface)' : 'var(--bg)',
                      border: '1px solid var(--border)',
                      borderTop: i === 0 ? '1px solid var(--border)' : 'none',
                      padding: '16px 24px',
                    }}>
                      <div style={{
                        display: 'flex', alignItems: 'flex-start',
                        justifyContent: 'space-between', gap: 16,
                      }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, flex: 1 }}>
                          {/* Platform badge */}
                          <div style={{
                            width: 32, height: 32, borderRadius: 4,
                            background: 'var(--surface-2)',
                            border: '1px solid var(--border)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '0.65rem', fontWeight: 700,
                            color: 'var(--text-muted)', flexShrink: 0,
                          }}>
                            {platformIcon[usage.platform] ?? usage.platform.slice(0, 2).toUpperCase()}
                          </div>

                          <div style={{ flex: 1 }}>
                            <div style={{
                              display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4,
                            }}>
                              <ClassificationIcon c={usage.classification} />
                              <span style={{ fontSize: '0.88rem', fontWeight: 500 }}>
                                {usage.channel_name ?? 'Unknown channel'}
                              </span>
                              {usage.channel_follower_count && (
                                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                  {formatFollowers(usage.channel_follower_count)} followers
                                </span>
                              )}
                            </div>

                            {usage.classification_reason && (
                              <p style={{
                                fontSize: '0.78rem', color: 'var(--text-muted)',
                                lineHeight: 1.5, marginBottom: 6,
                              }}>
                                {usage.classification_reason}
                              </p>
                            )}

                            {creatorLabel && (
                              <div style={{
                                fontSize: '0.75rem',
                                color: 'var(--accent)',
                                display: 'flex', alignItems: 'center', gap: 6,
                              }}>
                                <Mail size={11} />
                                {creatorLabel}
                              </div>
                            )}
                          </div>
                        </div>

                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <UsageStatusDot
                            status={usage.outreach_status}
                            classification={usage.classification}
                          />
                          <div style={{
                            fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 6,
                          }}>
                            {formatDate(usage.detected_at)}
                          </div>
                          {usage.external_url && (
                            <a
                              href={usage.external_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                display: 'inline-flex', alignItems: 'center', gap: 4,
                                fontSize: '0.7rem', color: 'var(--text-muted)',
                                textDecoration: 'none', marginTop: 4,
                              }}
                            >
                              View post <ExternalLink size={10} />
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Right column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>

            {/* Certificate card */}
            <div style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              padding: '24px',
            }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16,
              }}>
                <Award size={18} color="var(--accent)" />
                <span style={{ fontSize: '0.88rem', fontWeight: 500 }}>Ownership Certificate</span>
              </div>

              {typedCert?.certificate_url ? (
                <>
                  <p style={{
                    fontSize: '0.78rem', color: 'var(--text-muted)',
                    lineHeight: 1.6, marginBottom: 16,
                  }}>
                    Issued {formatDate(typedCert.issued_at)}. This certificate confirms your timestamped ownership claim.
                  </p>
                  <a
                    href={typedCert.certificate_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      background: 'var(--accent)', color: '#000',
                      padding: '10px 16px', borderRadius: 4,
                      fontWeight: 600, fontSize: '0.82rem',
                      textDecoration: 'none', width: '100%',
                      justifyContent: 'center',
                    }}
                  >
                    <Download size={14} /> Download PDF
                  </a>
                </>
              ) : (
                <div>
                  <p style={{
                    fontSize: '0.78rem', color: 'var(--text-muted)',
                    lineHeight: 1.6, marginBottom: 16,
                  }}>
                    Certificate is being generated. Refresh in a moment.
                  </p>
                  <GenerateCertificateButton soundId={id} />
                </div>
              )}
            </div>

            {/* Fingerprint card */}
            <div style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              padding: '24px',
            }}>
              <div style={{
                fontSize: '0.72rem', color: 'var(--accent)',
                textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 10,
              }}>
                SHA-256 Fingerprint
              </div>
              <div style={{
                fontFamily: 'var(--font-geist-mono)',
                fontSize: '0.65rem', color: 'var(--text-muted)',
                wordBreak: 'break-all', lineHeight: 1.6,
              }}>
                {typedSound.file_hash}
              </div>
            </div>

            {/* Sound info */}
            <div style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              padding: '24px',
            }}>
              <div style={{
                fontSize: '0.72rem', color: 'var(--text-muted)',
                textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 16,
              }}>
                Details
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  { label: 'Created', value: formatDate(typedSound.created_by_date) },
                  { label: 'Registered', value: formatDate(typedSound.registered_at) },
                  typedSound.duration_seconds
                    ? { label: 'Duration', value: `${Math.round(typedSound.duration_seconds)}s` }
                    : null,
                  { label: 'Monitoring', value: typedSound.audd_track_id ? 'Active' : 'Pending' },
                ].filter(Boolean).map(row => row && (
                  <div key={row.label} style={{
                    display: 'flex', justifyContent: 'space-between',
                    fontSize: '0.78rem',
                  }}>
                    <span style={{ color: 'var(--text-muted)' }}>{row.label}</span>
                    <span style={{
                      color: row.label === 'Monitoring' && typedSound.audd_track_id
                        ? 'var(--accent)' : 'var(--text)',
                    }}>{row.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Description */}
            {typedSound.description && (
              <div style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                padding: '24px',
              }}>
                <div style={{
                  fontSize: '0.72rem', color: 'var(--text-muted)',
                  textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 10,
                }}>
                  Description
                </div>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.7 }}>
                  {typedSound.description}
                </p>
              </div>
            )}

          </div>
        </div>
      </main>
    </div>
  )
}

