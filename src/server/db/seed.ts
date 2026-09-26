import { createCredentialUser } from "@/server/auth/users";
import { createDb } from "./index";
import { characterType, classTeacher, parentStudent, school, schoolClass, student } from "./schema";

const DEV_PASSWORD = "Sifre1234!";

const STUDENT_NAMES = [
  ["Ada", "Y"], ["Ali", "K"], ["Ayşe", "D"], ["Can", "Ö"], ["Deniz", "A"],
  ["Ece", "B"], ["Efe", "Ç"], ["Elif", "Ş"], ["Emir", "T"], ["Eylül", "G"],
  ["Göktuğ", "I"], ["İpek", "S"], ["Kerem", "U"], ["Mert", "E"], ["Nehir", "Z"],
  ["Ömer", "P"], ["Selin", "H"], ["Umut", "M"], ["Yağmur", "N"], ["Zeynep", "R"],
] as const;

// parent index → student indexes (veli1 has two children in the class)
const PARENT_CHILDREN = [[0, 1], [2], [3], [4], [5]] as const;

async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Seed must not run in production.");
  }
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");

  const { db, pool } = createDb(url);
  try {
    const existing = await db.select({ id: school.id }).from(school).limit(1);
    if (existing.length > 0) {
      console.log("Veritabanında zaten veri var; seed atlandı.");
      return;
    }

    const [demoSchool] = await db.insert(school).values({ name: "Örnek İlkokulu" }).returning();
    if (!demoSchool) throw new Error("School insert failed");

    const characterTypes = await db
      .insert(characterType)
      .values([
        { name: "Ejderha", sortOrder: 1 },
        { name: "Baykuş", sortOrder: 2 },
        { name: "Tohum", sortOrder: 3 },
      ])
      .returning();

    await createCredentialUser(db, {
      email: "admin@ornek.okul",
      name: "Okul Yöneticisi",
      password: DEV_PASSWORD,
      role: "admin",
      schoolId: demoSchool.id,
    });
    const teacher = await createCredentialUser(db, {
      email: "ogretmen@ornek.okul",
      name: "Ayşe Öğretmen",
      password: DEV_PASSWORD,
      role: "teacher",
      schoolId: demoSchool.id,
    });

    const [demoClass] = await db
      .insert(schoolClass)
      .values({ schoolId: demoSchool.id, name: "2-A", gradeLevel: 2, academicYear: "2026-2027" })
      .returning();
    if (!demoClass) throw new Error("Class insert failed");
    await db.insert(classTeacher).values({ classId: demoClass.id, userId: teacher.id });

    const students = await db
      .insert(student)
      .values(
        STUDENT_NAMES.map(([firstName, lastInitial], i) => ({
          classId: demoClass.id,
          firstName,
          lastInitial,
          characterTypeId: characterTypes[i % characterTypes.length]!.id,
        })),
      )
      .returning();

    for (const [i, childIndexes] of PARENT_CHILDREN.entries()) {
      const parent = await createCredentialUser(db, {
        email: `veli${i + 1}@ornek.okul`,
        name: `Veli ${i + 1}`,
        password: DEV_PASSWORD,
        role: "parent",
      });
      await db.insert(parentStudent).values(
        childIndexes.map((s) => ({ parentId: parent.id, studentId: students[s]!.id })),
      );
    }

    console.log("Seed tamamlandı. Tüm hesapların şifresi:", DEV_PASSWORD);
    console.log("  admin@ornek.okul (yönetici)");
    console.log("  ogretmen@ornek.okul (öğretmen, 2-A)");
    console.log("  veli1@ornek.okul … veli5@ornek.okul (veli1'in iki çocuğu var)");
  } finally {
    await pool.end();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
