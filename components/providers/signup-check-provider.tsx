'use client'

import { useAuth } from '@clerk/clerk-react'
import { LoadingModal } from '@/components/ui/loading-modal'
import { useEffect, useState } from 'react'

export function SignUpCheckProvider({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn } = useAuth()
  const [showLoadingModal, setShowLoadingModal] = useState(false)
  const [previousSignedIn, setPreviousSignedIn] = useState<boolean | null>(null)

  useEffect(() => {
    console.log('Auth state:', { isLoaded, isSignedIn, previousSignedIn })
    
    // Only show loading modal when user transitions from not signed in to signed in
    if (isLoaded && isSignedIn && previousSignedIn === false) {
      setShowLoadingModal(true)
    }

    // Update previous state
    if (isLoaded) {
      setPreviousSignedIn(isSignedIn)
    }
  }, [isLoaded, isSignedIn, previousSignedIn])

  // Show initial loading state while Clerk loads
  if (!isLoaded) {
    return null
  }

  return (
    <>
      {showLoadingModal && <LoadingModal />}
      {children}
    </>
  )
} 