'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export function LoadingModal() {
  const router = useRouter()
  const [isRedirecting, setIsRedirecting] = useState(false)

  useEffect(() => {
    const checkOrganization = async () => {
      try {
        // Poll the organization status every 2 seconds
        const interval = setInterval(async () => {
          const response = await fetch('/api/v1/user/current')
          const data = await response.json()
          
          if (data.user?.organizationId) {
            clearInterval(interval)
            setIsRedirecting(true)
            router.push('/dashboard')
          }
        }, 2000)

        // Cleanup interval after 30 seconds (15 attempts)
        setTimeout(() => {
          clearInterval(interval)
        }, 30000)

        return () => clearInterval(interval)
      } catch (error) {
        console.error('Error checking organization:', error)
      }
    }

    checkOrganization()
  }, [router])

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