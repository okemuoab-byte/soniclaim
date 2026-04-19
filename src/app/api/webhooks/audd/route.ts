import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// AudD sends POST callbacks when a monitored track is detected.
// We use the service-role client here (no user session) because this is a
// server-to-server call. We verify using the api_token in the payload.

const platformMap: Record<string, string> = {
  tiktok: 'tiktok',
  instagram: 'instagram',
  youtube: 'youtube',
  tt: 'tiktok',
  ig: 'instagram',
  yt: 'youtube',
}

function normalisePlatform(raw: string | undefined): string {
  if (!raw) return 'tiktok'
  const key = raw.toLowerCase()
  return platformMap[key] ?? 'tiktok'
}

export async function POST(request: NextRequest) {
  // AudD sends JSON or form-encoded — handle both
  let payload: Record<string, unknown> = {}
  const contentType = request.headers.get('content-type') ?? ''

  try {
    if (contentType.includes('application/json')) {
      payload = await request.json()
    } else {
      const text = await request.text()
      // Try JSON parse first
      try {
        payload = JSON.parse(text)
      } catch {
        // Fall back to form-encoded
        const params = new URLSearchParams(text)
        params.forEach((v, k) => { payload[k] = v })
        // AudD sometimes sends result as a JSON string
        if (typeof payload.result === 'string') {
          try { payload.result = JSON.parse(payload.result as string) } catch {}
        }
      }
    }
  } catch {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  // Verify api_token matches our configured token
  const expectedToken = process.env.AUDD_API_TOKEN
  if (expectedToken) {
    const receivedToken = (payload.api_token ?? payload.token) as string | undefined
    if (receivedToken && receivedToken !== expectedToken) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
    }
  }

  const status = payload.status as string | undefined
  if (status !== 'success') {
    // AudD sends failure/no-result callbacks too — just acknowledge
    return NextResponse.json({ ok: true })
  }

  const result = payload.result as Record<string, unknown> | undefined
  if (!result) return NextResponse.json({ ok: true })

  // Extract the track identifier — this is the audd_track_id we stored
  const songLink = result.song_link as string | undefined
  if (!songLink) return NextResponse.json({ ok: true })

  // Metadata about where it was detected
  const meta = (payload.metadata ?? {}) as Record<string, unknown>
  const detectionUrl = (payload.url ?? meta.url ?? '') as string
  const rawPlatform = (payload.source ?? meta.platform ?? '') as string
  const platform = normalisePlatform(rawPlatform)

  const channelName = (meta.channel_name ?? meta.author ?? payload.channel_name ?? null) as string | null
  const channelFollowers = (meta.channel_followers ?? meta.followers ?? payload.followers ?? null) as number | null
  const channelId = (meta.channel_id ?? null) as string | null
  const channelBio = (meta.channel_bio ?? null) as string | null
  const postCaption = (meta.caption ?? payload.caption ?? null) as string | null
  const isSponsored = Boolean(meta.is_brand ?? meta.is_sponsored ?? payload.is_sponsored ?? false)

  if (!detectionUrl) {
    return NextResponse.json({ ok: true }) // nothing useful to store
  }

  // Use service role to bypass RLS (no user session in webhook)
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  // Look up the sound by audd_track_id
  const { data: sound } = await supabase
    .from('sounds')
    .select('id, creator_id')
    .eq('audd_track_id', songLink)
    .maybeSingle()

  if (!sound) {
    // Track not in our system — acknowledge without error
    return NextResponse.json({ ok: true })
  }

  // Deduplicate: don't insert if this URL was already detected
  const { data: existing } = await supabase
    .from('usages')
    .select('id')
    .eq('sound_id', sound.id)
    .eq('external_url', detectionUrl)
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ ok: true, duplicate: true })
  }

  // Insert usage
  const { error: insertError } = await supabase.from('usages').insert({
    sound_id: sound.id,
    platform,
    external_url: detectionUrl,
    channel_name: channelName,
    channel_id: channelId,
    channel_bio: channelBio,
    channel_follower_count: channelFollowers,
    is_sponsored: isSponsored,
    post_caption: postCaption,
    outreach_status: 'pending',
  })

  if (insertError) {
    console.error('[audd-webhook] insert error:', insertError.message)
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
