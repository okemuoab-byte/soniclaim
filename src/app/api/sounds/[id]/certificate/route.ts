import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { generateCertificatePdf } from '@/lib/certificate'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  // Fetch sound + creator
  const { data: sound, error } = await supabase
    .from('sounds')
    .select('*, profiles(display_name)')
    .eq('id', id)
    .eq('creator_id', user.id)
    .single()

  if (error || !sound) {
    return NextResponse.json({ error: 'Sound not found' }, { status: 404 })
  }

  // Check if certificate already exists
  const { data: existing } = await supabase
    .from('certificates')
    .select('id, certificate_url')
    .eq('sound_id', id)
    .single()

  if (existing?.certificate_url) {
    return NextResponse.json({ certificateUrl: existing.certificate_url })
  }

  try {
    // Generate PDF bytes
    const pdfBytes = await generateCertificatePdf({
      soundId: id,
      title: sound.title,
      creatorName: (sound.profiles as { display_name: string })?.display_name ?? user.email ?? 'Unknown',
      creatorEmail: user.email ?? '',
      fileHash: sound.file_hash,
      createdByDate: sound.created_by_date,
      registeredAt: sound.registered_at,
      duration: sound.duration_seconds,
    })

    // Upload PDF to Supabase Storage
    const pdfPath = `${user.id}/${id}/certificate.pdf`
    const { error: uploadError } = await supabase.storage
      .from('certificates')
      .upload(pdfPath, pdfBytes, { contentType: 'application/pdf', upsert: true })

    if (uploadError) throw new Error(uploadError.message)

    const { data: urlData } = supabase.storage.from('certificates').getPublicUrl(pdfPath)
    const certificateUrl = urlData.publicUrl

    // Save to DB
    if (existing) {
      await supabase.from('certificates').update({ certificate_url: certificateUrl }).eq('id', existing.id)
    } else {
      await supabase.from('certificates').insert({
        sound_id: id,
        creator_id: user.id,
        certificate_url: certificateUrl,
      })
    }

    return NextResponse.json({ certificateUrl })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Certificate generation failed'
    console.error('[certificate] error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { data } = await supabase
    .from('certificates')
    .select('certificate_url')
    .eq('sound_id', id)
    .single()

  if (!data?.certificate_url) {
    return NextResponse.json({ certificateUrl: null })
  }

  return NextResponse.json({ certificateUrl: data.certificate_url })
}
