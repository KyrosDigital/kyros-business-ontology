'use client'

import { Button } from "@/components/ui/button"
import { SignInButton, SignUpButton, SignedIn, SignedOut } from "@clerk/nextjs"
import { ArrowRight, LogIn, Sparkles } from "lucide-react"
import Link from "next/link"

export function AuthButtons() {
  return (
    <div className="flex gap-4 justify-center">
      <SignedOut>
        <SignUpButton mode="modal">
          <Button size="lg" className="gap-2">
            <span>Start Free</span>
            <Sparkles className="h-4 w-4" />
          </Button>
        </SignUpButton>
        <SignInButton mode="modal">
          <Button size="lg" variant="outline" className="gap-2">
            <span>Sign In</span>
            <LogIn className="h-4 w-4" />
          </Button>
        </SignInButton>
      </SignedOut>
      <SignedIn>
        <Link href="/dashboard">
          <Button size="lg" className="gap-2">
            Go to Dashboard <ArrowRight className="w-4 h-4" />
          </Button>
        </Link>
      </SignedIn>
    </div>
  )
} 