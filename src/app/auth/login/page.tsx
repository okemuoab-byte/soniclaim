'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Suspense } from 'react'

const schema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(1, 'Enter your password'),
})

type FormData = z.infer<typeof schema>

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirectTo') ?? null
  const supabase = createClient()

  const [serverError, setServerError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  async function onSubmit(data: FormData) {
    setLoading(true)
    setServerError(null)

    const { error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    })

    if (error) {
      setServerError('Incorrect email or password.')
      setLoading(false)
      return
    }

    // Fetch role to redirect correctly
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      const role = profile?.role ?? 'creator'
      const destination = redirectTo ?? (role === 'brand' ? '/marketplace' : '/dashboard')
      router.push(destination)
      router.refresh()
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 24px',
    }}>
      {/* Logo */}
      <Link href="/" style={{
        fontFamily: 'var(--font-instrument-serif)',
        fontSize: '1.4rem',
        letterSpacing: '0.08em',
        color: 'var(--text)',
        textDecoration: 'none',
        marginBottom: '48px',
      }}>
        SONIC<span style={{ color: 'var(--accent)' }}>LAIM</span>
      </Link>

      <div style={{ width: '100%', maxWidth: '420px' }}>
        <div className="eyebrow" style={{ marginBottom: '24px' }}>Welcome back</div>
        <h1 style={{
          fontFamily: 'var(--font-instrument-serif)',
          fontSize: 'clamp(1.8rem, 4vw, 2.4rem)',
          lineHeight: 1.1,
          letterSpacing: '-0.02em',
          marginBottom: '32px',
          color: 'var(--text)',
        }}>
          Sign in to <em style={{ fontStyle: 'italic', color: 'var(--accent)' }}>SONICLAIM</em>
        </h1>

        {searchParams.get('error') === 'auth_callback_failed' && (
          <div style={{
            background: 'rgba(255, 69, 69, 0.08)',
            border: '1px solid rgba(255, 69, 69, 0.3)',
            borderRadius: '4px',
            padding: '12px 16px',
            fontSize: '0.82rem',
            color: 'var(--danger)',
            marginBottom: '24px',
          }}>
            Authentication failed. Please try again.
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Email */}
          <div>
            <label style={{
              display: 'block',
              fontSize: '0.78rem',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: 'var(--text-muted)',
              marginBottom: '8px',
            }}>
              Email address
            </label>
            <input
              {...register('email')}
              type="email"
              placeholder="you@example.com"
              style={{
                width: '100%',
                background: 'var(--surface)',
                border: `1px solid ${errors.email ? 'var(--danger)' : 'var(--border)'}`,
                borderRadius: '4px',
                padding: '12px 16px',
                color: 'var(--text)',
                fontSize: '0.88rem',
                fontFamily: 'inherit',
                outline: 'none',
                transition: 'border-color 0.2s',
              }}
              onFocus={e => !errors.email && (e.target.style.borderColor = 'var(--accent)')}
              onBlur={e => !errors.email && (e.target.style.borderColor = 'var(--border)')}
            />
            {errors.email && (
              <p style={{ fontSize: '0.78rem', color: 'var(--danger)', marginTop: '6px' }}>
                {errors.email.message}
              </p>
            )}
          </div>

          {/* Password */}
          <div>
            <label style={{
              display: 'block',
              fontSize: '0.78rem',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: 'var(--text-muted)',
              marginBottom: '8px',
            }}>
              Password
            </label>
            <input
              {...register('password')}
              type="password"
              placeholder="Your password"
              style={{
                width: '100%',
                background: 'var(--surface)',
                border: `1px solid ${errors.password ? 'var(--danger)' : 'var(--border)'}`,
                borderRadius: '4px',
                padding: '12px 16px',
                color: 'var(--text)',
                fontSize: '0.88rem',
                fontFamily: 'inherit',
                outline: 'none',
                transition: 'border-color 0.2s',
              }}
              onFocus={e => !errors.password && (e.target.style.borderColor = 'var(--accent)')}
              onBlur={e => !errors.password && (e.target.style.borderColor = 'var(--border)')}
            />
            {errors.password && (
              <p style={{ fontSize: '0.78rem', color: 'var(--danger)', marginTop: '6px' }}>
                {errors.password.message}
              </p>
            )}
          </div>

          {serverError && (
            <div style={{
              background: 'rgba(255, 69, 69, 0.08)',
              border: '1px solid rgba(255, 69, 69, 0.3)',
              borderRadius: '4px',
              padding: '12px 16px',
              fontSize: '0.82rem',
              color: 'var(--danger)',
            }}>
              {serverError}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              background: loading ? 'var(--accent-muted)' : 'var(--accent)',
              color: '#000',
              border: 'none',
              borderRadius: '4px',
              padding: '14px 32px',
              fontSize: '0.9rem',
              fontWeight: 600,
              fontFamily: 'inherit',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
              transition: 'opacity 0.2s, transform 0.2s',
              letterSpacing: '0.02em',
              marginTop: '4px',
            }}
            onMouseEnter={e => !loading && (e.currentTarget.style.opacity = '0.88')}
            onMouseLeave={e => !loading && (e.currentTarget.style.opacity = '1')}
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p style={{
          marginTop: '24px',
          fontSize: '0.82rem',
          color: 'var(--text-muted)',
          textAlign: 'center',
        }}>
          No account yet?{' '}
          <Link href="/auth/signup" style={{ color: 'var(--accent)', textDecoration: 'none' }}>
            Create one
          </Link>
        </p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
