import { SignUpCheckProvider } from '@/components/providers/signup-check-provider'
import localFont from "next/font/local";
import "./globals.css";
import { OrganizationProvider } from '@/contexts/OrganizationContext';
import { UserProvider } from '@/contexts/UserContext';
import {
  ClerkProvider,
  OrganizationSwitcher,
  SignInButton,
  SignedIn,
  SignedOut,
  UserButton
} from '@clerk/nextjs';
import { LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Toaster } from "sonner";
import { SubscriptionProvider } from '@/contexts/SubscriptionContext';
import { CustomNodeTypeProvider } from '@/contexts/CustomNodeTypeContext';

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata = {
  title: "Create Next App",
  description: "Generated by create next app",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
          <SignUpCheckProvider>
            <SignedIn>
              <UserProvider>
                <OrganizationProvider>
                  <SubscriptionProvider>
                    <CustomNodeTypeProvider>
                      <div className="absolute top-4 right-4 z-50">
                        <OrganizationSwitcher hidePersonal={true}/>
                        <UserButton afterSignOutUrl="/" />
                      </div>
                      {children}
                      <Toaster richColors position="top-center" />
                    </CustomNodeTypeProvider>
                  </SubscriptionProvider>
                </OrganizationProvider>
              </UserProvider>
            </SignedIn>
            <SignedOut>
              <div className="absolute top-4 right-4 z-50">
                <SignInButton>
                  <Button variant="outline" className="gap-2">
                    <LogIn className="h-4 w-4" />
                    <span>Login</span>
                  </Button>
                </SignInButton>
              </div>
              {children}
              <Toaster richColors position="top-center" />
            </SignedOut>
          </SignUpCheckProvider>
        </body>
      </html>
    </ClerkProvider>
  )
}
