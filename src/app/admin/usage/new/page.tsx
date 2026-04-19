import { createClient } from '@/lib/supabase/server'
import CreateUsageForm from './CreateUsageForm'

export default async function NewUsagePage() {
  const supabase = await createClient()

  const { data } = await supabase
    .from('sounds')
    .select('id, title')
    .order('registered_at', { ascending: false })

  const sounds = (data ?? []) as { id: string; title: string }[]

  return (
    <div style={{ padding: '48px' }}>
      <div style={{ marginBottom: 48, maxWidth: 600 }}>
        <div className="eyebrow" style={{ marginBottom: 12 }}>Admin</div>
        <h1 style={{
          fontFamily: 'var(--font-instrument-serif)',
          fontSize: 'clamp(1.8rem, 3vw, 2.6rem)',
          lineHeight: 1.1, letterSpacing: '-0.02em', marginBottom: 12,
        }}>
          Add <em style={{ fontStyle: 'italic', color: 'var(--accent)' }}>usage</em>
        </h1>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
          Manually register a detected or known usage. Use this for testing or for cases AudD misses.
        </p>
      </div>

      {sounds.length === 0 ? (
        <div style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>
          No sounds registered yet. A creator needs to upload one first.
        </div>
      ) : (
        <div style={{ maxWidth: 600 }}>
          <CreateUsageForm sounds={sounds} />
        </div>
      )}
    </div>
  )
}
