import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
  const { token } = await request.json()
  
  // Get the cookie store asynchronously
  const cookieStore = await cookies()
  
  cookieStore.set('session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 1 week
  })
  
  return NextResponse.json({ success: true })
}

export async function DELETE() {
  // Get the cookie store asynchronously
  const cookieStore = await cookies()
  
  cookieStore.delete('session')
  
  return NextResponse.json({ success: true })
}