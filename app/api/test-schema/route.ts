import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return NextResponse.json(
      { error: 'Supabase environment variables are not configured.' },
      { status: 503 }
    );
  }

  const { supabase } = await import('../../lib/supabaseClient');
  const { data: convData, error: convErr } = await supabase.from('conversations').select('*').limit(1);
  const { data: msgData, error: msgErr } = await supabase.from('messages').select('*').limit(1);

  return NextResponse.json({
    conversations: { data: convData, error: convErr },
    messages: { data: msgData, error: msgErr }
  });
}
