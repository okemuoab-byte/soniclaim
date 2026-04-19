'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Radar, AudioLines, Plus } from 'lucide-react'

const items = [
  { label: 'Pipeline', href: '/admin', icon: Radar, exact: true },
  { label: 'Sounds', href: '/admin/sounds', icon: AudioLines, exact: false },
  { label: 'New usage', href: '/admin/usage/new', icon: Plus, exact: false },
]

export default function AdminNav() {
  const pathname = usePathname()
  return (
    <nav style={{ flex: 1, padding: '16px 0' }}>
      {items.map(({ label, href, icon: Icon, exact }) => {
        const active = exact ? pathname === href : pathname.startsWith(href)
        return (
          <Link key={href} href={href} style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '12px 24px', fontSize: '0.85rem',
            color: active ? 'var(--accent)' : 'var(--text-muted)',
            textDecoration: 'none',
            borderLeft: `2px solid ${active ? 'var(--accent)' : 'transparent'}`,
            background: active ? 'var(--accent-dim2)' : 'transparent',
          }}>
            <Icon size={16} />
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
