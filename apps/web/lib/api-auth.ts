import { auth } from "./auth";
import { db } from "./db";
import { headers } from "next/headers";
import { jsonErr } from "./api-response";

export async function authenticateApiRequest() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return { error: jsonErr("Unauthorized", 401), session: null, member: null };
    }

    const member = await db.member.findFirst({
      where: {
        user_id: session.user.id,
        is_active: true,
      },
      include: {
        organization: true,
      },
    });

    if (!member) {
      return { error: jsonErr("No active membership found", 403), session: null, member: null };
    }

    return { error: null, session, member };
  } catch (error) {
    console.error("[API AUTH ERROR]", error);
    return { error: jsonErr("Authentication failed", 401), session: null, member: null };
  }
}
