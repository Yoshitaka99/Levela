import { NextResponse } from 'next/server';
import { supabase } from '../../lib/supabaseClient';

export async function GET() {
  const { data: convData, error: convErr } = await supabase.from('conversations').select('*').limit(1);
  const { data: msgData, error: msgErr } = await supabase.from('messages').select('*').limit(1);

  return NextResponse.json({
    conversations: { data: convData, error: convErr },
    messages: { data: msgData, error: msgErr }
  });
}
