import { getMonthValue, monthRange } from "@/lib/attendance";
import { buildOvertimeReportExcel } from "@/lib/overtimeReportExcel";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const month = url.searchParams.get("month") ?? getMonthValue();
  const range = monthRange(month);
  const [records, settings] = await Promise.all([
    prisma.workEntry.findMany({
      where: {
        workDate: {
          gte: range.start,
          lt: range.end
        }
      },
      orderBy: [{ workDate: "asc" }, { rowIndex: "asc" }, { id: "asc" }]
    }),
    prisma.userSetting.findUnique({
      where: { id: 1 }
    })
  ]);

  const workbookBuffer = await buildOvertimeReportExcel(records, range.value, {
    department: "",
    name: settings?.name ?? "",
    workStartTime: settings?.workStartTime ?? "09:00",
    workEndTime: settings?.workEndTime ?? "18:00"
  });
  const body = new ArrayBuffer(workbookBuffer.byteLength);
  new Uint8Array(body).set(workbookBuffer);

  return new Response(body, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(`残業申告書_${range.value.replace("-", "")}.xlsx`)}`
    }
  });
}
