import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import AdminNav from './AdminNav'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, display_name')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') redirect('/dashboard')

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg)' }}>

      <aside style={{
        width: 240,
        background: 'var(--surface)',
        borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column',
        position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 50,
      }}>
        <div style={{ padding: '28px 24px', borderBottom: '1px solid var(--border)' }}>
          <Link href="/" style={{
            fontFamily: 'var(--font-instrument-serif)',
            fontSize: '1.3rem', letterSpacing: '0.08em',
            color: 'var(--text)', textDecoration: 'none',
            display: 'block',
          }}>
            SONIC<span style={{ color: 'var(--accent)' }}>LAIM</span>
          </Link>
          <div style={{
            fontSize: '0.65rem', color: 'var(--danger)',
            textTransform: 'uppercase', letterSpacing: '0.14em',
            marginTop: 6, fontWeight: 600,
          }}>
            Admin
          </div>
        </div>

        <AdminNav />

        <div style={{
          padding: '16px 24px', borderTop: '1px solid var(--border)',
          fontSize: '0.78rem', color: 'var(--text-muted)',
        }}>
          <div style={{ color: 'var(--text)', fontWeight: 500, marginBottom: 2, fontSize: '0.85rem' }}>
            {profile?.display_name}
          </div>
          Admin account
        </div>
      </aside>

      <main style={{ marginLeft: 240, flex: 1 }}>
        {children}
      </main>

    </div>
  )
}
