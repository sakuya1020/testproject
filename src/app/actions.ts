"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { parseAttendanceForm } from "@/lib/attendance";

export async function createAttendance(formData: FormData): Promise<void> {
  const input = parseAttendanceForm(formData);
  await prisma.attendance.create({ data: input });
  revalidatePath("/");
}

export async function updateAttendance(formData: FormData): Promise<void> {
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) {
    throw new Error("更新対象が不正です。");
  }

  const input = parseAttendanceForm(formData);
  await prisma.attendance.update({
    where: { id },
    data: input
  });
  revalidatePath("/");
}

export async function deleteAttendance(formData: FormData): Promise<void> {
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) {
    throw new Error("削除対象が不正です。");
  }

  await prisma.attendance.delete({ where: { id } });
  revalidatePath("/");
}
