import { db } from "@/server/db";
import { assertAdminOfStudent } from "@/server/auth/guards";
import { requireRole } from "@/server/auth/session";
import { download, downloadError, exportFileName } from "@/server/download";
import { getRequestMeta } from "@/server/request";
import { writeAudit } from "@/server/services/audit";
import { behaviorEventsCsv, exportStudentData } from "@/server/services/export";
import { ADMIN_EXPORT_RATE_LIMIT, enforceRateLimit } from "@/server/services/rate-limit";
import { exportFormatSchema } from "@/server/validation/privacy";

// KVKK: a school admin exports one student's full record (e.g. before carrying out a deletion
// request). ?bicim=json or ?bicim=csv.
export async function GET(request: Request, { params }: RouteContext<"/admin/ogrenciler/[ogrenciId]/disa-aktar">) {
  try {
    const { user } = await requireRole("admin");
    const { ogrenciId } = await params;
    await assertAdminOfStudent(user, ogrenciId);
    const format = exportFormatSchema.parse(new URL(request.url).searchParams.get("bicim") ?? "json");
    await enforceRateLimit(db, `export:${user.id}`, ADMIN_EXPORT_RATE_LIMIT);

    const data = await exportStudentData(db, ogrenciId);
    if (!data) return new Response("Öğrenci bulunamadı.", { status: 404 });
    const { ip } = await getRequestMeta();
    await writeAudit(db, {
      action: "data.export",
      entity: "student",
      entityId: ogrenciId,
      actorId: user.id,
      schoolId: user.schoolId,
      data: { format },
      ip,
    });

    const name = exportFileName("ogrenci-verileri", format);
    if (format === "csv") return download(behaviorEventsCsv([{ child: data.student.name, events: data.behaviorEvents }]), name, "text/csv");
    return download(JSON.stringify(data, null, 2), name, "application/json");
  } catch (error) {
    return downloadError(error);
  }
}
