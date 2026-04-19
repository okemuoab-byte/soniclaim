'use client'

import { Award } from 'lucide-react'

export default function GenerateCertificateButton({ soundId }: { soundId: string }) {
  return (
    <button
      onClick={async () => {
        const res = await fetch(`/api/sounds/${soundId}/certificate`, { method: 'POST' })
        if (res.ok) window.location.reload()
      }}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        background: 'var(--surface-2)',
        color: 'var(--text)',
        border: '1px solid var(--border)',
        padding: '10px 16px',
        borderRadius: 4,
        fontSize: '0.82rem',
        cursor: 'pointer',
        width: '100%',
        justifyContent: 'center',
      }}
    >
      <Award size={14} /> Generate certificate
    </button>
  )
}
