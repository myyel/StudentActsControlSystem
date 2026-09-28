import { randomBytes } from "node:crypto";
import { parseArgs } from "node:util";
import { eq } from "drizzle-orm";
import { hashPassword } from "better-auth/crypto";
import { z } from "@/lib/zod";
import { createCredentialUser } from "@/server/auth/users";
import { createSchool, listSchools } from "@/server/services/school";
import { createDb } from "./index";
import { account, session, user } from "./schema";

// Server-side account management (no sign-up in the app). In production:
//   docker compose -f docker-compose.prod.yml run --rm tools pnpm admin:cli <komut> ...
// Commands:
//   kullanici-olustur --eposta E --ad "Ad Soyad" --rol admin|teacher [--okul "Okul adı"]
//   sifre-sifirla --eposta E
//   okullar
// A new password is generated and printed once; pass it on securely.

const USAGE = `Kullanım:
  pnpm admin:cli kullanici-olustur --eposta E --ad "Ad Soyad" --rol admin|teacher [--okul "Okul adı"]
  pnpm admin:cli sifre-sifirla --eposta E
  pnpm admin:cli okullar`;

const createUserArgs = z.object({
  eposta: z.email("Geçerli bir e-posta girin."),
  ad: z.string().trim().min(2, "Ad en az 2 karakter olmalı."),
  rol: z.enum(["admin", "teacher"], "Rol admin veya teacher olmalı."),
  okul: z.string().trim().min(2).optional(),
});

/** 16 characters from an unambiguous alphabet (no 0/O, 1/l/I). */
function generatePassword() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  return Array.from(randomBytes(16), (b) => alphabet[b % alphabet.length]).join("");
}

async function main() {
  const { positionals, values } = parseArgs({
    allowPositionals: true,
    options: { eposta: { type: "string" }, ad: { type: "string" }, rol: { type: "string" }, okul: { type: "string" } },
  });
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL tanımlı değil.");
  const { db, pool } = createDb(url);

  try {
    switch (positionals[0]) {
      case "okullar": {
        const schools = await listSchools(db);
        if (schools.length === 0) console.log("Henüz okul yok.");
        for (const s of schools) console.log(`${s.id}  ${s.name}`);
        return;
      }

      case "kullanici-olustur": {
        const input = createUserArgs.parse(values);
        const password = generatePassword();
        const created = await db.transaction(async (tx) => {
          const schools = await listSchools(tx);
          let schoolId: string;
          if (input.okul) {
            schoolId = schools.find((s) => s.name === input.okul)?.id ?? (await createSchool(tx, input.okul)).school.id;
          } else if (schools.length === 1) {
            schoolId = schools[0]!.id;
          } else {
            throw new Error(schools.length === 0 ? "Henüz okul yok: --okul ile okul adını verin." : "Birden fazla okul var: --okul ile seçin.");
          }
          return createCredentialUser(tx, { email: input.eposta, name: input.ad, password, role: input.rol, schoolId });
        });
        console.log(`Oluşturuldu: ${created.email} (${input.rol})`);
        console.log(`Geçici şifre: ${password}`);
        return;
      }

      case "sifre-sifirla": {
        const email = z.email("Geçerli bir e-posta girin.").parse(values.eposta).toLowerCase();
        const [row] = await db.select({ id: user.id }).from(user).where(eq(user.email, email));
        if (!row) throw new Error("Bu e-postayla kullanıcı yok.");
        const password = generatePassword();
        await db.transaction(async (tx) => {
          await tx.update(account).set({ password: await hashPassword(password) }).where(eq(account.userId, row.id));
          // Signed-in devices must sign in again with the new password.
          await tx.delete(session).where(eq(session.userId, row.id));
        });
        console.log(`Yeni şifre: ${password}`);
        return;
      }

      default:
        console.log(USAGE);
        process.exitCode = 1;
    }
  } finally {
    await pool.end();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof z.ZodError ? error.issues.map((i) => i.message).join("\n") : error instanceof Error ? error.message : error);
  process.exit(1);
});
