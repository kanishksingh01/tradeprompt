import { NextRequest, NextResponse } from 'next/server';
import { searchTickers } from '@/lib/polygon';

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q') || '';
  if (q.length < 1) return NextResponse.json([]);
  try {
    const results = await searchTickers(q);
    return NextResponse.json(results);
  } catch {
    return NextResponse.json([]);
  }
}
