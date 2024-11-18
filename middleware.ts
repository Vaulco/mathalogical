import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  try {
    // Get the session cookie
    const session = request.cookies.get('session')?.value

    // If there's no session and trying to access /new, redirect to home
    if (!session && request.nextUrl.pathname.startsWith('/new')) {
      return NextResponse.redirect(new URL('/', request.url))
    }

    // If there is a session and trying to access /new, verify the session
    if (session && request.nextUrl.pathname.startsWith('/new')) {
      try {
        // Attempt to parse the session token
        const tokenData = JSON.parse(Buffer.from(session.split('.')[1], 'base64').toString())

        // Check if the token is expired
        if (tokenData.exp && Date.now() >= tokenData.exp * 1000) {
          const response = NextResponse.redirect(new URL('/', request.url))
          response.cookies.delete('session')
          return response
        }

        // Check if the email matches the allowed email
        if (tokenData.email !== 'dniemtsov@gmail.com') {
          return NextResponse.redirect(new URL('/', request.url))
        }
      } catch (error) {
        // If session is invalid, clear the cookie and redirect to home page
        const response = NextResponse.redirect(new URL('/', request.url))
        response.cookies.delete('session')
        return response
      }
    }

    return NextResponse.next()
  } catch (error) {
    console.error('Middleware error:', error)
    // On any error, redirect to home page for safety
    return NextResponse.redirect(new URL('/', request.url))
  }
}

export const config = {
  matcher: '/new/:path*'
}