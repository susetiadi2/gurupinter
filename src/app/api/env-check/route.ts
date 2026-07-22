import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;

  return NextResponse.json({
    status: 'success',
    environment: process.env.NODE_ENV,
    variables: {
      hasSupabaseUrl: !!supabaseUrl,
      supabaseUrlPrefix: supabaseUrl ? supabaseUrl.substring(0, 15) + '...' : null,
      hasSupabaseKey: !!supabaseKey,
      hasGeminiKey: !!geminiKey,
      geminiKeyPrefix: geminiKey ? geminiKey.substring(0, 5) + '...' : null,
    },
    message: 'Jika semua "has..." bernilai true, maka Vercel berhasil membaca kuncinya.'
  });
}
