import "server-only";

import type { WorkEntry } from "@prisma/client";
import ExcelJS from "exceljs";
import path from "node:path";
import { daysInMonth, formatDateKey, parseMonthValue } from "@/lib/attendance";
import { isJapaneseHoliday } from "@/lib/settings";

type UserInfo = {
  department: string;
  name: string;
  workStartTime: string;
  workEndTime: string;
};

type DailyOvertime = {
  isHolidayWork: boolean;
  startTime: string;
  endTime: string;
  hours: number;
  workContent: string;
};

type OvertimeSegment = {
  start: number;
  end: number;
};

const templatePath = path.join(process.cwd(), "templates", "overtime-report-template.xlsx");
const reportSheetName = "Sheet1";
const firstDayRow = 7;
const maxDays = 31;
const weekdays = ["日", "月", "火", "水", "木", "金", "土"];

export async function buildOvertimeReportExcel(entries: WorkEntry[], month: string, user: UserInfo): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(templatePath);

  const worksheet = workbook.getWorksheet(reportSheetName) ?? workbook.worksheets[0];
  if (!worksheet) {
    throw new Error("残業申告書テンプレートにシートが見つかりません。");
  }

  const { year, monthIndex } = parseMonthValue(month);
  const monthDays = daysInMonth(month);
  const summaries = summarizeEntries(entries, user.workStartTime, user.workEndTime);

  worksheet.getCell("C2").value = toReiwaYear(year);
  worksheet.getCell("E2").value = monthIndex + 1;
  if (user.department) {
    worksheet.getCell("D4").value = user.department;
  }
  worksheet.getCell("L4").value = user.name;

  let cumulativeHours = 0;
  for (let day = 1; day <= maxDays; day += 1) {
    const rowNumber = firstDayRow + day - 1;
    const row = worksheet.getRow(rowNumber);

    if (day > monthDays.length) {
      clearRow(row, 1, 17);
      row.commit();
      continue;
    }

    const date = new Date(year, monthIndex, day);
    const dateKey = formatDateKey(date);
    const summary = summaries.get(dateKey);

    row.getCell(1).value = day;
    row.getCell(2).value = "";
    row.getCell(3).value = "(";
    row.getCell(4).value = weekdays[date.getDay()];
    row.getCell(5).value = ")";
    row.getCell(6).value = summary?.isHolidayWork ? "◯" : "";
    row.getCell(7).value = "";
    row.getCell(9).value = summary?.startTime ?? "";
    row.getCell(10).value = summary?.endTime ?? "";
    row.getCell(11).value = summary ? summary.hours : "";
    row.getCell(12).value = summary?.workContent ?? "";
    row.getCell(14).value = summary?.endTime ?? "";
    row.getCell(15).value = summary ? summary.hours : "";
    row.getCell(16).value = summary ? (cumulativeHours += summary.hours) : "";
    row.commit();
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

function summarizeEntries(entries: WorkEntry[], workStartTime: string, workEndTime: string): Map<string, DailyOvertime> {
  const summaries = new Map<string, DailyOvertime>();
  const workStart = toMinutes(workStartTime) ?? toMinutes("09:00")!;
  const workEnd = toMinutes(workEndTime) ?? toMinutes("18:00")!;

  const grouped = new Map<string, WorkEntry[]>();
  for (const entry of entries) {
    const key = formatDateKey(entry.workDate);
    grouped.set(key, [...(grouped.get(key) ?? []), entry]);
  }

  for (const [dateKey, dayEntries] of grouped) {
    const isHolidayWork = isWeekendOrHoliday(dateKey);
    const overtimeRows = dayEntries
      .flatMap((entry) => {
        const start = toMinutes(entry.startTime);
        const end = toMinutes(entry.endTime);
        if (start === null || end === null || end <= start) {
          return [];
        }

        return getOvertimeSegments(start, end, workStart, workEnd, isHolidayWork).map((segment) => ({
          entry,
          segment
        }));
      })
      .sort((a, b) => a.segment.start - b.segment.start || a.segment.end - b.segment.end);

    if (overtimeRows.length === 0) {
      continue;
    }

    const first = overtimeRows[0].segment;
    const last = overtimeRows.reduce((latest, row) => (row.segment.end > latest.end ? row.segment : latest), first);
    const hours = overtimeRows.reduce((sum, row) => sum + (row.segment.end - row.segment.start) / 60, 0);
    const workContent = [...new Set(overtimeRows.map((row) => row.entry.workContent || row.entry.orderName).filter(Boolean))].join(" / ");

    summaries.set(dateKey, {
      isHolidayWork,
      startTime: formatTime(first.start),
      endTime: formatTime(last.end),
      hours: roundHours(hours),
      workContent
    });
  }

  return summaries;
}

function getOvertimeSegments(
  start: number,
  end: number,
  workStart: number,
  workEnd: number,
  isHolidayWork: boolean
): OvertimeSegment[] {
  if (isHolidayWork) {
    return [{ start, end }];
  }

  const segments: OvertimeSegment[] = [];
  if (start < workStart) {
    segments.push({ start, end: Math.min(end, workStart) });
  }
  if (end > workEnd) {
    segments.push({ start: Math.max(start, workEnd), end });
  }

  return segments.filter((segment) => segment.end > segment.start);
}

function toMinutes(time: string): number | null {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(time);
  if (!match) {
    return null;
  }
  return Number(match[1]) * 60 + Number(match[2]);
}

function formatTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
}

function roundHours(value: number): number {
  return Math.round(value * 100) / 100;
}

function isWeekendOrHoliday(dateKey: string): boolean {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.getDay() === 0 || date.getDay() === 6 || isJapaneseHoliday(dateKey);
}

function toReiwaYear(year: number): number {
  return year >= 2019 ? year - 2018 : year;
}

function clearRow(row: ExcelJS.Row, startColumn: number, endColumn: number): void {
  for (let column = startColumn; column <= endColumn; column += 1) {
    row.getCell(column).value = null;
  }
}
