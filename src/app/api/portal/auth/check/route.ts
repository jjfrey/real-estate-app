import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import { PortalRole } from "@/db/schema";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return Response.json({ hasPortalAccess: false });
  }

  const portalRoles: PortalRole[] = ["agent", "office_admin", "super_admin"];
  const hasPortalAccess = portalRoles.includes(session.user.role as PortalRole);

  return Response.json({
    hasPortalAccess,
    role: hasPortalAccess ? session.user.role : null,
  });
}
