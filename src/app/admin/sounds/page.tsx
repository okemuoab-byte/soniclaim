import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { AudioLines, ExternalLink } from 'lucide-react'

interface Sound {
  id: string
  title: string
  registered_at: string
  audd_track_id: string | null
  creator_id: string
  profiles: { display_name: string | null } | null
}

export default async function AdminSoundsPage() {
  const supabase = await createClient()

  const { data } = await supabase
    .from('sounds')
    .select('id, title, registered_at, audd_track_id, creator_id, profiles(display_name)')
    .order('registered_at', { ascending: false })

  const sounds: Sound[] = (data ?? []) as unknown as Sound[]

  return (
    <div style={{ padding: '48px' }}>

      <div style={{ marginBottom: 48 }}>
        <div className="eyebrow" style={{ marginBottom: 12 }}>Admin</div>
        <h1 style={{
          fontFamily: 'var(--font-instrument-serif)',
          fontSize: 'clamp(1.8rem, 3vw, 2.6rem)',
          lineHeight: 1.1, letterSpacing: '-0.02em',
        }}>
          All <em style={{ fontStyle: 'italic', color: 'var(--accent)' }}>sounds</em>
        </h1>
      </div>

      {/* Header row */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 180px 120px 100px',
        padding: '10px 20px', gap: 16,
        background: 'var(--surface)', border: '1px solid var(--border)', borderBottom: 'none',
        fontSize: '0.68rem', color: 'var(--text-muted)',
        textTransform: 'uppercase', letterSpacing: '0.1em',
      }}>
        <div>Sound / Creator</div>
        <div>Registered</div>
        <div>Monitoring</div>
        <div />
      </div>

      {sounds.length === 0 ? (
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--border)',
          padding: '64px 24px', textAlign: 'center',
        }}>
          <AudioLines size={32} color="var(--text-muted)" style={{ margin: '0 auto 16px', display: 'block' }} />
          <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>No sounds registered yet.</p>
        </div>
      ) : sounds.map((s, i) => (
        <div key={s.id} style={{
          display: 'grid', gridTemplateColumns: '1fr 180px 120px 100px',
          padding: '16px 20px', gap: 16,
          background: i % 2 === 0 ? 'var(--bg)' : 'var(--surface)',
          border: '1px solid var(--border)',
          borderTop: i === 0 ? '1px solid var(--border)' : 'none',
          alignItems: 'center',
        }}>
          <div>
            <div style={{ fontSize: '0.88rem', fontWeight: 500, color: 'var(--text)', marginBottom: 2 }}>
              {s.title}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              {(s.profiles as { display_name: string | null } | null)?.display_name ?? '—'}
            </div>
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            {new Date(s.registered_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
          </div>
          <div style={{
            fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.08em',
            color: s.audd_track_id ? 'var(--accent)' : 'var(--text-muted)',
          }}>
            {s.audd_track_id ? 'Active' : 'Pending'}
          </div>
          <Link href={`/dashboard/sounds/${s.id}`} style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            fontSize: '0.72rem', color: 'var(--text-muted)', textDecoration: 'none',
          }}>
            <ExternalLink size={11} /> View
          </Link>
        </div>
      ))}

    </div>
  )
}
