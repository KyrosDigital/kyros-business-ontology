import { OrganizationSelector } from "@/components/ui/organization-selector";
import { OrganizationSwitcher } from "@clerk/nextjs";


export default function SelectOrganizationPage() {
	return <OrganizationSwitcher />
  // return <OrganizationSelector />;
} 