'use client'

import React, { useState, useRef, useCallback, useEffect } from 'react'
import Link from 'next/link'
import { Upload, X, CheckCircle2, ArrowLeft, FileCheck, AudioLines } from 'lucide-react'

// ─── Types ───────────────────────────────────────────────────────────────────

type Step = 'drop' | 'details' | 'review' | 'processing' | 'done'

interface FileState {
  file: File
  hash: string
  duration: number
  waveformPeaks: number[]
}

interface FormDetails {
  title: string
  description: string
  created_by_date: string
  proof_notes: string
}

// ─── Video / audio detection ─────────────────────────────────────────────────

const AUDIO_TYPES = ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/flac', 'audio/mp4', 'audio/aac', 'audio/webm', 'audio/x-m4a']
const VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/webm', 'video/x-msvideo', 'video/avi', 'video/x-matroska']
const AUDIO_EXTS = /\.(mp3|wav|ogg|flac|m4a|aac|webm)$/i
const VIDEO_EXTS = /\.(mp4|mov|webm|avi|mkv|m4v)$/i

function isVideoFile(file: File) {
  return VIDEO_TYPES.includes(file.type) || VIDEO_EXTS.test(file.name)
}

function isAudioFile(file: File) {
  return AUDIO_TYPES.includes(file.type) || AUDIO_EXTS.test(file.name)
}

// ─── WAV encoder (pure JS, no dependencies) ───────────────────────────────────

function encodeWav(audioBuffer: AudioBuffer): Blob {
  const numChannels = Math.min(audioBuffer.numberOfChannels, 2)
  const sampleRate = audioBuffer.sampleRate
  const numSamples = audioBuffer.length
  const blockAlign = numChannels * 2
  const dataSize = numSamples * blockAlign
  const buf = new ArrayBuffer(44 + dataSize)
  const view = new DataView(buf)

  const str = (off: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i))
  }

  str(0, 'RIFF'); view.setUint32(4, 36 + dataSize, true); str(8, 'WAVE')
  str(12, 'fmt '); view.setUint32(16, 16, true); view.setUint16(20, 1, true)
  view.setUint16(22, numChannels, true); view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * blockAlign, true); view.setUint16(32, blockAlign, true)
  view.setUint16(34, 16, true); str(36, 'data'); view.setUint32(40, dataSize, true)

  let offset = 44
  for (let i = 0; i < numSamples; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      const s = Math.max(-1, Math.min(1, audioBuffer.getChannelData(ch)[i]))
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true)
      offset += 2
    }
  }
  return new Blob([buf], { type: 'audio/wav' })
}

// Decode video/audio → WAV File (audio only, no video data stored)
async function extractAudioAsWav(file: File): Promise<File> {
  const ctx = new AudioContext()
  try {
    const arrayBuffer = await file.arrayBuffer()
    const audioBuffer = await ctx.decodeAudioData(arrayBuffer)
    const wav = encodeWav(audioBuffer)
    const baseName = file.name.replace(/\.[^/.]+$/, '')
    return new File([wav], `${baseName}.wav`, { type: 'audio/wav' })
  } finally {
    ctx.close()
  }
}

// ─── SHA-256 hash via Web Crypto ──────────────────────────────────────────────

async function sha256(file: File): Promise<string> {
  const buffer = await file.arrayBuffer()
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

// ─── Waveform peaks from AudioBuffer ─────────────────────────────────────────

async function extractPeaks(file: File, bars = 80): Promise<{ peaks: number[]; duration: number }> {
  const ctx = new AudioContext()
  const buffer = await file.arrayBuffer()
  const audioBuffer = await ctx.decodeAudioData(buffer)
  ctx.close()

  const data = audioBuffer.getChannelData(0)
  const blockSize = Math.floor(data.length / bars)
  const peaks: number[] = []

  for (let i = 0; i < bars; i++) {
    let max = 0
    for (let j = 0; j < blockSize; j++) {
      const abs = Math.abs(data[i * blockSize + j])
      if (abs > max) max = abs
    }
    peaks.push(max)
  }

  return { peaks, duration: audioBuffer.duration }
}

// ─── Waveform visual component ────────────────────────────────────────────────

function StaticWaveform({ peaks }: { peaks: number[] }) {
  const maxPeak = Math.max(...peaks, 0.01)
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 2,
      height: 64,
      padding: '0 4px',
    }}>
      {peaks.map((p, i) => {
        const h = Math.max(4, (p / maxPeak) * 56)
        return (
          <div key={i} style={{
            width: 2,
            height: h,
            background: 'var(--accent)',
            borderRadius: 2,
            opacity: 0.85,
            flexShrink: 0,
          }} />
        )
      })}
    </div>
  )
}

// ─── Step indicator ───────────────────────────────────────────────────────────

function StepDot({ n, label, active, done }: { n: number; label: string; active: boolean; done: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{
        width: 28,
        height: 28,
        borderRadius: '50%',
        border: `1px solid ${done ? 'var(--accent)' : active ? 'var(--accent)' : 'var(--border)'}`,
        background: done ? 'var(--accent)' : active ? 'var(--accent-dim)' : 'transparent',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '0.72rem',
        color: done ? '#000' : active ? 'var(--accent)' : 'var(--text-muted)',
        fontWeight: 600,
        flexShrink: 0,
      }}>
        {done ? '✓' : n}
      </div>
      <span style={{
        fontSize: '0.78rem',
        color: active ? 'var(--text)' : 'var(--text-muted)',
        letterSpacing: '0.04em',
      }}>{label}</span>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function UploadPage() {
  const dropRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const audioRef = useRef<HTMLAudioElement>(null)

  const [step, setStep] = useState<Step>('drop')
  const [dragging, setDragging] = useState(false)
  const [computing, setComputing] = useState(false)
  const [fileState, setFileState] = useState<FileState | null>(null)
  const [details, setDetails] = useState<FormDetails>({
    title: '',
    description: '',
    created_by_date: '',
    proof_notes: '',
  })
  const [errors, setErrors] = useState<Partial<FormDetails>>({})
  const [processingStatus, setProcessingStatus] = useState<string[]>([])
  const [soundId, setSoundId] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [computingLabel, setComputingLabel] = useState('Computing fingerprint…')

  // Cleanup object URLs
  useEffect(() => {
    return () => { if (audioUrl) URL.revokeObjectURL(audioUrl) }
  }, [audioUrl])

  // ── File processing ───────────────────────────────────────────────────────

  const processFile = useCallback(async (file: File) => {
    const video = isVideoFile(file)
    const audio = isAudioFile(file)

    if (!video && !audio) {
      alert('Please upload an audio or video file (MP3, WAV, MP4, MOV, WebM…)')
      return
    }
    if (file.size > 200 * 1024 * 1024) {
      alert('File must be under 200MB')
      return
    }

    setComputing(true)
    setComputingLabel(video ? 'Extracting audio from video…' : 'Computing fingerprint…')

    // Pre-fill title from filename
    const basename = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ')
    setDetails(d => ({ ...d, title: d.title || basename }))

    try {
      // Convert video → WAV so we store audio only
      const audioFile = video ? await extractAudioAsWav(file) : file

      if (audioFile.size > 50 * 1024 * 1024) {
        alert('Extracted audio exceeds 50MB. Please use a shorter clip.')
        return
      }

      const url = URL.createObjectURL(audioFile)
      setAudioUrl(url)

      if (video) setComputingLabel('Computing fingerprint…')

      const [hash, { peaks, duration }] = await Promise.all([
        sha256(audioFile),
        extractPeaks(audioFile),
      ])
      setFileState({ file: audioFile, hash, duration, waveformPeaks: peaks })
      setStep('details')
    } catch (err) {
      console.error('Audio processing failed:', err)
      alert('Could not extract audio. Make sure the file has an audio track.')
    } finally {
      setComputing(false)
    }
  }, [])

  // ── Drag handlers ─────────────────────────────────────────────────────────

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(true)
  }, [])

  const onDragLeave = useCallback(() => setDragging(false), [])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) processFile(file)
  }, [processFile])

  const onFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) processFile(file)
  }, [processFile])

  // ── Details validation ────────────────────────────────────────────────────

  function validateDetails(): boolean {
    const errs: Partial<FormDetails> = {}
    if (!details.title.trim()) errs.title = 'Required'
    if (!details.created_by_date) errs.created_by_date = 'Required'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  // ── Submit ────────────────────────────────────────────────────────────────

  async function handleSubmit() {
    if (!fileState) return
    setStep('processing')

    const statuses: string[] = []
    const pushStatus = (msg: string) => {
      statuses.push(msg)
      setProcessingStatus([...statuses])
    }

    try {
      pushStatus('Uploading audio file…')

      const formData = new FormData()
      formData.append('file', fileState.file)
      formData.append('hash', fileState.hash)
      formData.append('duration', String(fileState.duration))
      formData.append('title', details.title.trim())
      formData.append('description', details.description.trim())
      formData.append('created_by_date', details.created_by_date)
      formData.append('proof_notes', details.proof_notes.trim())

      const res = await fetch('/api/sounds/upload', {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Upload failed' }))
        throw new Error(err.error ?? 'Upload failed')
      }

      const data = await res.json()
      pushStatus('Generating ownership certificate…')
      await new Promise(r => setTimeout(r, 800))
      pushStatus('Registering audio fingerprint…')
      await new Promise(r => setTimeout(r, 600))
      pushStatus('Done — sound registered.')
      setSoundId(data.soundId)
      setStep('done')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Something went wrong'
      pushStatus(`Error: ${msg}`)
      // Stay on processing step so user can see the error
    }
  }

  // ── Toggle audio playback ─────────────────────────────────────────────────

  function togglePlay() {
    if (!audioRef.current) return
    if (isPlaying) {
      audioRef.current.pause()
      setIsPlaying(false)
    } else {
      audioRef.current.play()
      setIsPlaying(true)
    }
  }

  const stepIndex = { drop: 0, details: 1, review: 2, processing: 3, done: 3 }[step]

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg)' }}>

      {/* Sidebar */}
      <aside style={{
        width: 240,
        background: 'var(--surface)',
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        position: 'fixed',
        top: 0, left: 0, bottom: 0,
        zIndex: 50,
      }}>
        <div style={{ padding: '28px 24px', borderBottom: '1px solid var(--border)' }}>
          <Link href="/" style={{
            fontFamily: 'var(--font-instrument-serif)',
            fontSize: '1.3rem',
            letterSpacing: '0.08em',
            color: 'var(--text)',
            textDecoration: 'none',
          }}>
            SONIC<span style={{ color: 'var(--accent)' }}>LAIM</span>
          </Link>
        </div>
        <div style={{ flex: 1, padding: '24px' }}>
          <Link href="/dashboard" style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontSize: '0.82rem',
            color: 'var(--text-muted)',
            textDecoration: 'none',
            marginBottom: 32,
          }}>
            <ArrowLeft size={14} /> Back to dashboard
          </Link>

          {/* Step indicator */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <StepDot n={1} label="Upload audio" active={step === 'drop'} done={stepIndex > 0} />
            <StepDot n={2} label="Add details" active={step === 'details'} done={stepIndex > 1} />
            <StepDot n={3} label="Review & submit" active={step === 'review' || step === 'processing' || step === 'done'} done={step === 'done'} />
          </div>
        </div>
      </aside>

      {/* Main */}
      <main style={{ marginLeft: 240, flex: 1, padding: '64px 80px', maxWidth: 760 + 240, boxSizing: 'border-box' }}>

        {/* ── Step: drop ── */}
        {(step === 'drop' || computing) && (
          <div>
            <div className="eyebrow" style={{ marginBottom: 16 }}>New sound</div>
            <h1 style={{
              fontFamily: 'var(--font-instrument-serif)',
              fontSize: 'clamp(1.8rem, 3vw, 2.6rem)',
              lineHeight: 1.1,
              letterSpacing: '-0.02em',
              marginBottom: 48,
            }}>
              Upload your <em style={{ fontStyle: 'italic', color: 'var(--accent)' }}>audio</em>
            </h1>

            {/* Drop zone */}
            <div
              ref={dropRef}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
              onClick={() => !computing && inputRef.current?.click()}
              style={{
                border: `1px dashed ${dragging ? 'var(--accent)' : 'var(--border)'}`,
                background: dragging ? 'var(--accent-dim2)' : 'var(--surface)',
                borderRadius: 4,
                padding: '80px 40px',
                textAlign: 'center',
                cursor: computing ? 'wait' : 'pointer',
                transition: 'border-color 0.2s, background 0.2s',
              }}
            >
              <input
                ref={inputRef}
                type="file"
                accept="audio/*,video/mp4,video/quicktime,video/webm,video/x-msvideo,video/avi"
                style={{ display: 'none' }}
                onChange={onFileInput}
              />

              {computing ? (
                <div>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: 3,
                    height: 48,
                    marginBottom: 20,
                  }}>
                    {Array.from({ length: 12 }).map((_, i) => (
                      <div key={i} className="skeleton" style={{ width: 3, height: 24, borderRadius: 2 }} />
                    ))}
                  </div>
                  <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>
                    {computingLabel}
                  </p>
                </div>
              ) : (
                <>
                  <div style={{
                    width: 56,
                    height: 56,
                    background: dragging ? 'var(--accent-dim)' : 'var(--surface-2)',
                    border: `1px solid ${dragging ? 'var(--accent-border)' : 'var(--border)'}`,
                    borderRadius: 8,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 20px',
                    transition: 'all 0.2s',
                  }}>
                    <Upload size={24} color={dragging ? 'var(--accent)' : 'var(--text-muted)'} />
                  </div>
                  <p style={{ fontSize: '0.95rem', color: 'var(--text)', marginBottom: 8, fontWeight: 500 }}>
                    {dragging ? 'Drop it' : 'Drop audio here or click to browse'}
                  </p>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    MP3, WAV, FLAC, M4A · MP4, MOV, WebM — max 200MB
                  </p>
                </>
              )}
            </div>
          </div>
        )}

        {/* ── Step: details ── */}
        {step === 'details' && fileState && (
          <div>
            <div className="eyebrow" style={{ marginBottom: 16 }}>Sound details</div>
            <h1 style={{
              fontFamily: 'var(--font-instrument-serif)',
              fontSize: 'clamp(1.8rem, 3vw, 2.6rem)',
              lineHeight: 1.1,
              letterSpacing: '-0.02em',
              marginBottom: 40,
            }}>
              Tell us about your <em style={{ fontStyle: 'italic', color: 'var(--accent)' }}>sound</em>
            </h1>

            {/* File preview card */}
            <div style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              padding: '20px 24px',
              marginBottom: 32,
              display: 'flex',
              alignItems: 'center',
              gap: 20,
            }}>
              {/* Play button */}
              <button
                onClick={togglePlay}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  background: isPlaying ? 'var(--accent)' : 'var(--accent-dim)',
                  border: '1px solid var(--accent-border)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  color: isPlaying ? '#000' : 'var(--accent)',
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  transition: 'background 0.2s',
                }}
              >
                {isPlaying ? '■' : '▶'}
              </button>

              {/* Waveform */}
              <div style={{ flex: 1, overflow: 'hidden' }}>
                <StaticWaveform peaks={fileState.waveformPeaks} />
              </div>

              {/* File info */}
              <div style={{ flexShrink: 0, textAlign: 'right' }}>
                <div style={{ fontSize: '0.82rem', color: 'var(--text)', fontWeight: 500 }}>
                  {fileState.file.name}
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>
                  {(fileState.file.size / 1024 / 1024).toFixed(1)} MB · {Math.round(fileState.duration)}s
                </div>
              </div>

              {/* Change */}
              <button
                onClick={() => { setFileState(null); setStep('drop'); if (audioUrl) URL.revokeObjectURL(audioUrl); setAudioUrl(null) }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'var(--text-muted)' }}
              >
                <X size={14} />
              </button>
            </div>

            {/* SHA-256 */}
            <div style={{
              background: 'var(--accent-dim2)',
              border: '1px solid var(--accent-border)',
              padding: '12px 16px',
              marginBottom: 32,
              fontSize: '0.72rem',
            }}>
              <span style={{ color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.1em', marginRight: 12 }}>
                SHA-256
              </span>
              <span style={{ fontFamily: 'var(--font-geist-mono)', color: 'var(--text-muted)', wordBreak: 'break-all' }}>
                {fileState.hash}
              </span>
            </div>

            {/* Form */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              {/* Title */}
              <div>
                <label style={labelStyle}>Sound title <span style={{ color: 'var(--danger)' }}>*</span></label>
                <input
                  value={details.title}
                  onChange={e => { setDetails(d => ({ ...d, title: e.target.value })); setErrors(er => ({ ...er, title: undefined })) }}
                  placeholder="e.g. The Oh No Sound"
                  style={inputStyle(!!errors.title)}
                  onFocus={e => { if (!errors.title) e.target.style.borderColor = 'var(--accent)' }}
                  onBlur={e => { if (!errors.title) e.target.style.borderColor = 'var(--border)' }}
                />
                {errors.title && <p style={errorStyle}>{errors.title}</p>}
              </div>

              {/* Date created */}
              <div>
                <label style={labelStyle}>Original creation date <span style={{ color: 'var(--danger)' }}>*</span></label>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 8, lineHeight: 1.5 }}>
                  When did you first record or create this sound?
                </p>
                <input
                  type="date"
                  value={details.created_by_date}
                  max={new Date().toISOString().split('T')[0]}
                  onChange={e => { setDetails(d => ({ ...d, created_by_date: e.target.value })); setErrors(er => ({ ...er, created_by_date: undefined })) }}
                  style={{ ...inputStyle(!!errors.created_by_date), colorScheme: 'dark' }}
                  onFocus={e => { if (!errors.created_by_date) e.target.style.borderColor = 'var(--accent)' }}
                  onBlur={e => { if (!errors.created_by_date) e.target.style.borderColor = 'var(--border)' }}
                />
                {errors.created_by_date && <p style={errorStyle}>{errors.created_by_date}</p>}
              </div>

              {/* Description */}
              <div>
                <label style={labelStyle}>Description <span style={{ color: 'var(--text-muted)', fontWeight: 400, textTransform: 'none', letterSpacing: 0, fontSize: '0.72rem' }}>(optional)</span></label>
                <textarea
                  value={details.description}
                  onChange={e => setDetails(d => ({ ...d, description: e.target.value }))}
                  placeholder="What is this sound? Where did it originate? Any context that helps establish your ownership…"
                  rows={3}
                  style={{
                    ...inputStyle(false),
                    resize: 'vertical',
                    minHeight: 80,
                    fontFamily: 'inherit',
                  }}
                  onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
                  onBlur={e => (e.target.style.borderColor = 'var(--border)')}
                />
              </div>

              {/* Proof notes */}
              <div>
                <label style={labelStyle}>Proof of creation <span style={{ color: 'var(--text-muted)', fontWeight: 400, textTransform: 'none', letterSpacing: 0, fontSize: '0.72rem' }}>(optional)</span></label>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 8, lineHeight: 1.5 }}>
                  Links, social posts, messages, or other evidence that this is your original work.
                </p>
                <textarea
                  value={details.proof_notes}
                  onChange={e => setDetails(d => ({ ...d, proof_notes: e.target.value }))}
                  placeholder="e.g. Original TikTok post link, iCloud backup reference, recording app export date…"
                  rows={2}
                  style={{
                    ...inputStyle(false),
                    resize: 'vertical',
                    minHeight: 64,
                    fontFamily: 'inherit',
                  }}
                  onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
                  onBlur={e => (e.target.style.borderColor = 'var(--border)')}
                />
              </div>

              <button
                onClick={() => { if (validateDetails()) setStep('review') }}
                style={submitBtnStyle}
                onMouseEnter={e => { e.currentTarget.style.opacity = '0.88'; e.currentTarget.style.transform = 'translateY(-1px)' }}
                onMouseLeave={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'translateY(0)' }}
              >
                Review & Submit →
              </button>
            </div>
          </div>
        )}

        {/* ── Step: review ── */}
        {step === 'review' && fileState && (
          <div>
            <div className="eyebrow" style={{ marginBottom: 16 }}>Review</div>
            <h1 style={{
              fontFamily: 'var(--font-instrument-serif)',
              fontSize: 'clamp(1.8rem, 3vw, 2.6rem)',
              lineHeight: 1.1,
              letterSpacing: '-0.02em',
              marginBottom: 40,
            }}>
              Confirm your <em style={{ fontStyle: 'italic', color: 'var(--accent)' }}>claim</em>
            </h1>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginBottom: 32 }}>
              <ReviewRow label="Sound title" value={details.title} />
              <ReviewRow label="Created on" value={new Date(details.created_by_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })} />
              <ReviewRow label="File" value={`${fileState.file.name} — ${(fileState.file.size / 1024 / 1024).toFixed(1)} MB`} />
              <ReviewRow label="Duration" value={`${Math.round(fileState.duration)}s`} />
              <ReviewRow
                label="SHA-256 fingerprint"
                value={`${fileState.hash.slice(0, 16)}…${fileState.hash.slice(-8)}`}
                mono
              />
              {details.description && <ReviewRow label="Description" value={details.description} />}
            </div>

            {/* What happens next */}
            <div style={{
              background: 'var(--accent-dim2)',
              border: '1px solid var(--accent-border)',
              padding: '20px 24px',
              marginBottom: 32,
              fontSize: '0.82rem',
              color: 'var(--text-muted)',
              lineHeight: 1.7,
            }}>
              <div style={{ color: 'var(--accent)', fontWeight: 600, marginBottom: 8, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                What happens next
              </div>
              Your audio is uploaded to secure storage, the SHA-256 fingerprint is logged, and a timestamped ownership certificate is generated. We then submit your sound to our monitoring system to begin scanning TikTok and Instagram for commercial use.
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={() => setStep('details')}
                style={{
                  background: 'none',
                  border: '1px solid var(--border)',
                  borderRadius: 4,
                  padding: '14px 24px',
                  color: 'var(--text-muted)',
                  fontSize: '0.88rem',
                  cursor: 'pointer',
                  transition: 'border-color 0.2s, color 0.2s',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-hover)'; e.currentTarget.style.color = 'var(--text)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-muted)' }}
              >
                ← Edit details
              </button>
              <button
                onClick={handleSubmit}
                style={submitBtnStyle}
                onMouseEnter={e => { e.currentTarget.style.opacity = '0.88'; e.currentTarget.style.transform = 'translateY(-1px)' }}
                onMouseLeave={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'translateY(0)' }}
              >
                Register sound →
              </button>
            </div>
          </div>
        )}

        {/* ── Step: processing ── */}
        {step === 'processing' && (
          <div>
            <div className="eyebrow" style={{ marginBottom: 16 }}>Registering</div>
            <h1 style={{
              fontFamily: 'var(--font-instrument-serif)',
              fontSize: 'clamp(1.8rem, 3vw, 2.6rem)',
              lineHeight: 1.1,
              letterSpacing: '-0.02em',
              marginBottom: 48,
            }}>
              Securing your <em style={{ fontStyle: 'italic', color: 'var(--accent)' }}>ownership…</em>
            </h1>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {processingStatus.map((msg, i) => (
                <div key={i} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  fontSize: '0.88rem',
                  color: i === processingStatus.length - 1 ? 'var(--text)' : 'var(--text-muted)',
                }}>
                  <div style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: msg.startsWith('Error') ? 'var(--danger)' : i === processingStatus.length - 1 ? 'var(--accent)' : 'var(--text-muted)',
                    flexShrink: 0,
                  }} />
                  {msg}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Step: done ── */}
        {step === 'done' && (
          <div>
            <div style={{
              width: 56,
              height: 56,
              background: 'var(--accent-dim)',
              border: '1px solid var(--accent-border)',
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 24,
            }}>
              <CheckCircle2 size={28} color="var(--accent)" />
            </div>

            <div className="eyebrow" style={{ marginBottom: 16 }}>Registered</div>
            <h1 style={{
              fontFamily: 'var(--font-instrument-serif)',
              fontSize: 'clamp(1.8rem, 3vw, 2.6rem)',
              lineHeight: 1.1,
              letterSpacing: '-0.02em',
              marginBottom: 16,
            }}>
              Your sound is <em style={{ fontStyle: 'italic', color: 'var(--accent)' }}>protected.</em>
            </h1>
            <p style={{ fontSize: '0.92rem', color: 'var(--text-muted)', lineHeight: 1.7, marginBottom: 40, maxWidth: 480 }}>
              Ownership certificate generated. Audio fingerprint registered. Monitoring active — we'll alert you when commercial use is detected.
            </p>

            <div style={{ display: 'flex', gap: 12 }}>
              {soundId && (
                <Link href={`/dashboard/sounds/${soundId}`} style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  background: 'var(--accent)',
                  color: '#000',
                  padding: '14px 28px',
                  borderRadius: 4,
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  textDecoration: 'none',
                }}>
                  <FileCheck size={16} /> View certificate
                </Link>
              )}
              <Link href="/dashboard/upload" onClick={() => { setStep('drop'); setFileState(null); setDetails({ title: '', description: '', created_by_date: '', proof_notes: '' }) }} style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                background: 'var(--surface)',
                color: 'var(--text)',
                border: '1px solid var(--border)',
                padding: '14px 28px',
                borderRadius: 4,
                fontSize: '0.9rem',
                textDecoration: 'none',
              }}>
                <AudioLines size={16} /> Register another
              </Link>
              <Link href="/dashboard" style={{
                display: 'inline-flex',
                alignItems: 'center',
                color: 'var(--text-muted)',
                padding: '14px 0',
                fontSize: '0.88rem',
                textDecoration: 'none',
              }}>
                Back to dashboard →
              </Link>
            </div>
          </div>
        )}

      </main>

      {/* Hidden audio element for playback */}
      {audioUrl && (
        <audio
          ref={audioRef}
          src={audioUrl}
          onEnded={() => setIsPlaying(false)}
          style={{ display: 'none' }}
        />
      )}
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ReviewRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      padding: '14px 20px',
      gap: 24,
    }}>
      <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', flexShrink: 0 }}>
        {label}
      </span>
      <span style={{
        fontSize: '0.85rem',
        color: 'var(--text)',
        textAlign: 'right',
        fontFamily: mono ? 'var(--font-geist-mono)' : 'inherit',
        wordBreak: 'break-all',
      }}>
        {value}
      </span>
    </div>
  )
}

// ─── Style helpers ────────────────────────────────────────────────────────────

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '0.78rem',
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  color: 'var(--text-muted)',
  marginBottom: 8,
  fontWeight: 500,
}

const inputStyle = (hasError: boolean): React.CSSProperties => ({
  width: '100%',
  background: 'var(--surface)',
  border: `1px solid ${hasError ? 'var(--danger)' : 'var(--border)'}`,
  borderRadius: 4,
  padding: '12px 16px',
  color: 'var(--text)',
  fontSize: '0.88rem',
  outline: 'none',
  transition: 'border-color 0.2s',
  display: 'block',
})

const errorStyle: React.CSSProperties = {
  fontSize: '0.78rem',
  color: 'var(--danger)',
  marginTop: 6,
}

const submitBtnStyle: React.CSSProperties = {
  background: 'var(--accent)',
  color: '#000',
  border: 'none',
  borderRadius: 4,
  padding: '14px 32px',
  fontSize: '0.9rem',
  fontWeight: 600,
  cursor: 'pointer',
  letterSpacing: '0.04em',
  transition: 'opacity 0.2s, transform 0.2s',
}
