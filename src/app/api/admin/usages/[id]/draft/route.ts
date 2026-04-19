import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Fetch usage context
  const { data: usage, error: usageError } = await supabase
    .from('usages')
    .select('*')
    .eq('id', id)
    .single()

  if (usageError || !usage) return NextResponse.json({ error: 'Usage not found' }, { status: 404 })

  // Fetch sound + creator
  const { data: sound } = await supabase
    .from('sounds')
    .select('title, profiles(display_name)')
    .eq('id', usage.sound_id)
    .single()

  const soundTitle = (sound as { title: string; profiles: { display_name: string | null } | null } | null)?.title ?? 'Unknown sound'
  const creatorName = ((sound as { title: string; profiles: { display_name: string | null } | null } | null)?.profiles as { display_name: string | null } | null)?.display_name ?? 'the creator'

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 })
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const prompt = `You are drafting a licensing outreach email for SONICLAIM, sent from Arinze (arinze@soniclaim.com) to a brand.

Context:
- Sound: "${soundTitle}" by ${creatorName}
- Platform: ${usage.platform}
- Channel: ${usage.channel_name ?? 'unknown'} (${usage.channel_follower_count ? `${usage.channel_follower_count.toLocaleString()} followers` : 'follower count unknown'})
- Sponsored post: ${usage.is_sponsored ? 'Yes' : 'No / unknown'}
${usage.post_caption ? `- Post caption: "${usage.post_caption}"` : ''}

Write a warm, professional email that:
- Opens by acknowledging the brand's use of the sound positively and specifically
- Briefly explains who SONICLAIM is and that you represent this creator's rights
- Makes a friendly invitation to formalise the usage with a simple licence
- Mentions SONICLAIM handles all paperwork — the brand just says yes
- Notes the split: 80% goes to the creator
- Keeps it to 3-4 short paragraphs, no bullet points, conversational tone
- Never uses legal language, threats, or words like "infringement" or "violation"
- Signs off warmly as "Arinze, SONICLAIM"

Return ONLY valid JSON with this shape: { "subject": "...", "body": "..." }
The body should use plain text. Use \\n\\n between paragraphs.`

  let subject = ''
  let body = ''

  try {
    const response = await client.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = response.content.find(b => b.type === 'text')?.text ?? ''
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('No JSON in response')

    const parsed = JSON.parse(jsonMatch[0])
    subject = parsed.subject ?? ''
    body = parsed.body ?? ''
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Claude generation failed'
    return NextResponse.json({ error: msg }, { status: 500 })
  }

  // Upsert outreach draft
  const existingDraft = await supabase
    .from('outreach_drafts')
    .select('id')
    .eq('usage_id', id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  let draftId: string

  if (existingDraft.data?.id) {
    await supabase.from('outreach_drafts').update({ subject, body, reviewed: false }).eq('id', existingDraft.data.id)
    draftId = existingDraft.data.id
  } else {
    const { data: newDraft } = await supabase
      .from('outreach_drafts')
      .insert({ usage_id: id, drafted_by: 'ai', subject, body })
      .select('id')
      .single()
    draftId = newDraft?.id ?? ''
  }

  // Update usage status to 'draft'
  await supabase.from('usages').update({ outreach_status: 'draft' }).eq('id', id)

  return NextResponse.json({ draftId, subject, body })
}
