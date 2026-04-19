'use client'

import React, { useEffect, useRef } from 'react'
import Link from 'next/link'
import { Mic, FileCheck, ScanSearch, Banknote } from 'lucide-react'

export default function LandingPage() {
  const cursorRef = useRef<HTMLDivElement>(null)
  const ringRef = useRef<HTMLDivElement>(null)
  const navRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const cursor = cursorRef.current
    const ring = ringRef.current
    if (!cursor || !ring) return

    let mx = 0, my = 0, rx = 0, ry = 0
    let raf: number

    const onMove = (e: MouseEvent) => {
      mx = e.clientX
      my = e.clientY
      cursor.style.left = mx + 'px'
      cursor.style.top = my + 'px'
    }

    const animateRing = () => {
      rx += (mx - rx) * 0.12
      ry += (my - ry) * 0.12
      ring.style.left = rx + 'px'
      ring.style.top = ry + 'px'
      raf = requestAnimationFrame(animateRing)
    }

    document.addEventListener('mousemove', onMove)
    raf = requestAnimationFrame(animateRing)

    const interactables = document.querySelectorAll('a, button, input')
    const expand = () => {
      cursor.style.width = '6px'
      cursor.style.height = '6px'
      ring.style.width = '50px'
      ring.style.height = '50px'
      ring.style.opacity = '0.3'
    }
    const shrink = () => {
      cursor.style.width = '10px'
      cursor.style.height = '10px'
      ring.style.width = '36px'
      ring.style.height = '36px'
      ring.style.opacity = '0.5'
    }
    interactables.forEach(el => {
      el.addEventListener('mouseenter', expand)
      el.addEventListener('mouseleave', shrink)
    })

    return () => {
      document.removeEventListener('mousemove', onMove)
      cancelAnimationFrame(raf)
      interactables.forEach(el => {
        el.removeEventListener('mouseenter', expand)
        el.removeEventListener('mouseleave', shrink)
      })
    }
  }, [])

  useEffect(() => {
    const nav = navRef.current
    if (!nav) return
    const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 40)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Set cursor:none on body only while landing page is mounted
  useEffect(() => {
    document.body.style.cursor = 'none'
    return () => { document.body.style.cursor = '' }
  }, [])

  useEffect(() => {
    const reveals = document.querySelectorAll('.reveal')
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(e => {
          if (e.isIntersecting) {
            e.target.classList.add('visible')
            observer.unobserve(e.target)
          }
        })
      },
      { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
    )
    reveals.forEach(el => observer.observe(el))
    return () => observer.disconnect()
  }, [])

  return (
    <>
      {/* Custom cursor */}
      <div ref={cursorRef} className="cursor-dot" />
      <div ref={ringRef} className="cursor-ring" />

      {/* NAV */}
      <nav
        ref={navRef}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '24px 48px',
          borderBottom: '1px solid transparent',
          transition: 'border-color 0.3s, background 0.3s',
          cursor: 'none',
        }}
        className="nav-scrollable"
      >
        <Link href="/" style={{
          fontFamily: 'var(--font-instrument-serif)',
          fontSize: '1.4rem',
          letterSpacing: '0.08em',
          color: 'var(--text)',
          textDecoration: 'none',
        }}>
          SONIC<span style={{ color: 'var(--accent)' }}>LAIM</span>
        </Link>
        <ul style={{ display: 'flex', gap: '40px', alignItems: 'center', listStyle: 'none' }}>
          <li><a href="#how" style={navLinkStyle} onMouseEnter={e => (e.currentTarget.style.color = 'var(--text)')} onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}>How It Works</a></li>
          <li><a href="#pricing" style={navLinkStyle} onMouseEnter={e => (e.currentTarget.style.color = 'var(--text)')} onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}>Earnings</a></li>
          <li><a href="#brands" style={navLinkStyle} onMouseEnter={e => (e.currentTarget.style.color = 'var(--text)')} onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}>For Brands</a></li>
          <li>
            <Link href="/auth/signup" style={{
              background: 'var(--accent)',
              color: '#000',
              padding: '8px 20px',
              borderRadius: '4px',
              fontWeight: 600,
              fontSize: '0.82rem',
              letterSpacing: '0.06em',
              textDecoration: 'none',
              transition: 'opacity 0.2s',
            }}
              onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
              onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
            >
              Claim Your Sound
            </Link>
          </li>
        </ul>
      </nav>

      {/* HERO */}
      <section style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '140px 48px 80px',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Grid background */}
        <div style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: 'linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)',
          backgroundSize: '80px 80px',
          opacity: 0.3,
          maskImage: 'radial-gradient(ellipse 80% 60% at 50% 0%, black, transparent)',
          WebkitMaskImage: 'radial-gradient(ellipse 80% 60% at 50% 0%, black, transparent)',
          pointerEvents: 'none',
        }} />

        {/* Green glow */}
        <div style={{
          position: 'absolute',
          top: -200,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 700,
          height: 700,
          background: 'radial-gradient(circle, rgba(200,241,53,0.08) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        <div className="eyebrow" style={{ marginBottom: 32, animation: 'fadeUp 0.6s ease 0.1s both' }}>
          The rights layer for the sonic internet
        </div>

        <h1 style={{
          fontFamily: 'var(--font-instrument-serif)',
          fontSize: 'clamp(3.2rem, 7vw, 7rem)',
          lineHeight: 1.0,
          letterSpacing: '-0.02em',
          maxWidth: 900,
          animation: 'fadeUp 0.7s ease 0.2s both',
        }}>
          Your sound went viral.<br />
          Now make it <em style={{ fontStyle: 'italic', color: 'var(--accent)' }}>pay.</em>
        </h1>

        <p style={{
          marginTop: 28,
          fontSize: '1.05rem',
          color: 'var(--text-muted)',
          maxWidth: 520,
          lineHeight: 1.7,
          animation: 'fadeUp 0.7s ease 0.35s both',
        }}>
          SONICLAIM registers, protects, and monetises viral non-music audio — spoken word, vocal phrases, clips. Finally, infrastructure built for the sounds the internet actually runs on.
        </p>

        <div style={{
          display: 'flex',
          gap: 16,
          alignItems: 'center',
          marginTop: 48,
          animation: 'fadeUp 0.7s ease 0.5s both',
        }}>
          <Link href="/auth/signup" style={{
            background: 'var(--accent)',
            color: '#000',
            padding: '14px 32px',
            borderRadius: '4px',
            fontWeight: 600,
            fontSize: '0.9rem',
            letterSpacing: '0.04em',
            textDecoration: 'none',
            display: 'inline-block',
            transition: 'opacity 0.2s, transform 0.2s',
          }}
            onMouseEnter={e => { e.currentTarget.style.opacity = '0.88'; e.currentTarget.style.transform = 'translateY(-1px)' }}
            onMouseLeave={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'translateY(0)' }}
          >
            Claim Your Sound →
          </Link>
          <a href="#how" style={{
            color: 'var(--text-muted)',
            fontSize: '0.88rem',
            textDecoration: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            transition: 'color 0.2s',
            letterSpacing: '0.02em',
          }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--text)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
          >
            See how it works →
          </a>
        </div>

        {/* Ticker */}
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          borderTop: '1px solid var(--border)',
          overflow: 'hidden',
          padding: '14px 0',
          background: 'var(--surface)',
        }}>
          <div style={{
            display: 'flex',
            whiteSpace: 'nowrap',
            animation: 'ticker 30s linear infinite',
          }}>
            {[
              'AUDIO FINGERPRINTING ACROSS ALL PLATFORMS',
              'LEGAL OWNERSHIP CERTIFICATE IN MINUTES',
              'BRAND LICENSING FROM £200',
              'AUTOMATIC COMMERCIAL USE DETECTION',
              'YOU KEEP 80% OF EVERY DEAL',
              'AUDIO FINGERPRINTING ACROSS ALL PLATFORMS',
              'LEGAL OWNERSHIP CERTIFICATE IN MINUTES',
              'BRAND LICENSING FROM £200',
              'AUTOMATIC COMMERCIAL USE DETECTION',
              'YOU KEEP 80% OF EVERY DEAL',
            ].map((item, i) => (
              <span key={i} style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 16,
                padding: '0 40px',
                fontSize: '0.75rem',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: 'var(--text-muted)',
              }}>
                <span style={{ color: 'var(--accent)', fontSize: '1.2em' }}>●</span>
                {item}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* STATS BAR */}
      <div className="reveal" style={{
        borderBottom: '1px solid var(--border)',
        padding: '40px 48px',
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
      }}>
        {[
          { number: '£0', label: 'Earned by creators for viral audio, historically' },
          { number: '80%', label: 'Of every licensing deal goes directly to you' },
          { number: '72hrs', label: 'From registration to first brand outreach' },
        ].map((stat, i) => (
          <div key={i} style={{
            padding: '0 48px',
            borderRight: i < 2 ? '1px solid var(--border)' : 'none',
            paddingLeft: i === 0 ? 0 : undefined,
          }}>
            <div style={{
              fontFamily: 'var(--font-instrument-serif)',
              fontSize: '3rem',
              color: 'var(--accent)',
              lineHeight: 1,
              marginBottom: 6,
            }}>{stat.number}</div>
            <div style={{
              fontSize: '0.8rem',
              color: 'var(--text-muted)',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
            }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* PROBLEM SECTION */}
      <section id="problem" style={{ padding: '100px 48px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 80, alignItems: 'center' }}>
          <div className="reveal">
            <div style={{
              fontSize: '0.72rem',
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              color: 'var(--accent)',
              marginBottom: 48,
              display: 'flex',
              alignItems: 'center',
              gap: 12,
            }}>
              The Problem
              <span style={{ flex: 1, height: 1, background: 'var(--border)', maxWidth: 80, display: 'block' }} />
            </div>
            <h2 style={{
              fontFamily: 'var(--font-instrument-serif)',
              fontSize: 'clamp(2rem, 4vw, 3.4rem)',
              lineHeight: 1.1,
              letterSpacing: '-0.02em',
            }}>
              The internet built a billion-dollar business on your sound.<br />
              <em style={{ fontStyle: 'italic', color: 'var(--text-muted)' }}>Without paying you a thing.</em>
            </h2>
            <p style={{
              color: 'var(--text-muted)',
              lineHeight: 1.8,
              fontSize: '0.95rem',
              marginTop: 24,
            }}>
              Music has PROs, Content ID, sync licensing, neighbouring rights. A whole century of infrastructure protecting artists' work. Viral audio — the phrases, clips, and sounds that define cultural moments — has nothing. Until now.
            </p>
          </div>

          <div className="reveal" style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {[
              {
                tag: '● No detection',
                title: 'Brands use your sound in ads. You never know.',
                body: 'Commercial use of viral audio happens daily across TikTok, YouTube and Instagram. No system exists to tell you — or stop them.',
              },
              {
                tag: '● No infrastructure',
                title: "PROs and distributors weren't built for this.",
                body: 'Music rights infrastructure requires your audio to be a "song." Non-music audio falls through every crack in the system.',
              },
              {
                tag: '● No leverage',
                title: "You can't enforce what you can't prove.",
                body: "Without timestamped ownership documentation, you have no standing to demand payment — even when the law is on your side.",
              },
            ].map((card, i) => (
              <div key={i} style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                padding: '24px 28px',
                transition: 'border-color 0.2s',
              }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = '#333')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
              >
                <div style={{ fontSize: '0.68rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--danger)', marginBottom: 8 }}>{card.tag}</div>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 500, marginBottom: 6 }}>{card.title}</h4>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>{card.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" style={{ padding: '100px 48px', borderTop: '1px solid var(--border)' }}>
        <div className="reveal" style={{
          fontSize: '0.72rem',
          letterSpacing: '0.16em',
          textTransform: 'uppercase',
          color: 'var(--accent)',
          marginBottom: 48,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}>
          How It Works
          <span style={{ flex: 1, height: 1, background: 'var(--border)', maxWidth: 80, display: 'block' }} />
        </div>
        <div className="reveal" style={{ maxWidth: 600 }}>
          <h2 style={{
            fontFamily: 'var(--font-instrument-serif)',
            fontSize: 'clamp(2rem, 4vw, 3.4rem)',
            lineHeight: 1.1,
            letterSpacing: '-0.02em',
          }}>
            From upload to<br /><em style={{ fontStyle: 'italic', color: 'var(--accent)' }}>first cheque</em> in days.
          </h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 2, marginTop: 64 }}>
          {[
            { num: '01', icon: <Mic size={20} color="var(--accent)" />, title: 'Upload Your Sound', body: 'Drag and drop your audio. We generate a SHA-256 fingerprint and timestamp your ownership claim instantly.', delay: '0s' },
            { num: '02', icon: <FileCheck size={20} color="var(--accent)" />, title: 'Get Your Certificate', body: 'A legally-grounded ownership certificate is generated and stored on your dashboard. Yours to share, send, or enforce.', delay: '0.1s' },
            { num: '03', icon: <ScanSearch size={20} color="var(--accent)" />, title: 'We Monitor', body: 'AI-powered audio fingerprinting scans YouTube, TikTok, and Instagram continuously. Every usage — creator or brand — lands in your feed.', delay: '0.2s' },
            { num: '04', icon: <Banknote size={20} color="var(--accent)" />, title: 'Get Paid', body: 'When a brand is detected or reaches out, we handle the outreach, the contract, and the collection. You see money in your account.', delay: '0.3s' },
          ].map((step) => (
            <div key={step.num} className="reveal" style={{
              background: 'var(--surface)',
              padding: '36px 28px',
              border: '1px solid var(--border)',
              transition: 'background 0.2s',
              transitionDelay: step.delay,
            }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-2)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'var(--surface)')}
            >
              <div style={{
                fontFamily: 'var(--font-instrument-serif)',
                fontSize: '3.5rem',
                color: 'var(--text-subtle)',
                lineHeight: 1,
                marginBottom: 20,
              }}>{step.num}</div>
              <div style={{
                width: 36,
                height: 36,
                background: 'var(--accent-dim)',
                border: '1px solid rgba(200,241,53,0.2)',
                borderRadius: 6,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 16,
              }}>
                {step.icon}
              </div>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: 8, letterSpacing: '0.02em' }}>{step.title}</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.7 }}>{step.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* EARNINGS SECTION */}
      <div id="pricing" style={{ background: 'var(--surface)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', minHeight: 480 }}>
          <div className="reveal" style={{ padding: '80px 48px', borderRight: '1px solid var(--border)' }}>
            <div style={{
              fontSize: '0.72rem',
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              color: 'var(--accent)',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
            }}>
              Creator Earnings
            </div>
            <h2 style={{
              fontFamily: 'var(--font-instrument-serif)',
              fontSize: 'clamp(2rem, 3.5vw, 3rem)',
              lineHeight: 1.1,
              letterSpacing: '-0.02em',
              marginTop: 20,
            }}>
              Simple splits.<br />You always win.
            </h2>
            <p style={{
              color: 'var(--text-muted)',
              fontSize: '0.92rem',
              lineHeight: 1.8,
              marginTop: 20,
              maxWidth: 400,
            }}>
              SONICLAIM takes 20% on every deal we close for you. No upfront fees, no subscription required. We only win when you do.
            </p>
            {/* Waveform animation */}
            <div style={{ marginTop: 40, display: 'flex', gap: 16, alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 3, height: 48 }}>
                {[0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.6, 0.5, 0.3].map((delay, i) => (
                  <div key={i} style={{
                    width: 3,
                    background: 'var(--accent)',
                    borderRadius: 2,
                    animation: `wave 1.4s ease-in-out ${delay}s infinite`,
                    opacity: 0.8,
                  }} />
                ))}
              </div>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Live monitoring active</span>
            </div>
          </div>

          <div className="reveal" style={{ padding: '60px 48px', display: 'flex', flexDirection: 'column', gap: 12, justifyContent: 'center' }}>
            {[
              { name: 'Content Licence', desc: 'Creator / influencer commercial use', price: '£200–500', cut: 'You keep £160–400', accent: false },
              { name: 'Commercial Licence', desc: 'Brand campaigns, ads, activations', price: '£500–2k', cut: 'You keep £400–1,600', accent: false },
              { name: 'Exclusive Licence', desc: 'One brand owns the rights for a period', price: '£2k–10k+', cut: 'You keep £1,600–8,000+', accent: false },
              { name: 'Retroactive Licence', desc: 'Brand already used it without permission', price: '1.5× rate', cut: 'Back-paid to you', accent: true },
            ].map((card) => (
              <div key={card.name} style={{
                background: card.accent ? 'var(--accent-dim2)' : 'var(--bg)',
                border: `1px solid ${card.accent ? 'rgba(200,241,53,0.2)' : 'var(--border)'}`,
                padding: '20px 24px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                transition: 'border-color 0.2s, background 0.2s',
              }}
                onMouseEnter={e => {
                  if (!card.accent) {
                    e.currentTarget.style.borderColor = 'rgba(200,241,53,0.3)'
                    e.currentTarget.style.background = 'var(--accent-dim2)'
                  }
                }}
                onMouseLeave={e => {
                  if (!card.accent) {
                    e.currentTarget.style.borderColor = 'var(--border)'
                    e.currentTarget.style.background = 'var(--bg)'
                  }
                }}
              >
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 500, color: card.accent ? 'var(--accent)' : 'var(--text)' }}>{card.name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 3 }}>{card.desc}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: 'var(--font-instrument-serif)', fontSize: '1.4rem', color: 'var(--accent)' }}>{card.price}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{card.cut}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* TRUST / TESTIMONIALS */}
      <section id="brands" style={{ borderTop: '1px solid var(--border)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)' }}>
          {[
            { quote: 'I had no idea brands were using my audio in paid ads. SONICLAIM found three within the first week and turned them into proper deals.', author: 'Creator, 4.2M TikTok followers', role: 'Registered via SONICLAIM Beta', delay: '0s' },
            { quote: 'As a brand, this was the legitimate path we needed. We wanted to use the sound properly but had no way to find who owned it. SONICLAIM solved that.', author: 'Head of Social, UK Retail Brand', role: 'Licensed via SONICLAIM', delay: '0.1s' },
            { quote: "The certificate alone changed how I think about what I make. I'm a creator, but now I'm also a rights holder.", author: 'Podcast creator & voice artist', role: 'Registered 6 sounds', delay: '0.2s' },
          ].map((item, i) => (
            <div key={i} className="reveal" style={{
              padding: '60px 48px',
              borderRight: i < 2 ? '1px solid var(--border)' : 'none',
              transitionDelay: item.delay,
            }}>
              <p style={{
                fontFamily: 'var(--font-instrument-serif)',
                fontSize: '1.15rem',
                lineHeight: 1.5,
                fontStyle: 'italic',
                color: 'var(--text)',
                marginBottom: 24,
              }}>
                <span style={{ color: 'var(--accent)', fontSize: '1.5em', lineHeight: 0, verticalAlign: '-0.3em', marginRight: 4 }}>"</span>
                {item.quote}
              </p>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', letterSpacing: '0.06em' }}>
                <strong style={{ color: 'var(--text)', display: 'block', fontSize: '0.85rem', marginBottom: 2 }}>{item.author}</strong>
                {item.role}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA SECTION */}
      <section style={{ padding: '120px 48px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{
          position: 'absolute',
          bottom: -100,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 600,
          height: 400,
          background: 'radial-gradient(circle, rgba(200,241,53,0.07) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />
        <h2 className="reveal" style={{
          fontFamily: 'var(--font-instrument-serif)',
          fontSize: 'clamp(2.5rem, 5vw, 5rem)',
          lineHeight: 1.05,
          letterSpacing: '-0.02em',
          maxWidth: 700,
          margin: '0 auto 20px',
        }}>
          Your sound is already out there.<br />
          Time to <em style={{ fontStyle: 'italic', color: 'var(--accent)' }}>own it.</em>
        </h2>
        <p className="reveal" style={{
          color: 'var(--text-muted)',
          fontSize: '0.95rem',
          maxWidth: 420,
          margin: '0 auto 48px',
          lineHeight: 1.7,
        }}>
          Be among the first creators to register, protect, and monetise your viral audio.
        </p>
        <div className="reveal" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <Link href="/auth/signup" style={{
            background: 'var(--accent)',
            color: '#000',
            padding: '16px 40px',
            borderRadius: '4px',
            fontWeight: 600,
            fontSize: '0.95rem',
            letterSpacing: '0.04em',
            textDecoration: 'none',
            display: 'inline-block',
            transition: 'opacity 0.2s, transform 0.2s',
          }}
            onMouseEnter={e => { e.currentTarget.style.opacity = '0.88'; e.currentTarget.style.transform = 'translateY(-1px)' }}
            onMouseLeave={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'translateY(0)' }}
          >
            Claim Your Sound →
          </Link>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-subtle)', letterSpacing: '0.04em' }}>
            No subscription. No upfront cost. We take 20% only when you earn.
          </p>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{
        borderTop: '1px solid var(--border)',
        padding: '40px 48px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <p style={{ fontFamily: 'var(--font-instrument-serif)', fontSize: '1rem' }}>
          SONIC<span style={{ color: 'var(--accent)' }}>LAIM</span>
        </p>
        <ul style={{ display: 'flex', gap: 32, listStyle: 'none' }}>
          {['For Creators', 'For Brands', 'Privacy', 'Terms'].map(link => (
            <li key={link}>
              <Link href="/auth/signup" style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textDecoration: 'none', transition: 'color 0.2s' }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--text)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
              >
                {link}
              </Link>
            </li>
          ))}
        </ul>
        <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>© 2025 SONICLAIM. All rights reserved.</p>
      </footer>

      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .nav-scrollable.scrolled {
          border-color: var(--border) !important;
          background: rgba(10,10,10,0.92) !important;
          backdrop-filter: blur(12px);
        }
      `}</style>
    </>
  )
}

const navLinkStyle: React.CSSProperties = {
  color: 'var(--text-muted)',
  textDecoration: 'none',
  fontSize: '0.85rem',
  letterSpacing: '0.04em',
  transition: 'color 0.2s',
}
