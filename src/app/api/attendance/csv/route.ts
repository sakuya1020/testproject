import { getMonthValue, monthRange, workEntriesToCsv } from "@/lib/attendance";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const month = url.searchParams.get("month") ?? getMonthValue();
  const range = monthRange(month);
  const records = await prisma.workEntry.findMany({
    where: {
      workDate: {
        gte: range.start,
        lt: range.end
      }
    },
    orderBy: [{ workDate: "asc" }, { rowIndex: "asc" }, { id: "asc" }]
  });

  const csv = workEntriesToCsv(records);
  const body = `\uFEFF${csv}`;

  return new Response(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="attendance-${range.value}.csv"`
    }
  });
}
