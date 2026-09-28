import { NextResponse, type NextRequest } from "next/server";
import { z } from "@/lib/zod";
import { db } from "@/server/db";
import { AuthError } from "@/server/auth/errors";
import { getSession } from "@/server/auth/session";
import { openNotification } from "@/server/services/notification";

// Where a push notification lands: marks it read and opens the screen it points to.
export async function GET(request: NextRequest, ctx: RouteContext<"/bildirim/[id]">) {
  const { id } = await ctx.params;
  const session = await getSession();
  if (!session) {
    const login = new URL("/giris", request.url);
    login.searchParams.set("next", `/bildirim/${id}`);
    return NextResponse.redirect(login);
  }

  const fallback = new URL("/veli/bildirimler", request.url);
  if (!z.uuid().safeParse(id).success) return NextResponse.redirect(fallback);
  try {
    const url = await openNotification(db, session.user.id, id);
    // Stored urls are app paths; never follow anything else.
    return NextResponse.redirect(new URL(url.startsWith("/") && !url.startsWith("//") ? url : "/", request.url));
  } catch (error) {
    // Someone else's or a removed notification (e.g. an undone behavior).
    if (error instanceof AuthError) return NextResponse.redirect(fallback);
    throw error;
  }
}
