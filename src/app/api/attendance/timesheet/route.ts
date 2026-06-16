import { getMonthValue, monthRange } from "@/lib/attendance";
import { prisma } from "@/lib/prisma";
import { buildTimesheetExcel } from "@/lib/timesheetExcel";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const month = url.searchParams.get("month") ?? getMonthValue();
  const range = monthRange(month);
  const [records, dayCodes, settings] = await Promise.all([
    prisma.workEntry.findMany({
      where: {
        workDate: {
          gte: range.start,
          lt: range.end
        }
      },
      orderBy: [{ workDate: "asc" }, { rowIndex: "asc" }, { id: "asc" }]
    }),
    prisma.dailyAttendanceCode.findMany({
      where: {
        workDate: {
          gte: range.start,
          lt: range.end
        }
      }
    }),
    prisma.userSetting.findUnique({
      where: { id: 1 }
    })
  ]);

  const workbookBuffer = await buildTimesheetExcel(records, dayCodes, range.value, {
    opNo: settings?.opNo ?? "",
    name: settings?.name ?? "",
    workStartTime: settings?.workStartTime ?? "09:00"
  });
  const body = new ArrayBuffer(workbookBuffer.byteLength);
  new Uint8Array(body).set(workbookBuffer);

  return new Response(body, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(`勤怠表_${range.value.replace("-", "")}.xlsx`)}`
    }
  });
}
