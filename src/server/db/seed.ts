import { eq, getTableName, is, sql } from "drizzle-orm";
import { PgTable } from "drizzle-orm/pg-core";
import { formatInviteCode } from "@/lib/invite-code";
import { createCredentialUser } from "@/server/auth/users";
import { createInviteCodes, hashInviteCode, inviteUrl, redeemInviteCode, revokeInviteCode } from "@/server/services/invite";
import { createDb, type Tx } from "./index";
import * as schema from "./schema";
import { characterType, classTeacher, inviteCode, school, schoolClass, student, type ParentRelation } from "./schema";

const DEV_PASSWORD = "Sifre1234!";
const SEED_IP = "127.0.0.1";

const CLASS_2A = [
  ["Ada", "Y"], ["Ali", "K"], ["Ayşe", "D"], ["Can", "Ö"], ["Deniz", "A"],
  ["Ece", "B"], ["Efe", "Ç"], ["Elif", "Ş"], ["Emir", "T"], ["Eylül", "G"],
  ["Göktuğ", "I"], ["İpek", "S"], ["Kerem", "U"], ["Mert", "E"], ["Nehir", "Z"],
  ["Ömer", "P"], ["Selin", "H"], ["Umut", "M"], ["Yağmur", "N"], ["Zeynep", "R"],
] as const;

const CLASS_2B = [
  ["Arda", "C"], ["Berk", "L"], ["Cemre", "F"], ["Duru", "V"],
  ["Ege", "K"], ["Irmak", "T"], ["Kaan", "Y"], ["Lina", "A"],
] as const;

async function addClass(tx: Tx, schoolId: string, teacherId: string, name: string, names: readonly (readonly [string, string])[], characterTypeIds: string[]) {
  const [cls] = await tx.insert(schoolClass).values({ schoolId, name, gradeLevel: 2, academicYear: "2026-2027" }).returning();
  await tx.insert(classTeacher).values({ classId: cls!.id, userId: teacherId });
  const students = await tx
    .insert(student)
    .values(names.map(([firstName, lastInitial], i) => ({ classId: cls!.id, firstName, lastInitial, characterTypeId: characterTypeIds[i % characterTypeIds.length]! })))
    .returning();
  return { cls: cls!, students };
}

async function truncateAll(tx: Tx) {
  const tables = Object.values(schema).flatMap((v) => (is(v, PgTable) ? [`"${getTableName(v)}"`] : []));
  await tx.execute(sql.raw(`TRUNCATE ${tables.join(", ")} RESTART IDENTITY CASCADE`));
}

async function main() {
  if (process.env.NODE_ENV === "production") throw new Error("Seed must not run in production.");
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  const reset = process.argv.includes("--reset");

  const { db, pool } = createDb(url);
  try {
    const printed = await db.transaction(async (tx) => {
      if (reset) await truncateAll(tx);
      else if ((await tx.select({ id: school.id }).from(school).limit(1)).length > 0) return null;

      const [demoSchool] = await tx.insert(school).values({ name: "Örnek İlkokulu" }).returning();
      const schoolId = demoSchool!.id;
      const characterTypes = await tx
        .insert(characterType)
        .values([{ name: "Ejderha", sortOrder: 1 }, { name: "Baykuş", sortOrder: 2 }, { name: "Tohum", sortOrder: 3 }])
        .returning();
      const typeIds = characterTypes.map((t) => t.id);

      const staff = (email: string, name: string, role: "admin" | "teacher") =>
        createCredentialUser(tx, { email, name, password: DEV_PASSWORD, role, schoolId });
      await staff("admin@ornek.okul", "Okul Yöneticisi", "admin");
      const teacher = await staff("ogretmen@ornek.okul", "Ayşe Öğretmen", "teacher");
      const teacher2 = await staff("ogretmen2@ornek.okul", "Mehmet Öğretmen", "teacher");

      const a = await addClass(tx, schoolId, teacher.id, "2-A", CLASS_2A, typeIds);
      const b = await addClass(tx, schoolId, teacher2.id, "2-B", CLASS_2B, typeIds);

      // Parents join the way real ones do: an invite code is created and redeemed,
      // which also writes consent records and the parent.link audit entry.
      const classes = { a: { ...a, teacher }, b: { ...b, teacher: teacher2 } };
      // veliN → [class, student index, relation][]
      const PARENTS: [number, ["a" | "b", number, ParentRelation][]][] = [
        [1, [["a", 0, "mother"], ["a", 1, "mother"]]],
        [2, [["a", 2, "father"]]],
        [3, [["a", 3, "mother"]]],
        [4, [["a", 4, "guardian"]]],
        [5, [["a", 5, "father"]]],
        [6, [["b", 0, "mother"]]],
      ];
      for (const [n, children] of PARENTS) {
        const parent = await createCredentialUser(tx, {
          email: `veli${n}@ornek.okul`,
          name: `Veli ${n}`,
          password: DEV_PASSWORD,
          role: "parent",
        });
        for (const [key, index, relation] of children) {
          const { students, teacher: owner } = classes[key];
          const [created] = await createInviteCodes(tx, owner, [students[index]!.id], { singleUse: true, validDays: 14 }, SEED_IP);
          await redeemInviteCode(tx, { parentId: parent.id, code: created!.code, relation, ip: SEED_IP, userAgent: "seed" });
        }
      }

      // Codes to try the invite flow with (2-A students without parents).
      const invite = async (index: number, options: { singleUse: boolean; validDays: number | null }) => {
        const s = a.students[index]!;
        const [created] = await createInviteCodes(tx, teacher, [s.id], options, SEED_IP);
        return { name: `${s.firstName} ${s.lastInitial}.`, code: created!.code };
      };
      const active = [
        { ...(await invite(6, { singleUse: true, validDays: 14 })), note: "tek kullanımlık" },
        { ...(await invite(7, { singleUse: true, validDays: 14 })), note: "tek kullanımlık" },
        { ...(await invite(8, { singleUse: true, validDays: 14 })), note: "tek kullanımlık" },
        { ...(await invite(9, { singleUse: false, validDays: 30 })), note: "çok kullanımlık" },
      ];

      const revoked = await invite(10, { singleUse: true, validDays: 14 });
      const [revokedRow] = await tx.select({ id: inviteCode.id }).from(inviteCode).where(eq(inviteCode.codeHash, hashInviteCode(revoked.code)));
      await revokeInviteCode(tx, teacher, revokedRow!.id, SEED_IP);

      const expired = await invite(11, { singleUse: true, validDays: 7 });
      await tx.update(inviteCode).set({ expiresAt: new Date(Date.now() - 60_000) }).where(eq(inviteCode.codeHash, hashInviteCode(expired.code)));

      return { active, revoked, expired };
    });

    if (!printed) {
      console.log("Veritabanında zaten veri var; seed atlandı. Sıfırlamak için: pnpm db:reset");
      return;
    }

    const line = (c: { name: string; code: string }) => `${formatInviteCode(c.code)}  ${c.name.padEnd(12)} ${inviteUrl(c.code)}`;
    console.log(`Seed tamamlandı. Tüm hesapların şifresi: ${DEV_PASSWORD}\n`);
    console.log("Hesaplar:");
    console.log("  admin@ornek.okul       yönetici");
    console.log("  ogretmen@ornek.okul    öğretmen, 2-A (20 öğrenci)");
    console.log("  ogretmen2@ornek.okul   öğretmen, 2-B (8 öğrenci)");
    console.log("  veli1@ornek.okul       Ada Y. ve Ali K. (2-A)");
    console.log("  veli2 … veli5          birer çocuk (2-A)");
    console.log("  veli6@ornek.okul       Arda C. (2-B)\n");
    console.log("Kullanılabilir davet kodları (2-A):");
    for (const c of printed.active) console.log(`  ${line(c)}  (${c.note})`);
    console.log("\nHata ekranlarını denemek için:");
    console.log(`  ${line(printed.revoked)}  (iptal edilmiş)`);
    console.log(`  ${line(printed.expired)}  (süresi dolmuş)`);
  } finally {
    await pool.end();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
