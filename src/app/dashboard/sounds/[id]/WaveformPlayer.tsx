'use client'

import { useEffect, useRef, useState } from 'react'

interface Props {
  fileUrl: string
  title: string
}

export default function WaveformPlayer({ fileUrl, title }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const wsRef = useRef<import('wavesurfer.js').default | null>(null)
  const [playing, setPlaying] = useState(false)
  const [ready, setReady] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)

  useEffect(() => {
    if (!containerRef.current) return

    let ws: import('wavesurfer.js').default

    import('wavesurfer.js').then(({ default: WaveSurfer }) => {
      ws = WaveSurfer.create({
        container: containerRef.current!,
        waveColor: '#333333',
        progressColor: '#C8F135',
        cursorColor: '#C8F135',
        barWidth: 2,
        barGap: 2,
        barRadius: 2,
        height: 48,
        normalize: true,
      })

      ws.load(fileUrl)

      ws.on('ready', () => {
        setReady(true)
        setDuration(ws.getDuration())
      })

      ws.on('audioprocess', () => setCurrentTime(ws.getCurrentTime()))
      ws.on('finish', () => setPlaying(false))

      wsRef.current = ws
    })

    return () => {
      ws?.destroy()
    }
  }, [fileUrl])

  function togglePlay() {
    if (!wsRef.current || !ready) return
    wsRef.current.playPause()
    setPlaying(p => !p)
  }

  function formatTime(s: number) {
    const m = Math.floor(s / 60)
    const sec = Math.floor(s % 60)
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      padding: '20px 24px',
      marginBottom: 2,
      display: 'flex',
      alignItems: 'center',
      gap: 20,
    }}>
      {/* Play button */}
      <button
        onClick={togglePlay}
        disabled={!ready}
        style={{
          width: 40,
          height: 40,
          borderRadius: '50%',
          background: playing ? 'var(--accent)' : ready ? 'var(--accent-dim)' : 'var(--surface-2)',
          border: `1px solid ${ready ? 'var(--accent-border)' : 'var(--border)'}`,
          cursor: ready ? 'pointer' : 'default',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: playing ? '#000' : ready ? 'var(--accent)' : 'var(--text-muted)',
          fontSize: '0.7rem',
          fontWeight: 700,
          flexShrink: 0,
          transition: 'background 0.2s',
        }}
      >
        {!ready ? (
          // Loading indicator
          <div style={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            {[0, 0.15, 0.3].map(d => (
              <div key={d} className="skeleton" style={{ width: 2, height: 12, borderRadius: 1 }} />
            ))}
          </div>
        ) : playing ? '■' : '▶'}
      </button>

      {/* Waveform */}
      <div style={{ flex: 1 }}>
        {!ready && (
          <div style={{
            height: 48,
            display: 'flex',
            alignItems: 'center',
            gap: 2,
          }}>
            {Array.from({ length: 60 }).map((_, i) => (
              <div key={i} className="skeleton" style={{
                width: 2,
                height: Math.random() * 32 + 6,
                borderRadius: 1,
                flexShrink: 0,
              }} />
            ))}
          </div>
        )}
        <div ref={containerRef} style={{ display: ready ? 'block' : 'none' }} />
      </div>

      {/* Time */}
      <div style={{
        fontSize: '0.75rem',
        color: 'var(--text-muted)',
        fontFamily: 'var(--font-geist-mono)',
        flexShrink: 0,
      }}>
        {formatTime(currentTime)} / {formatTime(duration)}
      </div>
    </div>
  )
}
