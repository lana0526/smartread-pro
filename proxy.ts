// proxy.ts
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

// ??????
const isProtectedRoute = createRouteMatcher([
  '/settings(.*)',
])

export default clerkMiddleware(async (auth, req) => {
  const { userId } = await auth()

  if (isProtectedRoute(req)) {
    if (!userId) {
      const signUpUrl = new URL('/sign-up', req.url)
      signUpUrl.searchParams.set('redirect_url', req.url)
      return NextResponse.redirect(signUpUrl)
    }
    return NextResponse.next()
  }

  return NextResponse.next()
})

export const config = {
  matcher: [
    '/((?!_next|[^?]*\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
}
