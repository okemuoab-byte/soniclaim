import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  // Auth check
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  // Parse multipart form
  const formData = await request.formData()
  const file = formData.get('file') as File | null
  const clientHash = formData.get('hash') as string | null
  const duration = parseFloat(formData.get('duration') as string ?? '0')
  const title = (formData.get('title') as string ?? '').trim()
  const description = (formData.get('description') as string ?? '').trim()
  const created_by_date = formData.get('created_by_date') as string | null

  if (!file || !title || !created_by_date) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  if (file.size > 50 * 1024 * 1024) {
    return NextResponse.json({ error: 'File exceeds 50MB limit' }, { status: 400 })
  }

  try {
    // ── Server-side SHA-256 verification ──────────────────────────────────
    const bytes = await file.arrayBuffer()
    const serverHash = createHash('sha256').update(Buffer.from(bytes)).digest('hex')

    if (clientHash && clientHash !== serverHash) {
      return NextResponse.json({ error: 'File integrity check failed' }, { status: 400 })
    }

    // ── Upload to Supabase Storage ────────────────────────────────────────
    const ext = file.name.split('.').pop() ?? 'bin'
    const storagePath = `${user.id}/${serverHash}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('sounds')
      .upload(storagePath, bytes, {
        contentType: file.type || 'audio/mpeg',
        upsert: false,
      })

    if (uploadError) {
      // If already exists (duplicate hash) that's fine — idempotent
      if (!uploadError.message.includes('already exists')) {
        throw new Error(`Storage upload failed: ${uploadError.message}`)
      }
    }

    // Get public URL
    const { data: urlData } = supabase.storage.from('sounds').getPublicUrl(storagePath)
    const fileUrl = urlData.publicUrl

    // ── Insert into sounds table ──────────────────────────────────────────
    const { data: sound, error: dbError } = await supabase
      .from('sounds')
      .insert({
        creator_id: user.id,
        title,
        description: description || null,
        file_url: fileUrl,
        file_hash: serverHash,
        duration_seconds: duration || null,
        created_by_date,
        is_available_for_licensing: true,
      })
      .select('id')
      .single()

    if (dbError) throw new Error(`Database error: ${dbError.message}`)

    const soundId = sound.id

    // ── Generate certificate (async, non-blocking) ────────────────────────
    // Fire and forget — the certificate endpoint handles this
    fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/sounds/${soundId}/certificate`, {
      method: 'POST',
      headers: { Cookie: request.headers.get('cookie') ?? '' },
    }).catch(() => {
      // Certificate generation is best-effort; it can be regenerated later
    })

    // ── AudD registration (if API key is configured) ──────────────────────
    const auddToken = process.env.AUDD_API_TOKEN
    if (auddToken) {
      try {
        const auddForm = new FormData()
        auddForm.append('api_token', auddToken)
        auddForm.append('url', fileUrl)
        auddForm.append('return', 'apple_music,spotify')

        const auddRes = await fetch('https://api.audd.io/', {
          method: 'POST',
          body: auddForm,
        })

        if (auddRes.ok) {
          const auddData = await auddRes.json()
          const auddTrackId = auddData?.result?.song_link ?? null

          if (auddTrackId) {
            await supabase
              .from('sounds')
              .update({ audd_track_id: auddTrackId })
              .eq('id', soundId)
          }
        }
      } catch {
        // AudD registration is non-fatal
      }
    }

    return NextResponse.json({ soundId, hash: serverHash })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[upload] error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
