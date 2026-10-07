import { and, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import type { Db, DbOrTx } from "@/server/db";
import {
  notification,
  notificationPreference,
  notificationType,
  parentStudent,
  student,
  type NotificationPayload,
  type NotificationType,
} from "@/server/db/schema";
import { forbidden } from "@/server/auth/errors";
import { formatPoints } from "@/lib/behavior";
import { formatStudentName, type StudentName } from "@/lib/student-names";
import type { LevelUp } from "./character";

export const NOTIFICATION_PAGE = 50;

export type NewNotification = {
  userId: string;
  type: NotificationType;
  payload: NotificationPayload;
  url: string;
};

export type Preferences = Record<NotificationType, boolean>;

/** Every type is on unless the user turned it off (no row = enabled). */
export async function getPreferences(db: DbOrTx, userId: string): Promise<Preferences> {
  const rows = await db.select().from(notificationPreference).where(eq(notificationPreference.userId, userId));
  const prefs = Object.fromEntries(notificationType.enumValues.map((t) => [t, true])) as Preferences;
  for (const r of rows) prefs[r.type] = r.enabled;
  return prefs;
}

export async function setPreference(db: DbOrTx, userId: string, type: NotificationType, enabled: boolean) {
  await db
    .insert(notificationPreference)
    .values({ userId, type, enabled })
    .onConflictDoUpdate({ target: [notificationPreference.userId, notificationPreference.type], set: { enabled } });
}

/**
 * Inserts notifications, skipping users who turned the type off. A turned-off type creates
 * neither an in-app notification nor a push. Returns the new ids for push delivery.
 */
export async function createNotifications(db: DbOrTx, items: NewNotification[]): Promise<string[]> {
  if (items.length === 0) return [];
  const off = await db
    .select({ userId: notificationPreference.userId, type: notificationPreference.type })
    .from(notificationPreference)
    .where(
      and(
        inArray(notificationPreference.userId, [...new Set(items.map((i) => i.userId))]),
        eq(notificationPreference.enabled, false),
      ),
    );
  const muted = new Set(off.map((o) => `${o.userId}:${o.type}`));
  const values = items.filter((i) => !muted.has(`${i.userId}:${i.type}`));
  if (values.length === 0) return [];
  const rows = await db.insert(notification).values(values).returning({ id: notification.id });
  return rows.map((r) => r.id);
}

type StudentRef = StudentName & { id: string };

/** Current parents of the given (non-deleted) students. */
async function parentsOf(db: DbOrTx, studentIds: string[]) {
  if (studentIds.length === 0) return [];
  return db
    .select({ parentId: parentStudent.parentId, studentId: parentStudent.studentId })
    .from(parentStudent)
    .innerJoin(student, eq(student.id, parentStudent.studentId))
    .where(and(inArray(parentStudent.studentId, studentIds), isNull(student.deletedAt)));
}

export const childUrl = (studentId: string) => `/veli/${studentId}`;

/** One notification per parent and student for a school behavior batch (home entries notify no one). */
export async function notifyBehavior(
  db: DbOrTx,
  input: { batchId: string; students: StudentRef[]; name: string; icon: string; points: number },
) {
  const byId = new Map(input.students.map((s) => [s.id, s]));
  const links = await parentsOf(db, [...byId.keys()]);
  const positive = input.points > 0;
  return createNotifications(
    db,
    links.map(({ parentId, studentId }) => {
      const studentName = formatStudentName(byId.get(studentId)!);
      return {
        userId: parentId,
        type: positive ? "positive_behavior" : "negative_behavior",
        url: childUrl(studentId),
        payload: {
          studentId,
          studentName,
          batchId: input.batchId,
          title: `${studentName}: ${input.icon} ${input.name}`,
          body: positive
            ? `Okulda ${formatPoints(input.points)} olumlu puan kazandı.`
            : `Okulda olumsuz davranış kaydedildi (${formatPoints(input.points)}).`,
        },
      };
    }),
  );
}

/**
 * Level ups and finished characters never revert, so these stay even if the batch that caused
 * them is undone. One score can bring several: the last level and then the next character.
 */
export async function notifyLevelUps(db: DbOrTx, levelUps: LevelUp[], students: StudentRef[]) {
  if (levelUps.length === 0) return [];
  const byId = new Map(students.map((s) => [s.id, s]));
  const links = await parentsOf(db, [...new Set(levelUps.map((u) => u.studentId))]);
  return createNotifications(
    db,
    links.flatMap(({ parentId, studentId }) => {
      const ref = byId.get(studentId);
      if (!ref) return [];
      const studentName = formatStudentName(ref);
      return levelUps
        .filter((up) => up.studentId === studentId)
        .map((up) => ({
          userId: parentId,
          type: "level_up" as const,
          url: childUrl(studentId),
          payload: up.newCharacter
            ? {
                studentId,
                studentName,
                title: `${studentName} karakterini tamamladı! 🎉`,
                body: `${up.from.name} koleksiyona eklendi. Yeni arkadaşı: ${up.to.name}.`,
              }
            : {
                studentId,
                studentName,
                title: `${studentName} yeni seviyeye ulaştı! 🎉`,
                body: `Karakteri artık ${up.to.name} (${up.toLevel}. seviye).`,
              },
        }));
    }),
  );
}

/** Undo or delete of a behavior takes its notifications back (read or not). */
export async function removeBehaviorNotifications(db: DbOrTx, batchId: string, studentId?: string) {
  await db
    .delete(notification)
    .where(
      and(
        inArray(notification.type, ["positive_behavior", "negative_behavior"]),
        sql`${notification.payload}->>'batchId' = ${batchId}`,
        studentId ? sql`${notification.payload}->>'studentId' = ${studentId}` : undefined,
      ),
    );
}

export async function removeMessageNotifications(db: DbOrTx, messageId: string) {
  await db
    .delete(notification)
    .where(and(eq(notification.type, "message"), sql`${notification.payload}->>'messageId' = ${messageId}`));
}

export async function listNotifications(db: Db, userId: string, limit = NOTIFICATION_PAGE) {
  return db
    .select({
      id: notification.id,
      type: notification.type,
      payload: notification.payload,
      url: notification.url,
      readAt: notification.readAt,
      createdAt: notification.createdAt,
    })
    .from(notification)
    .where(eq(notification.userId, userId))
    .orderBy(desc(notification.createdAt), desc(notification.id))
    .limit(limit);
}

export type NotificationItem = Awaited<ReturnType<typeof listNotifications>>[number];

export async function countUnreadNotifications(db: Db, userId: string) {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(notification)
    .where(and(eq(notification.userId, userId), isNull(notification.readAt)));
  return row?.count ?? 0;
}

/** Marks the user's own notification read and returns where it points; others' ids are forbidden. */
export async function openNotification(db: Db, userId: string, notificationId: string) {
  const [row] = await db
    .select({ url: notification.url, readAt: notification.readAt })
    .from(notification)
    .where(and(eq(notification.id, notificationId), eq(notification.userId, userId)));
  if (!row) throw forbidden();
  if (!row.readAt) {
    await db.update(notification).set({ readAt: new Date() }).where(eq(notification.id, notificationId));
  }
  return row.url;
}

export async function markAllNotificationsRead(db: Db, userId: string) {
  await db
    .update(notification)
    .set({ readAt: new Date() })
    .where(and(eq(notification.userId, userId), isNull(notification.readAt)));
}

/** Reading a message also clears its notification. */
export async function markMessageNotificationsRead(db: DbOrTx, userId: string, messageId: string) {
  await db
    .update(notification)
    .set({ readAt: new Date() })
    .where(
      and(
        eq(notification.userId, userId),
        eq(notification.type, "message"),
        isNull(notification.readAt),
        sql`${notification.payload}->>'messageId' = ${messageId}`,
      ),
    );
}
