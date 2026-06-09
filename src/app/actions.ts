"use server";

import { revalidatePath } from "next/cache";
import type { Prisma } from "@prisma/client";
import { monthRange, normalizeEntries, type WorkEntryInput } from "@/lib/attendance";
import { prisma } from "@/lib/prisma";

export type SaveMonthlyEntriesResult = {
  ok: boolean;
  message: string;
};

export async function saveMonthlyEntries(
  month: string,
  entries: WorkEntryInput[]
): Promise<SaveMonthlyEntriesResult> {
  try {
    const range = monthRange(month);
    const normalized = normalizeEntries(entries);
    const operations: Prisma.PrismaPromise<unknown>[] = [
      prisma.workEntry.deleteMany({
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
