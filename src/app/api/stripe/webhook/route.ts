import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 })
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'No signature' }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Webhook signature verification failed'
    console.error('[stripe-webhook] signature error:', msg)
    return NextResponse.json({ error: msg }, { status: 400 })
  }

  // Use service role to bypass RLS
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session

    if (session.payment_status !== 'paid') {
      return NextResponse.json({ ok: true })
    }

    const licenceId = session.metadata?.licence_id
    if (!licenceId) {
      console.error('[stripe-webhook] no licence_id in metadata')
      return NextResponse.json({ ok: true })
    }

    const now = new Date().toISOString()
    const oneYearFromNow = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()

    const { error } = await supabase
      .from('licences')
      .update({
        status: 'active',
        stripe_payment_intent: session.payment_intent as string | null,
        valid_from: now,
        valid_until: oneYearFromNow,
      })
      .eq('id', licenceId)

    if (error) {
      console.error('[stripe-webhook] licence update error:', error.message)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Also mark any related usage as licensed
    const { data: licence } = await supabase
      .from('licences')
      .select('usage_id')
      .eq('id', licenceId)
      .single()

    if (licence?.usage_id) {
      await supabase
        .from('usages')
        .update({ outreach_status: 'licensed' })
        .eq('id', licence.usage_id)
    }
  }

  return NextResponse.json({ ok: true })
}
