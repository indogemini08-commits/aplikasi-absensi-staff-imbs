import { NextRequest, NextResponse } from 'next/server';
import { COOKIE_NAME } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const response = NextResponse.json({
    success: true,
    message: 'Logout berhasil',
  });

  response.cookies.delete(COOKIE_NAME);
  return response;
}

