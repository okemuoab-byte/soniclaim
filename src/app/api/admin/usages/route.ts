import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json()
  const {
    sound_id, platform, external_url, channel_name,
    channel_follower_count, is_sponsored, post_caption, classification,
  } = body

  if (!sound_id || !platform || !external_url) {
    return NextResponse.json({ error: 'sound_id, platform, and external_url are required' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('usages')
    .insert({
      sound_id,
      platform,
      external_url,
      channel_name: channel_name || null,
      channel_follower_count: channel_follower_count || null,
      is_sponsored: is_sponsored ?? false,
      post_caption: post_caption || null,
      classification: classification || null,
      outreach_status: classification === 'ORGANIC' ? 'organic' : 'pending',
    })
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ usageId: data.id })
}
