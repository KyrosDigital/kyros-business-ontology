'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'

export function LoadingModal() {
  const router = useRouter()
  const pathname = usePathname()
  const [isRedirecting, setIsRedirecting] = useState(false)
  const [shouldShow, setShouldShow] = useState(true)

  useEffect(() => {
		console.log("LoadingModal mounted")
    // If we're already on the dashboard or viewing an ontology graph, hide the modal
    if (pathname === '/dashboard' || pathname.includes('ontology-graph')) {
      setShouldShow(false)
      return
    }

		// check to see if the user has an organization prior to routing to the dashboard. 
		// if not, we need to wait for the organization to be created on the backend.
    const checkOrganization = async () => {
      try {
        // Poll the organization status every 2 seconds
        const interval = setInterval(async () => {
          const response = await fetch('/api/v1/user/current')
          const data = await response.json()
          console.log('Organization check response:', data)
          
          if (data.organization?.id) {
            clearInterval(interval)
            setIsRedirecting(true)
            router.push('/dashboard')
          }
        }, 2000)

        // Cleanup interval after 30 seconds (15 attempts)
        const timeout = setTimeout(() => {
          clearInterval(interval)
          console.log('Organization check timed out')
          setIsRedirecting(true)
          router.push('/dashboard')
        }, 30000)

        return () => {
          clearInterval(interval)
          clearTimeout(timeout)
          console.log('Organization check cleanup')
        }
      } catch (error) {
        console.error('Error checking organization:', error)
      }
    }

    checkOrganization()
  }, [router, pathname])

  // Don't render if we shouldn't show the modal
  if (!shouldShow) {
    return null
  }

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-card p-6 rounded-lg shadow-lg text-center">
        <h2 className="text-xl font-semibold mb-4">Setting Up Your Account</h2>
        <p className="text-muted-foreground mb-4">
          {isRedirecting 
            ? 'Redirecting you to your dashboard...'
            : 'Please wait while we finish creating your account...'}
        </p>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
      </div>
    </div>
  )
} 