'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Mic, Building2, ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const schema = z.object({
  display_name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

type FormData = z.infer<typeof schema>

type Role = 'creator' | 'brand'

export default function SignupPage() {
  const router = useRouter()
  const supabase = createClient()

  const [step, setStep] = useState<'role' | 'credentials'>('role')
  const [role, setRole] = useState<Role | null>(null)
  const [serverError, setServerError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  function selectRole(r: Role) {
    setRole(r)
    setStep('credentials')
  }

  async function onSubmit(data: FormData) {
    if (!role) return
    setLoading(true)
    setServerError(null)

    const { error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          role,
          display_name: data.display_name,
        },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (error) {
      setServerError(error.message)
      setLoading(false)
      return
    }

    setSuccess(true)
    setLoading(false)
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

      <div style={{ width: '100%', maxWidth: '480px' }}>

        {/* ── Step 1: Role selection ── */}
        {step === 'role' && (
          <div>
            <div className="eyebrow" style={{ marginBottom: '24px' }}>Get started</div>
            <h1 style={{
              fontFamily: 'var(--font-instrument-serif)',
              fontSize: 'clamp(1.8rem, 4vw, 2.4rem)',
              lineHeight: 1.1,
              letterSpacing: '-0.02em',
              marginBottom: '12px',
              color: 'var(--text)',
            }}>
              I am a<em style={{ fontStyle: 'italic', color: 'var(--accent)' }}> …</em>
            </h1>
            <p style={{
              fontSize: '0.88rem',
              color: 'var(--text-muted)',
              marginBottom: '32px',
              lineHeight: 1.6,
            }}>
              Choose your account type to get started.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {/* Creator card */}
              <button
                onClick={() => selectRole('creator')}
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  padding: '28px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '20px',
                  transition: 'border-color 0.2s, background 0.2s',
                  borderRadius: '4px',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-hover)'
                  ;(e.currentTarget as HTMLElement).style.background = 'var(--surface-2)'
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'
                  ;(e.currentTarget as HTMLElement).style.background = 'var(--surface)'
                }}
              >
                <div style={{
                  width: '40px',
                  height: '40px',
                  background: 'var(--accent-dim)',
                  border: '1px solid var(--accent-border)',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <Mic size={20} color="var(--accent)" />
                </div>
                <div>
                  <div style={{
                    fontSize: '0.95rem',
                    fontWeight: 600,
                    color: 'var(--text)',
                    marginBottom: '6px',
                    letterSpacing: '0.01em',
                  }}>Creator</div>
                  <div style={{
                    fontSize: '0.82rem',
                    color: 'var(--text-muted)',
                    lineHeight: 1.6,
                  }}>
                    I made a sound that has spread online. I want to register, protect, and monetise it.
                  </div>
                </div>
              </button>

              {/* Brand card */}
              <button
                onClick={() => selectRole('brand')}
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  padding: '28px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '20px',
                  transition: 'border-color 0.2s, background 0.2s',
                  borderRadius: '4px',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-hover)'
                  ;(e.currentTarget as HTMLElement).style.background = 'var(--surface-2)'
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'
                  ;(e.currentTarget as HTMLElement).style.background = 'var(--surface)'
                }}
              >
                <div style={{
                  width: '40px',
                  height: '40px',
                  background: 'var(--surface-2)',
                  border: '1px solid var(--border)',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <Building2 size={20} color="var(--text-muted)" />
                </div>
                <div>
                  <div style={{
                    fontSize: '0.95rem',
                    fontWeight: 600,
                    color: 'var(--text)',
                    marginBottom: '6px',
                    letterSpacing: '0.01em',
                  }}>Brand</div>
                  <div style={{
                    fontSize: '0.82rem',
                    color: 'var(--text-muted)',
                    lineHeight: 1.6,
                  }}>
                    I represent a company or agency that wants to legally licence viral audio for campaigns.
                  </div>
                </div>
              </button>
            </div>

            <p style={{
              marginTop: '24px',
              fontSize: '0.82rem',
              color: 'var(--text-muted)',
              textAlign: 'center',
            }}>
              Already have an account?{' '}
              <Link href="/auth/login" style={{ color: 'var(--accent)', textDecoration: 'none' }}>
                Sign in
              </Link>
            </p>
          </div>
        )}

        {/* ── Step 2: Credentials ── */}
        {step === 'credentials' && !success && (
          <div>
            <button
              onClick={() => { setStep('role'); setServerError(null) }}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '0.82rem',
                marginBottom: '32px',
                padding: 0,
                transition: 'color 0.2s',
              }}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--text)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
            >
              <ArrowLeft size={14} />
              Back
            </button>

            <div className="eyebrow" style={{ marginBottom: '24px' }}>
              {role === 'creator' ? 'Creator account' : 'Brand account'}
            </div>
            <h1 style={{
              fontFamily: 'var(--font-instrument-serif)',
              fontSize: 'clamp(1.8rem, 4vw, 2.4rem)',
              lineHeight: 1.1,
              letterSpacing: '-0.02em',
              marginBottom: '32px',
              color: 'var(--text)',
            }}>
              Create your account
            </h1>

            <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Display name */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '0.78rem',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  color: 'var(--text-muted)',
                  marginBottom: '8px',
                }}>
                  {role === 'creator' ? 'Your name' : 'Company name'}
                </label>
                <input
                  {...register('display_name')}
                  placeholder={role === 'creator' ? 'e.g. Jordan Williams' : 'e.g. Acme Agency'}
                  style={{
                    width: '100%',
                    background: 'var(--surface)',
                    border: `1px solid ${errors.display_name ? 'var(--danger)' : 'var(--border)'}`,
                    borderRadius: '4px',
                    padding: '12px 16px',
                    color: 'var(--text)',
                    fontSize: '0.88rem',
                    fontFamily: 'inherit',
                    outline: 'none',
                    transition: 'border-color 0.2s',
                  }}
                  onFocus={e => !errors.display_name && (e.target.style.borderColor = 'var(--accent)')}
                  onBlur={e => !errors.display_name && (e.target.style.borderColor = 'var(--border)')}
                />
                {errors.display_name && (
                  <p style={{ fontSize: '0.78rem', color: 'var(--danger)', marginTop: '6px' }}>
                    {errors.display_name.message}
                  </p>
                )}
              </div>

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
                  placeholder="Minimum 8 characters"
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
                {loading ? 'Creating account…' : 'Create account'}
              </button>
            </form>

            <p style={{
              marginTop: '24px',
              fontSize: '0.82rem',
              color: 'var(--text-muted)',
              textAlign: 'center',
            }}>
              Already have an account?{' '}
              <Link href="/auth/login" style={{ color: 'var(--accent)', textDecoration: 'none' }}>
                Sign in
              </Link>
            </p>
          </div>
        )}

        {/* ── Success state ── */}
        {success && (
          <div style={{ textAlign: 'center' }}>
            <div style={{
              width: '48px',
              height: '48px',
              background: 'var(--accent-dim)',
              border: '1px solid var(--accent-border)',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 24px',
            }}>
              <Mic size={24} color="var(--accent)" />
            </div>
            <h2 style={{
              fontFamily: 'var(--font-instrument-serif)',
              fontSize: '1.8rem',
              letterSpacing: '-0.02em',
              marginBottom: '12px',
              color: 'var(--text)',
            }}>
              Check your email
            </h2>
            <p style={{
              fontSize: '0.88rem',
              color: 'var(--text-muted)',
              lineHeight: 1.7,
              maxWidth: '340px',
              margin: '0 auto',
            }}>
              We sent a confirmation link to your email address. Click it to activate your account and get started.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
