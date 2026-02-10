import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function isAdminFromJwt(payload: any): boolean {
  return payload?.app_metadata?.is_admin === true || payload?.app_metadata?.is_admin === 'true'
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const authHeader = request.headers.get('authorization') || ''
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

  if (!supabaseUrl || !anonKey || !serviceKey) {
    return NextResponse.json({ error: 'Missing Supabase env vars' }, { status: 500 })
  }

  const authClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  })
  const { data: userData } = await authClient.auth.getUser()

  if (!userData?.user || !isAdminFromJwt(userData.user)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const adminClient = createClient(supabaseUrl, serviceKey)

  const { error: deleteError } = await adminClient
    .from('catches')
    .delete()
    .eq('id', params.id)

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 })
  }

  await adminClient.rpc('remove_pinned_catch', { catch_id: params.id })

  return NextResponse.json({ ok: true })
}
