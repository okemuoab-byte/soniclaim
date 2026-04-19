import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { soundId, licenceType } = await request.json()

  if (!soundId || !licenceType) {
    return NextResponse.json({ error: 'soundId and licenceType are required' }, { status: 400 })
  }

  if (!['content', 'commercial', 'exclusive'].includes(licenceType)) {
    return NextResponse.json({ error: 'Invalid licence type' }, { status: 400 })
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 })
  }

  // Fetch the sound
  const { data: sound, error: soundError } = await supabase
    .from('sounds')
    .select('id, title, creator_id, base_licence_price_gbp, is_available_for_licensing')
    .eq('id', soundId)
    .single()

  if (soundError || !sound) {
    return NextResponse.json({ error: 'Sound not found' }, { status: 404 })
  }

  if (!sound.is_available_for_licensing) {
    return NextResponse.json({ error: 'Sound not available for licensing' }, { status: 400 })
  }

  // Determine price based on licence type
  // content: base price, commercial: 2×, exclusive: 5×
  const basePence = sound.base_licence_price_gbp ?? 15000 // £150 default
  const multipliers: Record<string, number> = {
    content: 1,
    commercial: 2,
    exclusive: 5,
  }
  const pricePence = basePence * (multipliers[licenceType] ?? 1)

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  // Create pending licence record first so we have an ID for metadata
  const { data: licence, error: licenceError } = await supabase
    .from('licences')
    .insert({
      sound_id: soundId,
      brand_id: user.id,
      licence_type: licenceType,
      price_gbp: pricePence,
      status: 'pending',
    })
    .select('id')
    .single()

  if (licenceError || !licence) {
    return NextResponse.json({ error: 'Failed to create licence record' }, { status: 500 })
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    currency: 'gbp',
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: 'gbp',
          unit_amount: pricePence,
          product_data: {
            name: `${sound.title} — ${licenceType.charAt(0).toUpperCase() + licenceType.slice(1)} Licence`,
            description: `SONICLAIM licence for "${sound.title}"`,
          },
        },
      },
    ],
    metadata: {
      licence_id: licence.id,
      sound_id: soundId,
      brand_id: user.id,
      licence_type: licenceType,
    },
    success_url: `${appUrl}/marketplace?licensed=1`,
    cancel_url: `${appUrl}/marketplace`,
  })

  // Store checkout session ID in licence record
  await supabase
    .from('licences')
    .update({ stripe_payment_intent: session.id })
    .eq('id', licence.id)

  return NextResponse.json({ url: session.url })
}
