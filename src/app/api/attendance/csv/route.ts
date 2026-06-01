import { attendanceToCsv } from "@/lib/attendance";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  const records = await prisma.attendance.findMany({
    orderBy: [{ workDate: "desc" }, { id: "desc" }]
  });

  const csv = attendanceToCsv(records);
  const body = `\uFEFF${csv}`;

  return new Response(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": "attachment; filename=\"attendance.csv\""
    }
  });
}
