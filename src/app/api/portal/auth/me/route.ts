import { getPortalSession, portalAuthErrorResponse, PortalAuthError } from "@/lib/portal-auth";

export async function GET() {
  try {
    const session = await getPortalSession();

    if (!session) {
      throw new PortalAuthError("Unauthorized", 401);
    }

    return Response.json({
      user: session.user,
      agent: session.agent || null,
      offices: session.offices || null,
    });
  } catch (error) {
    return portalAuthErrorResponse(error);
  }
}
