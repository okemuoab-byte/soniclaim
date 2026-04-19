import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ExternalLink, ArrowLeft, AlertTriangle, Users, Clock } from 'lucide-react'
import OutreachEditor from './OutreachEditor'

function formatFollowers(n: number | null) {
  if (!n) return '—'
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`
  return String(n)
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}

const platformLabel: Record<string, string> = { tiktok: 'TikTok', instagram: 'Instagram', youtube: 'YouTube' }

export default async function AdminUsagePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  // Parallel fetches
  const [usageResult, draftResult] = await Promise.all([
    supabase.from('usages').select('*').eq('id', id).single(),
    supabase.from('outreach_drafts').select('id, subject, body, sent_at').eq('usage_id', id)
      .order('created_at', { ascending: false }).limit(1).maybeSingle(),
  ])

  if (usageResult.error || !usageResult.data) notFound()

  const usage = usageResult.data
  const draft = draftResult.data ?? null

  // Fetch sound + creator
  const { data: soundData } = await supabase
    .from('sounds')
    .select('id, title, profiles(display_name)')
    .eq('id', usage.sound_id)
    .single()

  const sound = soundData as { id: string; title: string; profiles: { display_name: string | null } | null } | null

  const classIcon = usage.classification === 'COMMERCIAL'
    ? <AlertTriangle size={14} color="var(--danger)" />
    : usage.classification === 'ORGANIC'
      ? <Users size={14} color="var(--text-muted)" />
      : <Clock size={14} color="var(--pending)" />

  return (
    <div style={{ padding: '48px' }}>

      {/* Header */}
      <div style={{ marginBottom: 40 }}>
        <Link href="/admin" style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          fontSize: '0.82rem', color: 'var(--text-muted)', textDecoration: 'none', marginBottom: 20,
        }}>
          <ArrowLeft size={14} /> Back to pipeline
        </Link>
        <div className="eyebrow" style={{ marginBottom: 12 }}>Usage detail</div>
        <h1 style={{
          fontFamily: 'var(--font-instrument-serif)',
          fontSize: 'clamp(1.6rem, 3vw, 2.2rem)',
          lineHeight: 1.1, letterSpacing: '-0.02em',
        }}>
          {usage.channel_name ?? 'Unknown channel'}
          {' '}
          <span style={{ color: 'var(--text-muted)', fontStyle: 'normal', fontSize: '60%' }}>
            on {platformLabel[usage.platform] ?? usage.platform}
          </span>
        </h1>
      </div>

      {/* Two-column layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 2, alignItems: 'start' }}>

        {/* Left: context */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>

          {/* Detection info */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', padding: 24 }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 16 }}>
              Detection
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                { label: 'Platform', value: platformLabel[usage.platform] ?? usage.platform },
                { label: 'Channel', value: usage.channel_name ?? '—' },
                { label: 'Followers', value: formatFollowers(usage.channel_follower_count) },
                { label: 'Account type', value: usage.account_type ?? '—' },
                { label: 'Sponsored', value: usage.is_sponsored ? 'Yes' : 'No' },
                { label: 'Detected', value: formatDate(usage.detected_at) },
              ].map(row => (
                <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>{row.label}</span>
                  <span style={{ color: 'var(--text)' }}>{row.value}</span>
                </div>
              ))}
            </div>

            {usage.external_url && (
              <a
                href={usage.external_url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  marginTop: 20, fontSize: '0.78rem', color: 'var(--accent)', textDecoration: 'none',
                }}
              >
                <ExternalLink size={13} /> View original post
              </a>
            )}
          </div>

          {/* Classification */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', padding: 24 }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 12 }}>
              AI Classification
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: usage.classification_reason ? 10 : 0 }}>
              {classIcon}
              <span style={{ fontSize: '0.88rem', fontWeight: 500 }}>
                {usage.classification ?? 'Unclassified'}
              </span>
            </div>
            {usage.classification_reason && (
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.6, marginTop: 8 }}>
                {usage.classification_reason}
              </p>
            )}
          </div>

          {/* Sound */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', padding: 24 }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 12 }}>
              Sound
            </div>
            {sound ? (
              <div>
                <div style={{ fontSize: '0.92rem', fontWeight: 500, marginBottom: 4 }}>{sound.title}</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 12 }}>
                  by {(sound.profiles as { display_name: string | null } | null)?.display_name ?? '—'}
                </div>
                <Link href={`/dashboard/sounds/${sound.id}`} style={{
                  fontSize: '0.75rem', color: 'var(--text-muted)', textDecoration: 'none',
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                }}>
                  <ExternalLink size={11} /> View sound page
                </Link>
              </div>
            ) : (
              <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Sound not found</span>
            )}
          </div>

          {/* Post caption */}
          {usage.post_caption && (
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', padding: 24 }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 12 }}>
                Post caption
              </div>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.7 }}>
                {usage.post_caption}
              </p>
            </div>
          )}

        </div>

        {/* Right: outreach editor */}
        <OutreachEditor
          usageId={id}
          currentStatus={usage.outreach_status}
          currentClassification={usage.classification}
          existingDraft={draft}
        />

      </div>
    </div>
  )
}
