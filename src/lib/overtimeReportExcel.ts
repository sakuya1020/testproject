import "server-only";

import type { WorkEntry } from "@prisma/client";
import ExcelJS from "exceljs";
import path from "node:path";
import { daysInMonth, formatDateKey, parseMonthValue } from "@/lib/attendance";
import { isJapaneseHoliday } from "@/lib/settings";

type UserInfo = {
  department: string;
  name: string;
};

type DailyOvertime = {
  isHoliday: boolean;
  startTime: string;
  endTime: string;
  hours: number;
  workContent: string;
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
  const summaries = summarizeEntries(entries);

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

    if (day > daysInMonth(month).length) {
      clearRow(row, 2, 17);
      row.commit();
      continue;
    }

    const date = new Date(year, monthIndex, day);
    const dateKey = formatDateKey(date);
    const summary = summaries.get(dateKey);
    const isHoliday = summary?.isHoliday ?? isWeekendOrHoliday(dateKey);

    row.getCell(2).value = day;
    row.getCell(3).value = "(";
    row.getCell(4).value = weekdays[date.getDay()];
    row.getCell(5).value = ")";
    row.getCell(6).value = isHoliday ? "○" : "";
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

function summarizeEntries(entries: WorkEntry[]): Map<string, DailyOvertime> {
  const summaries = new Map<string, DailyOvertime>();

  const grouped = new Map<string, WorkEntry[]>();
  for (const entry of entries) {
    const key = formatDateKey(entry.workDate);
    grouped.set(key, [...(grouped.get(key) ?? []), entry]);
  }

  for (const [dateKey, dayEntries] of grouped) {
    const timedEntries = dayEntries
      .filter((entry) => entry.startTime && entry.endTime)
      .sort((a, b) => a.startTime.localeCompare(b.startTime) || a.endTime.localeCompare(b.endTime));

    if (timedEntries.length === 0) {
      continue;
    }

    const first = timedEntries[0];
    const last = timedEntries.reduce((latest, entry) => (entry.endTime > latest.endTime ? entry : latest), timedEntries[0]);
    const hours = timedEntries.reduce((sum, entry) => sum + calculateDecimalHours(entry.startTime, entry.endTime), 0);
    const workContent = timedEntries
      .map((entry) => entry.workContent || entry.orderName)
      .filter(Boolean)
      .join(" / ");

    summaries.set(dateKey, {
      isHoliday: isWeekendOrHoliday(dateKey),
      startTime: first.startTime,
      endTime: last.endTime,
      hours: roundHours(hours),
      workContent
    });
  }

  return summaries;
}

function calculateDecimalHours(startTime: string, endTime: string): number {
  const start = toMinutes(startTime);
  const end = toMinutes(endTime);
  if (start === null || end === null || end <= start) {
    return 0;
  }
  return (end - start) / 60;
}

function toMinutes(time: string): number | null {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(time);
  if (!match) {
    return null;
  }
  return Number(match[1]) * 60 + Number(match[2]);
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
