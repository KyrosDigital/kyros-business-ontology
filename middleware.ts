import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

const publicRoutes = createRouteMatcher([
		"/",
		"/api/v1/webhooks/clerk",
		"/api/v1/webhooks/stripe",
		"/api/v1/inngest"
	])

export default clerkMiddleware(async (auth, req) => {
	if (!publicRoutes(req)) {
		await auth.protect()
	}
})

export const config = {
	matcher: [
		// Skip Next.js internals and all static files
		'/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
		// Always run for API routes
		'/(api|trpc)(.*)',
	],
}