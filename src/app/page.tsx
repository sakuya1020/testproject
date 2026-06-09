import Link from "next/link";
import { MonthAttendanceForm } from "@/app/MonthAttendanceForm";
import { getMonthValue, monthRange, toWorkEntryView } from "@/lib/attendance";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<{
    month?: string;
  }>;
};

export default async function Home({ searchParams }: PageProps) {
  const params = searchParams ? await searchParams : {};
  const month = params.month ?? getMonthValue();
  const range = monthRange(month);
  const [entries, orderOptions] = await Promise.all([
    prisma.workEntry.findMany({
      where: {
        workDate: {
          gte: range.start,
          lt: range.end
        }
      },
      orderBy: [{ workDate: "asc" }, { rowIndex: "asc" }, { id: "asc" }]
    }),
    prisma.orderPreset.findMany({
      orderBy: [{ displayOrder: "asc" }, { id: "asc" }]
    })
  ]);

  return (
    <main className="page">
      <header className="pageHeader">
        <div>
          <p className="eyebrow">Attendance prototype</p>
          <h1>勤怠入力</h1>
        </div>
        <Link className="downloadButton" href="/settings">
          設定
        </Link>
      </header>
      <MonthAttendanceForm
        month={range.value}
        initialEntries={entries.map(toWorkEntryView)}
        orderOptions={orderOptions.map((order) => ({ orderNo: order.orderNo, orderName: order.orderName }))}
      />
    </main>
  );
}
