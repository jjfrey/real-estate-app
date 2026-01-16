import { PortalLayoutWrapper } from "@/components/portal/PortalLayoutWrapper";

export default function PortalDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <PortalLayoutWrapper>{children}</PortalLayoutWrapper>;
}
