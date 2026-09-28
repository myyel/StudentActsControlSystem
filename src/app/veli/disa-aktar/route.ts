import { db } from "@/server/db";
import { requireRole } from "@/server/auth/session";
import { getRequestMeta } from "@/server/request";
import { writeAudit } from "@/server/services/audit";
import { behaviorEventsCsv, exportParentData } from "@/server/services/export";
import { parentSchoolId } from "@/server/services/privacy";
import { enforceRateLimit, EXPORT_RATE_LIMIT } from "@/server/services/rate-limit";
import { exportFormatSchema } from "@/server/validation/privacy";
import { download, downloadError, exportFileName } from "@/server/download";

// KVKK: the signed-in parent downloads their own and their children's data.
// ?bicim=json (everything) or ?bicim=csv (behavior history for Excel).
export async function GET(request: Request) {
  try {
    const { user } = await requireRole("parent");
    const format = exportFormatSchema.parse(new URL(request.url).searchParams.get("bicim") ?? "json");
    await enforceRateLimit(db, `export:${user.id}`, EXPORT_RATE_LIMIT);

    const data = await exportParentData(db, user.id);
    const { ip } = await getRequestMeta();
    await writeAudit(db, {
      action: "data.export",
      entity: "user",
      entityId: user.id,
      actorId: user.id,
      schoolId: await parentSchoolId(db, user.id),
      data: { format, children: data.children.length },
      ip,
    });

    const name = exportFileName("verilerim", format);
    if (format === "csv") {
      return download(behaviorEventsCsv(data.children.map((c) => ({ child: c.name, events: c.behaviorEvents }))), name, "text/csv");
    }
    return download(JSON.stringify(data, null, 2), name, "application/json");
  } catch (error) {
    return downloadError(error);
  }
}

