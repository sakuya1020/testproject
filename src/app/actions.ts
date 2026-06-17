"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Prisma } from "@prisma/client";
import { monthRange, normalizeEntries, type WorkEntryInput } from "@/lib/attendance";
import { isAttendanceCode, type DailyAttendanceCodeInput } from "@/lib/attendanceCodes";
import { ensureInitialAdmin, hashPassword, requireAdmin, signIn, signOut } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildInitializedEntries, parseSettingsForm } from "@/lib/settings";

export type SaveMonthlyEntriesResult = {
  ok: boolean;
  message: string;
};

export type ActionResult = {
  ok: boolean;
  message: string;
};

export async function login(_state: ActionResult, formData: FormData): Promise<ActionResult> {
  await ensureInitialAdmin();
  const loginId = getFormString(formData, "loginId");
  const password = getFormString(formData, "password");

  if (!loginId || !password) {
    return { ok: false, message: "IDとパスワードを入力してください。" };
  }

  const user = await prisma.user.findUnique({
    where: { loginId }
  });

  if (!user || user.passwordHash !== hashPassword(password)) {
    return { ok: false, message: "IDまたはパスワードが正しくありません。" };
  }

  await signIn(user.id);
  redirect("/");
}

export async function logout(): Promise<void> {
  await signOut();
  redirect("/login");
}

export async function saveMonthlyEntries(
  month: string,
  entries: WorkEntryInput[],
  dayCodes: DailyAttendanceCodeInput[]
): Promise<SaveMonthlyEntriesResult> {
  try {
    const range = monthRange(month);
    const normalized = normalizeEntries(entries);
    const normalizedDayCodes = normalizeDayCodes(dayCodes, range);
    const operations: Prisma.PrismaPromise<unknown>[] = [
      prisma.workEntry.deleteMany({
        where: {
          workDate: {
            gte: range.start,
            lt: range.end
          }
        }
      }),
      prisma.dailyAttendanceCode.deleteMany({
        where: {
          workDate: {
            gte: range.start,
            lt: range.end
          }
        }
      })
    ];

    if (normalized.length > 0) {
      operations.push(prisma.workEntry.createMany({
        data: normalized.map((entry) => ({
          workDate: new Date(`${entry.date}T00:00:00`),
          rowIndex: entry.rowIndex,
          orderCode: entry.orderCode,
          isTravel: entry.isTravel,
          process: entry.process,
          detail: entry.detail,
          orderName: entry.orderName,
          startTime: entry.startTime,
          endTime: entry.endTime,
          workContent: entry.workContent
        }))
      }));
    }

    if (normalizedDayCodes.length > 0) {
      operations.push(prisma.dailyAttendanceCode.createMany({
        data: normalizedDayCodes.map((dayCode) => ({
          workDate: new Date(`${dayCode.date}T00:00:00`),
          code: dayCode.code
        }))
      }));
    }

    await prisma.$transaction(operations);

    revalidatePath("/");
    return { ok: true, message: "保存しました。" };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "保存に失敗しました。"
    };
  }
}

export async function saveSettings(formData: FormData): Promise<ActionResult> {
  try {
    const settings = parseSettingsForm(formData);
    const operations: Prisma.PrismaPromise<unknown>[] = [
      prisma.userSetting.upsert({
        where: { id: 1 },
        update: {
          opNo: settings.opNo,
          name: settings.name,
          workStartTime: settings.workStartTime,
          workEndTime: settings.workEndTime
        },
        create: {
          id: 1,
          opNo: settings.opNo,
          name: settings.name,
          workStartTime: settings.workStartTime,
          workEndTime: settings.workEndTime
        }
      }),
      prisma.orderPreset.deleteMany()
    ];

    if (settings.orders.length > 0) {
      operations.push(prisma.orderPreset.createMany({
        data: settings.orders.map((order) => ({
          displayOrder: order.displayOrder,
          orderNo: order.orderNo,
          orderName: order.orderName,
          time1Start: order.time1Start,
          time1End: order.time1End,
          time2Start: order.time2Start,
          time2End: order.time2End
        }))
      }));
    }

    await prisma.$transaction(operations);

    revalidatePath("/settings");
    revalidatePath("/");
    return { ok: true, message: "設定を保存しました。" };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "設定の保存に失敗しました。"
    };
  }
}

export async function createUser(formData: FormData): Promise<void> {
  await requireAdmin();
  const input = parseUserForm(formData, false);

  await prisma.user.create({
    data: {
      loginId: input.loginId,
      passwordHash: hashPassword(input.password),
      name: input.name,
      opNo: input.opNo,
      isAdmin: input.isAdmin
    }
  });

  revalidatePath("/users");
  redirect("/users");
}

export async function updateUser(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = getFormId(formData);
  const input = parseUserForm(formData, true);
  const current = await prisma.user.findUnique({ where: { id } });

  if (!current) {
    throw new Error("ユーザーが見つかりません。");
  }

  if (current.isAdmin && !input.isAdmin) {
    const adminCount = await prisma.user.count({
      where: { isAdmin: true }
    });

    if (adminCount <= 1) {
      throw new Error("管理者ユーザーは最低1人必要です。");
    }
  }

  const data: Prisma.UserUpdateInput = {
    loginId: input.loginId,
    name: input.name,
    opNo: input.opNo,
    isAdmin: input.isAdmin
  };

  if (input.password) {
    data.passwordHash = hashPassword(input.password);
  }

  await prisma.user.update({
    where: { id },
    data
  });

  revalidatePath("/users");
  redirect("/users");
}

export async function deleteUser(formData: FormData): Promise<void> {
  const currentUser = await requireAdmin();
  const id = getFormId(formData);

  if (id === currentUser.id) {
    redirect("/users");
  }

  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) {
    redirect("/users");
  }

  if (target.isAdmin) {
    const adminCount = await prisma.user.count({
      where: { isAdmin: true }
    });

    if (adminCount <= 1) {
      redirect("/users");
    }
  }

  await prisma.user.delete({ where: { id } });
  revalidatePath("/users");
  redirect("/users");
}

export async function initializeMonthlyEntries(formData: FormData): Promise<ActionResult> {
  try {
    const month = getFormString(formData, "month");
    const process = getFormString(formData, "process");
    const detail = getFormString(formData, "detail");
    const orderNo = getFormString(formData, "orderNo");

    if (!month || !orderNo) {
      throw new Error("年月とオーダーNoを選択してください。");
    }

    const preset = await prisma.orderPreset.findFirst({
      where: { orderNo },
      orderBy: [{ displayOrder: "asc" }, { id: "asc" }]
    });
    if (!preset) {
      throw new Error("選択したオーダーNoの設定が見つかりません。");
    }

    const entries = buildInitializedEntries({
      month,
      process,
      detail,
      preset
    });
    const operations: Prisma.PrismaPromise<unknown>[] = [];

    if (entries.length > 0) {
      operations.push(
        prisma.workEntry.deleteMany({
          where: {
            workDate: {
              in: entries.map((entry) => new Date(`${entry.date}T00:00:00`))
            },
            rowIndex: {
              in: [0, 1]
            }
          }
        }),
        prisma.workEntry.createMany({
          data: entries.map((entry) => ({
            workDate: new Date(`${entry.date}T00:00:00`),
            rowIndex: entry.rowIndex,
            orderCode: entry.orderCode,
            isTravel: entry.isTravel,
            process: entry.process,
            detail: entry.detail,
            orderName: entry.orderName,
            startTime: entry.startTime,
            endTime: entry.endTime,
            workContent: entry.workContent
          }))
        })
      );
    }

    if (operations.length > 0) {
      await prisma.$transaction(operations);
    }

    revalidatePath("/");
    return { ok: true, message: "対象年月を初期化しました。" };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "初期化に失敗しました。"
    };
  }
}

function getFormString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function getFormId(formData: FormData): number {
  const id = Number(getFormString(formData, "id"));

  if (!Number.isInteger(id) || id <= 0) {
    throw new Error("ユーザーIDが不正です。");
  }

  return id;
}

function parseUserForm(formData: FormData, allowEmptyPassword: boolean) {
  const loginId = getFormString(formData, "loginId");
  const password = getFormString(formData, "password");
  const name = getFormString(formData, "name");
  const opNo = getFormString(formData, "opNo");

  if (!loginId || !name || !opNo || (!allowEmptyPassword && !password)) {
    throw new Error("ユーザー情報を入力してください。");
  }

  return {
    loginId,
    password,
    name,
    opNo,
    isAdmin: formData.get("isAdmin") === "on"
  };
}

function normalizeDayCodes(
  dayCodes: DailyAttendanceCodeInput[],
  range: ReturnType<typeof monthRange>
): DailyAttendanceCodeInput[] {
  const normalized = new Map<string, DailyAttendanceCodeInput>();

  for (const dayCode of dayCodes) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dayCode.date) || !isAttendanceCode(dayCode.code)) {
      throw new Error("勤怠コードが不正です。");
    }

    const workDate = new Date(`${dayCode.date}T00:00:00`);
    if (workDate < range.start || workDate >= range.end) {
      continue;
    }

    normalized.set(dayCode.date, dayCode);
  }

  return [...normalized.values()].sort((a, b) => a.date.localeCompare(b.date));
}
