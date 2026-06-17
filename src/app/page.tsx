import Link from "next/link";
import { MonthAttendanceForm, type InitialDayCode } from "@/app/MonthAttendanceForm";
import { AppHeader } from "@/app/AppHeader";
import { daysInMonth, formatDateKey, getMonthValue, monthRange, toWorkEntryView } from "@/lib/attendance";
import { defaultAttendanceCode, isAttendanceCode, type AttendanceCode } from "@/lib/attendanceCodes";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isJapaneseHoliday } from "@/lib/settings";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<{
    month?: string;
  }>;
};

export default async function Home({ searchParams }: PageProps) {
  const currentUser = await requireUser();
  const params = searchParams ? await searchParams : {};
  const month = params.month ?? getMonthValue();
  const range = monthRange(month);
  const [entries, orderOptions, storedDayCodes] = await Promise.all([
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
    }),
    prisma.dailyAttendanceCode.findMany({
      where: {
        workDate: {
          gte: range.start,
          lt: range.end
        }
      }
    })
  ]);
  const dayCodes = buildInitialDayCodes(range.value, storedDayCodes);

  return (
    <main className="page">
      <AppHeader currentUser={currentUser} />
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
        initialDayCodes={dayCodes}
        orderOptions={orderOptions.map((order) => ({ orderNo: order.orderNo, orderName: order.orderName }))}
      />
    </main>
  );
}

function buildInitialDayCodes(
  month: string,
  storedDayCodes: Array<{ workDate: Date; code: string }>
): InitialDayCode[] {
  const stored = new Map<string, AttendanceCode>(
    storedDayCodes
      .filter((dayCode) => isAttendanceCode(dayCode.code))
      .map((dayCode) => [formatDateKey(dayCode.workDate), dayCode.code as AttendanceCode])
  );

  return daysInMonth(month).map((day) => ({
    date: day.date,
    code: stored.get(day.date) ?? defaultAttendanceCode(day.isWeekend || isJapaneseHoliday(day.date))
  }));
}
