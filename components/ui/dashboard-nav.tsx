"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Network,
  Settings,
  Users,
  Zap,
  Shapes,
} from "lucide-react";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useUser } from '@/contexts/UserContext';
import { Button } from "./button";

interface SidebarNavProps extends React.HTMLAttributes<HTMLElement> {
  className?: string;
}

const generateUpgradeLink = (organizationId: string, email: string) => {
  const baseUrl = "https://buy.stripe.com/test_00g2bi7kB7o3fEA8ww";
  const params = new URLSearchParams({
    prefilled_email: email,
    client_reference_id: organizationId
  });
  return `${baseUrl}?${params.toString()}`;
};

export function DashboardNav({ className, ...props }: SidebarNavProps) {
  const pathname = usePathname();
  const { subscription } = useSubscription();
  const { organization } = useOrganization();
  const { user } = useUser();

  const items = [
    {
      title: "Ontologies",
      href: "/dashboard",
      icon: Network,
    },
    {
      title: "Node Types",
      href: "/dashboard/node-types",
      icon: Shapes,
    },
    {
      title: "Team",
      href: "/dashboard/team",
      icon: Users,
    },
    {
      title: "Settings",
      href: "/dashboard/settings",
      icon: Settings,
    },
  ];

  return (
    <nav className={cn("space-y-1", className)} {...props}>
      {subscription?.plan === "FREE_TRIAL" && organization && user && (
        <Link 
          href={generateUpgradeLink(organization.id, user.email)}
          target="_blank"
          rel="noopener noreferrer"
        >
          <Button 
            variant="outline" 
            className="w-full mb-4 bg-gradient-to-r from-purple-500 to-blue-500 text-white hover:from-purple-600 hover:to-blue-600"
          >
            <Zap className="mr-2 h-4 w-4" />
            Upgrade
          </Button>
        </Link>
      )}
      {subscription?.plan === "PRO" && (
        <div className="w-full mb-4 px-3 py-2 bg-gradient-to-r from-amber-500/10 to-amber-500/20 border border-amber-500/20 rounded-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Zap className="h-4 w-4 text-amber-500 mr-2" />
              <span className="text-sm font-medium text-amber-500">PRO</span>
            </div>
            <span className="text-xs bg-amber-500/20 text-amber-500 px-2 py-0.5 rounded-full">
              Active
            </span>
          </div>
        </div>
      )}
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center px-3 py-2 text-sm font-medium rounded-md hover:bg-accent hover:text-accent-foreground",
              pathname === item.href
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground"
            )}
          >
            <Icon className="mr-2 h-4 w-4" />
            {item.title}
          </Link>
        );
      })}
    </nav>
  );
} 