import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { subject, body, recipientEmail, draftId } = await request.json()

  if (!subject || !body || !recipientEmail) {
    return NextResponse.json({ error: 'subject, body, and recipientEmail are required' }, { status: 400 })
  }

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ error: 'RESEND_API_KEY not configured' }, { status: 500 })
  }

  const from = process.env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev'
  const resend = new Resend(process.env.RESEND_API_KEY)

  const { error: sendError } = await resend.emails.send({
    from: `Arinze at SONICLAIM <${from}>`,
    to: [recipientEmail],
    subject,
    text: body,
    // Plain text — brand receives a clean, readable email
  })

  if (sendError) {
    return NextResponse.json({ error: sendError.message }, { status: 500 })
  }

  const now = new Date().toISOString()

  // Mark draft as sent
  if (draftId) {
    await supabase.from('outreach_drafts').update({
      reviewed: true,
      approved_by: user.id,
      sent_at: now,
    }).eq('id', draftId)
  }

  // Advance usage status
  await supabase.from('usages').update({ outreach_status: 'sent' }).eq('id', id)

  return NextResponse.json({ ok: true, sentAt: now })
}
