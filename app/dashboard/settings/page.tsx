"use client";

import { useUser } from "@/contexts/UserContext";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { useOrganization } from "@/contexts/OrganizationContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { CreditCard, Eye, EyeOff, Key, Zap, Copy } from "lucide-react";
import { DashboardNav } from "@/components/ui/dashboard-nav";
import { useState } from "react";
import { toast } from "sonner";

export default function SettingsPage() {
  const { user } = useUser();
  const { subscription } = useSubscription();
  const { organization } = useOrganization();
  const [showApiKey, setShowApiKey] = useState(false);

  // Get the first API key from the user's API keys
  const defaultApiKey = user?.apiKeys?.[0];

  const handleManageBilling = () => {
    window.open('https://billing.stripe.com/p/login/test_9AQbKM5Muai4cDu288', '_blank');
  };

  const handleCopyApiKey = async () => {
    if (defaultApiKey?.key) {
      await navigator.clipboard.writeText(defaultApiKey.key);
      toast.success('API key copied to clipboard');
    }
  };

  const maskApiKey = (key: string) => {
    if (!key) return '';
    return `${key.slice(0, 8)}${'•'.repeat(key.length - 16)}${key.slice(-8)}`;
  };

  return (
    <div className="flex min-h-screen">
      <div className="w-64 border-r bg-background p-6">
        <div className="mb-6">
          <h2 className="text-lg font-semibold">Settings</h2>
          {organization && (
            <p className="text-sm text-muted-foreground">
              {organization.name}
            </p>
          )}
        </div>
        <DashboardNav />
      </div>
      <div className="flex-1 p-6">
        <div className="max-w-4xl">
          <h1 className="text-3xl font-bold mb-8">Settings</h1>

          <div className="space-y-6">
            {/* API Key Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Key className="h-5 w-5" />
                  API Key
                </CardTitle>
                <CardDescription>
                  Your API key for accessing the API
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {defaultApiKey ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <code className="flex-1 p-2 bg-muted rounded-md font-mono text-sm">
                          {showApiKey ? defaultApiKey.key : maskApiKey(defaultApiKey.key)}
                        </code>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setShowApiKey(!showApiKey)}
                          title={showApiKey ? "Hide API key" : "Show API key"}
                        >
                          {showApiKey ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={handleCopyApiKey}
                          title="Copy API key"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Created: {new Date(defaultApiKey.createdAt).toLocaleDateString()}
                        {defaultApiKey.expiresAt && (
                          <> · Expires: {new Date(defaultApiKey.expiresAt).toLocaleDateString()}</>
                        )}
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No API key available</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Subscription Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Subscription & Billing
                </CardTitle>
                <CardDescription>
                  Manage your subscription and billing settings
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Current Plan</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Zap className={`h-4 w-4 ${subscription?.plan === "PRO" ? "text-amber-500" : "text-purple-500"}`} />
                        <span className={`text-sm ${subscription?.plan === "PRO" ? "text-amber-500" : "text-purple-500"}`}>
                          {subscription?.plan === "PRO" ? "PRO Plan" : "Free Trial"}
                        </span>
                      </div>
                    </div>
                    <Button 
                      variant="outline"
                      onClick={handleManageBilling}
                    >
                      Manage Billing
                    </Button>
                  </div>

                  <Separator />

                  <div>
                    <p className="font-medium mb-2">Organization Details</p>
                    <div className="text-sm text-muted-foreground">
                      <p>Name: {organization?.name}</p>
                      <p>Members: {organization?._count?.users || 0}</p>
                      <p>Ontologies: {organization?._count?.ontologies || 0}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Account Section */}
            <Card>
              <CardHeader>
                <CardTitle>Account Settings</CardTitle>
                <CardDescription>
                  Your account information and preferences
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p><span className="font-medium">Name:</span> {user?.name}</p>
                  <p><span className="font-medium">Email:</span> {user?.email}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
