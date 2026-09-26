import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

// Column names are derived from keys via `casing: "snake_case"` (see db/index.ts, drizzle.config.ts).

const createdAt = () => timestamp({ withTimezone: true }).notNull().defaultNow();
const updatedAt = () =>
  timestamp({ withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date());

export const userRole = pgEnum("user_role", ["admin", "teacher", "parent"]);
export const parentRelation = pgEnum("parent_relation", ["mother", "father", "guardian", "other"]);
export const consentKind = pgEnum("consent_kind", ["privacy_notice", "explicit_consent"]);

export type UserRole = (typeof userRole.enumValues)[number];
export type ParentRelation = (typeof parentRelation.enumValues)[number];
export type ConsentKind = (typeof consentKind.enumValues)[number];

export const school = pgTable("school", {
  id: uuid().primaryKey().defaultRandom(),
  name: text().notNull(),
  timezone: text().notNull().default("Europe/Istanbul"),
  settings: jsonb().$type<Record<string, unknown>>().notNull().default({}),
  createdAt: createdAt(),
});

// --- Better Auth tables (field keys must match Better Auth's model fields) ---

export const user = pgTable(
  "user",
  {
    id: uuid().primaryKey().defaultRandom(),
    name: text().notNull(),
    email: text().notNull().unique(),
    emailVerified: boolean().notNull().default(false),
    image: text(),
    role: userRole().notNull().default("parent"),
    // Required for admin/teacher (enforced in services); null for parents, whose children may span schools.
    schoolId: uuid().references(() => school.id, { onDelete: "restrict" }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index().on(t.schoolId)],
);

export const session = pgTable(
  "session",
  {
    id: uuid().primaryKey().defaultRandom(),
    expiresAt: timestamp({ withTimezone: true }).notNull(),
    token: text().notNull().unique(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    ipAddress: text(),
    userAgent: text(),
    userId: uuid()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (t) => [index().on(t.userId)],
);

export const account = pgTable(
  "account",
  {
    id: uuid().primaryKey().defaultRandom(),
    accountId: text().notNull(),
    providerId: text().notNull(),
    userId: uuid()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text(),
    refreshToken: text(),
    idToken: text(),
    accessTokenExpiresAt: timestamp({ withTimezone: true }),
    refreshTokenExpiresAt: timestamp({ withTimezone: true }),
    scope: text(),
    password: text(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index().on(t.userId)],
);

export const verification = pgTable(
  "verification",
  {
    id: uuid().primaryKey().defaultRandom(),
    identifier: text().notNull(),
    value: text().notNull(),
    expiresAt: timestamp({ withTimezone: true }).notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index().on(t.identifier)],
);

export const rateLimit = pgTable("rate_limit", {
  id: uuid().primaryKey().defaultRandom(),
  key: text().notNull().unique(),
  count: integer().notNull(),
  lastRequest: bigint({ mode: "number" }).notNull(),
});

// --- Domain ---

export const schoolClass = pgTable(
  "class",
  {
    id: uuid().primaryKey().defaultRandom(),
    schoolId: uuid()
      .notNull()
      .references(() => school.id, { onDelete: "restrict" }),
    name: text().notNull(),
    gradeLevel: smallint().notNull(),
    academicYear: text().notNull(),
    homeDailyXpCap: integer().notNull().default(10),
    archivedAt: timestamp({ withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [
    index().on(t.schoolId),
    check("class_grade_level_check", sql`${t.gradeLevel} between 1 and 4`),
    check("class_home_daily_xp_cap_check", sql`${t.homeDailyXpCap} >= 0`),
  ],
);

export const classTeacher = pgTable(
  "class_teacher",
  {
    classId: uuid()
      .notNull()
      .references(() => schoolClass.id, { onDelete: "cascade" }),
    userId: uuid()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.classId, t.userId] }), index().on(t.userId)],
);

export const characterType = pgTable("character_type", {
  id: uuid().primaryKey().defaultRandom(),
  // null = available to every school
  schoolId: uuid().references(() => school.id, { onDelete: "cascade" }),
  name: text().notNull(),
  active: boolean().notNull().default(true),
  sortOrder: integer().notNull().default(0),
});

export const student = pgTable(
  "student",
  {
    id: uuid().primaryKey().defaultRandom(),
    classId: uuid()
      .notNull()
      .references(() => schoolClass.id, { onDelete: "restrict" }),
    firstName: text().notNull(),
    lastInitial: varchar({ length: 1 }),
    characterTypeId: uuid()
      .notNull()
      .references(() => characterType.id, { onDelete: "restrict" }),
    xp: integer().notNull().default(0),
    balance: integer().notNull().default(0),
    characterLevel: smallint().notNull().default(1),
    active: boolean().notNull().default(true),
    createdAt: createdAt(),
    deletedAt: timestamp({ withTimezone: true }),
  },
  (t) => [
    index().on(t.classId),
    check("student_xp_check", sql`${t.xp} >= 0`),
    check("student_character_level_check", sql`${t.characterLevel} >= 1`),
  ],
);

export const inviteCode = pgTable(
  "invite_code",
  {
    id: uuid().primaryKey().defaultRandom(),
    studentId: uuid()
      .notNull()
      .references(() => student.id, { onDelete: "cascade" }),
    // SHA-256 of the normalized code; the plain code is only shown once at creation.
    codeHash: text().notNull().unique(),
    singleUse: boolean().notNull().default(true),
    expiresAt: timestamp({ withTimezone: true }),
    usedAt: timestamp({ withTimezone: true }),
    usedById: uuid().references(() => user.id, { onDelete: "set null" }),
    revokedAt: timestamp({ withTimezone: true }),
    createdById: uuid().references(() => user.id, { onDelete: "set null" }),
    createdAt: createdAt(),
  },
  (t) => [index().on(t.studentId)],
);

export const parentStudent = pgTable(
  "parent_student",
  {
    parentId: uuid()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    studentId: uuid()
      .notNull()
      .references(() => student.id, { onDelete: "cascade" }),
    relation: parentRelation().notNull().default("other"),
    inviteCodeId: uuid().references(() => inviteCode.id, { onDelete: "set null" }),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.parentId, t.studentId] }), index().on(t.studentId)],
);

export const consentRecord = pgTable(
  "consent_record",
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: uuid()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    // The child the consent covers; consent is collected per linked child.
    studentId: uuid().references(() => student.id, { onDelete: "cascade" }),
    kind: consentKind().notNull(),
    docVersion: text().notNull(),
    ip: text(),
    userAgent: text(),
    acceptedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    withdrawnAt: timestamp({ withTimezone: true }),
  },
  (t) => [index().on(t.userId)],
);

// Append-only.
export const auditLog = pgTable(
  "audit_log",
  {
    id: uuid().primaryKey().defaultRandom(),
    schoolId: uuid().references(() => school.id, { onDelete: "set null" }),
    actorId: uuid().references(() => user.id, { onDelete: "set null" }),
    action: text().notNull(),
    entity: text().notNull(),
    entityId: text().notNull(),
    data: jsonb().$type<Record<string, unknown>>().notNull().default({}),
    ip: text(),
    createdAt: createdAt(),
  },
  (t) => [index().on(t.entity, t.entityId), index().on(t.schoolId, t.createdAt)],
);
