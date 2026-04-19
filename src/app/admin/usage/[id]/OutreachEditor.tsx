'use client'

import { useState } from 'react'
import { Mail, Sparkles, Send, CheckCircle2 } from 'lucide-react'

type OutreachStatus =
  | 'pending' | 'organic' | 'draft' | 'approved'
  | 'sent' | 'followed_up' | 'responded' | 'licensed'
  | 'escalated' | 'dismissed'

interface Draft {
  id: string
  subject: string
  body: string
  sent_at: string | null
}

interface Props {
  usageId: string
  currentStatus: OutreachStatus
  currentClassification: string | null
  existingDraft: Draft | null
}

const STATUS_ACTIONS: { status: OutreachStatus; label: string; color: string }[] = [
  { status: 'followed_up', label: 'Mark: Followed up', color: 'var(--pending)' },
  { status: 'responded', label: 'Mark: Responded', color: 'var(--accent)' },
  { status: 'licensed', label: 'Mark: Licensed ✓', color: 'var(--accent)' },
  { status: 'escalated', label: 'Escalate', color: 'var(--danger)' },
  { status: 'dismissed', label: 'Dismiss', color: 'var(--text-muted)' },
]

const CLASSIFICATIONS = [
  { value: 'COMMERCIAL', label: 'Commercial', color: 'var(--danger)' },
  { value: 'ORGANIC', label: 'Organic', color: 'var(--text-muted)' },
  { value: 'AMBIGUOUS', label: 'Ambiguous', color: 'var(--pending)' },
]

export default function OutreachEditor({ usageId, currentStatus, currentClassification, existingDraft }: Props) {
  const [classification, setClassification] = useState(currentClassification)
  const [classReason, setClassReason] = useState('')
  const [status, setStatus] = useState(currentStatus)

  const [subject, setSubject] = useState(existingDraft?.subject ?? '')
  const [body, setBody] = useState(existingDraft?.body ?? '')
  const [draftId, setDraftId] = useState(existingDraft?.id ?? null)
  const [sentAt, setSentAt] = useState(existingDraft?.sent_at ?? null)

  const [recipientEmail, setRecipientEmail] = useState('')

  const [generating, setGenerating] = useState(false)
  const [classifying, setClassifying] = useState(false)
  const [sending, setSending] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null)

  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  function flash(msg: string) {
    setNotice(msg)
    setTimeout(() => setNotice(null), 3000)
  }

  async function classify(value: string) {
    setClassifying(true)
    setError(null)
    const res = await fetch(`/api/admin/usages/${usageId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ classification: value, classification_reason: classReason || null }),
    })
    setClassifying(false)
    if (!res.ok) { setError('Failed to classify.'); return }
    setClassification(value)
    flash(`Classified as ${value}`)
  }

  async function generateDraft() {
    setGenerating(true)
    setError(null)
    const res = await fetch(`/api/admin/usages/${usageId}/draft`, { method: 'POST' })
    setGenerating(false)
    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      setError(d.error ?? 'Draft generation failed.')
      return
    }
    const data = await res.json()
    setSubject(data.subject)
    setBody(data.body)
    setDraftId(data.draftId)
    setStatus('draft')
    flash('Draft generated.')
  }

  async function sendEmail() {
    if (!recipientEmail) { setError('Enter the brand email address.'); return }
    if (!subject || !body) { setError('Draft subject and body are required.'); return }
    setSending(true)
    setError(null)
    const res = await fetch(`/api/admin/usages/${usageId}/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subject, body, recipientEmail, draftId }),
    })
    setSending(false)
    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      setError(d.error ?? 'Send failed.')
      return
    }
    setStatus('sent')
    setSentAt(new Date().toISOString())
    flash('Email sent.')
  }

  async function updateStatus(newStatus: OutreachStatus) {
    setUpdatingStatus(newStatus)
    setError(null)
    const res = await fetch(`/api/admin/usages/${usageId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ outreach_status: newStatus }),
    })
    setUpdatingStatus(null)
    if (!res.ok) { setError('Status update failed.'); return }
    setStatus(newStatus)
    flash(`Status: ${newStatus}`)
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: 'var(--bg)',
    border: '1px solid var(--border)',
    borderRadius: 4,
    padding: '10px 14px',
    color: 'var(--text)',
    fontSize: '0.85rem',
    outline: 'none',
    fontFamily: 'inherit',
  }

  const isCommercial = classification === 'COMMERCIAL'
  const isSent = ['sent', 'followed_up', 'responded', 'licensed'].includes(status)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>

      {/* Feedback banner */}
      {notice && (
        <div style={{
          background: 'var(--accent-dim2)', border: '1px solid var(--accent-border)',
          padding: '10px 16px', fontSize: '0.82rem', color: 'var(--accent)',
          display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8,
        }}>
          <CheckCircle2 size={14} /> {notice}
        </div>
      )}
      {error && (
        <div style={{
          background: 'rgba(255,69,69,0.06)', border: '1px solid rgba(255,69,69,0.25)',
          padding: '10px 16px', fontSize: '0.82rem', color: 'var(--danger)', marginBottom: 8,
        }}>
          {error}
        </div>
      )}

      {/* ── Classification ── */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', padding: 24 }}>
        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 14 }}>
          Classification
        </div>
        <div style={{ display: 'flex', gap: 8, marginBottom: classification ? 0 : 12 }}>
          {CLASSIFICATIONS.map(c => (
            <button
              key={c.value}
              onClick={() => classify(c.value)}
              disabled={classifying}
              style={{
                padding: '8px 16px', borderRadius: 4, border: '1px solid',
                fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer',
                borderColor: classification === c.value ? c.color : 'var(--border)',
                background: classification === c.value ? 'var(--accent-dim2)' : 'var(--bg)',
                color: classification === c.value ? c.color : 'var(--text-muted)',
                transition: 'all 0.15s',
              }}
            >
              {c.label}
            </button>
          ))}
        </div>
        {!classification && (
          <div>
            <input
              value={classReason}
              onChange={e => setClassReason(e.target.value)}
              placeholder="Optional: reason for classification"
              style={{ ...inputStyle, marginTop: 10, fontSize: '0.78rem' }}
            />
          </div>
        )}
      </div>

      {/* ── Outreach draft (only for COMMERCIAL) ── */}
      {isCommercial && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Mail size={16} color="var(--accent)" />
              <span style={{ fontSize: '0.88rem', fontWeight: 500 }}>Outreach email</span>
            </div>
            {!isSent && (
              <button
                onClick={generateDraft}
                disabled={generating}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  background: 'var(--accent-dim)', border: '1px solid var(--accent-border)',
                  color: 'var(--accent)', borderRadius: 4, padding: '7px 14px',
                  fontSize: '0.78rem', fontWeight: 600, cursor: generating ? 'not-allowed' : 'pointer',
                  opacity: generating ? 0.7 : 1,
                }}
              >
                <Sparkles size={13} />
                {generating ? 'Generating…' : draftId ? 'Regenerate' : 'Generate with AI'}
              </button>
            )}
          </div>

          {sentAt ? (
            <div style={{ fontSize: '0.82rem', color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <CheckCircle2 size={14} /> Sent {new Date(sentAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>
                  Brand email address
                </div>
                <input
                  type="email"
                  value={recipientEmail}
                  onChange={e => setRecipientEmail(e.target.value)}
                  placeholder="hello@brand.com"
                  style={inputStyle}
                />
              </div>

              <div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>
                  Subject
                </div>
                <input
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  placeholder={generating ? 'Generating…' : 'Email subject'}
                  style={inputStyle}
                />
              </div>

              <div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>
                  Body
                </div>
                <textarea
                  value={body}
                  onChange={e => setBody(e.target.value)}
                  rows={12}
                  placeholder={generating ? 'Generating…' : 'Email body — edit freely before sending'}
                  style={{ ...inputStyle, resize: 'vertical', minHeight: 220, lineHeight: 1.7 }}
                />
              </div>

              <button
                onClick={sendEmail}
                disabled={sending || !subject || !body}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  background: 'var(--accent)', color: '#000', border: 'none',
                  borderRadius: 4, padding: '12px 24px',
                  fontSize: '0.88rem', fontWeight: 600,
                  cursor: sending || !subject || !body ? 'not-allowed' : 'pointer',
                  opacity: sending || !subject || !body ? 0.6 : 1,
                }}
              >
                <Send size={14} />
                {sending ? 'Sending…' : 'Send email'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Status actions ── */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', padding: 24 }}>
        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 14 }}>
          Update status
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {STATUS_ACTIONS.map(a => (
            <button
              key={a.status}
              onClick={() => updateStatus(a.status)}
              disabled={updatingStatus !== null || status === a.status}
              style={{
                padding: '8px 14px', borderRadius: 4,
                border: `1px solid ${status === a.status ? a.color : 'var(--border)'}`,
                background: status === a.status ? 'var(--accent-dim2)' : 'var(--bg)',
                color: status === a.status ? a.color : 'var(--text-muted)',
                fontSize: '0.75rem', cursor: status === a.status ? 'default' : 'pointer',
                opacity: updatingStatus !== null && updatingStatus !== a.status ? 0.5 : 1,
              }}
            >
              {updatingStatus === a.status ? '…' : a.label}
            </button>
          ))}
        </div>
      </div>

    </div>
  )
}
