"use server";

import { revalidatePath } from "next/cache";
import type { Prisma } from "@prisma/client";
import { monthRange, normalizeEntries, type WorkEntryInput } from "@/lib/attendance";
import { isAttendanceCode, type DailyAttendanceCodeInput } from "@/lib/attendanceCodes";
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
