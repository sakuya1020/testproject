import "server-only";

import type { WorkEntry } from "@prisma/client";
import ExcelJS from "exceljs";
import path from "node:path";
import { daysInMonth, formatDateKey, parseMonthValue } from "@/lib/attendance";
import {
  defaultAttendanceCode,
  isAttendanceCode,
  type AttendanceCode
} from "@/lib/attendanceCodes";
import { isJapaneseHoliday } from "@/lib/settings";

type UserInfo = {
  opNo: string;
  name: string;
  workStartTime: string;
};

type DailySummary = {
  startTime: string;
  endTime: string;
};

type StoredDayCode = {
  workDate: Date;
  code: string;
};

const templatePath = path.join(process.cwd(), "templates", "timesheet-template.xlsx");
const sheetName = "Sheet1";
const firstDayRow = 3;
const maxDays = 31;
const lastColumn = 13;
const weekdays = ["日", "月", "火", "水", "木", "金", "土"];
const attendanceItemLabels: Record<AttendanceCode, string> = {
  "00": "出勤",
  "04": "代休",
  "11": "有給休暇",
  "12": "午前有給",
  "13": "午後有給",
  "51": "夏季休暇",
  "98": "休日出勤",
  "99": "休日"
};

export async function buildTimesheetExcel(
  entries: WorkEntry[],
  dayCodes: StoredDayCode[],
  month: string,
  user: UserInfo
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(templatePath);

  const worksheet = workbook.getWorksheet(sheetName) ?? workbook.worksheets[0];
  if (!worksheet) {
    throw new Error("勤怠表テンプレートにシートが見つかりません。");
  }

  const { year, monthIndex } = parseMonthValue(month);
  const monthDays = daysInMonth(month);
  const summaries = summarizeEntries(entries);
  const dayCodeMap = new Map(
    dayCodes
      .filter((dayCode) => isAttendanceCode(dayCode.code))
      .map((dayCode) => [formatDateKey(dayCode.workDate), dayCode.code as AttendanceCode])
  );

  worksheet.getCell("B1").value = user.opNo;
  worksheet.getCell("E1").value = user.name;
  worksheet.getCell("H1").value = toReiwaYear(year);
  worksheet.getCell("J1").value = monthIndex + 1;
  writeTimeCell(worksheet.getCell("M1"), user.workStartTime);

  for (let day = 1; day <= maxDays; day += 1) {
    const rowNumber = firstDayRow + day - 1;
    const row = worksheet.getRow(rowNumber);

    if (day > monthDays.length) {
      clearRow(row);
      row.commit();
      continue;
    }

    const date = new Date(year, monthIndex, day);
    const dateKey = formatDateKey(date);
    const weekdayIndex = date.getDay();
    const isHoliday = weekdayIndex === 0 || weekdayIndex === 6 || isJapaneseHoliday(dateKey);
    const summary = summaries.get(dateKey);
    const cd = dayCodeMap.get(dateKey) ?? defaultAttendanceCode(isHoliday);

    clearRow(row);
    row.getCell(1).value = day;
    row.getCell(2).value = weekdays[weekdayIndex];
    row.getCell(3).value = cd;
    row.getCell(4).value = attendanceItemLabels[cd];
    writeTimeCell(row.getCell(8), summary?.startTime ?? "");
    writeTimeCell(row.getCell(9), summary?.endTime ?? "");
    formatWeekdayCell(row.getCell(2), weekdayIndex);
    row.commit();
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

function summarizeEntries(entries: WorkEntry[]): Map<string, DailySummary> {
  const grouped = new Map<string, WorkEntry[]>();
  for (const entry of entries) {
    const dateKey = formatDateKey(entry.workDate);
    grouped.set(dateKey, [...(grouped.get(dateKey) ?? []), entry]);
  }

  const summaries = new Map<string, DailySummary>();
  for (const [dateKey, dayEntries] of grouped) {
    const times = dayEntries
      .map((entry) => ({
        start: toMinutes(entry.startTime),
        end: toMinutes(entry.endTime)
      }))
      .filter((time): time is { start: number; end: number } => time.start !== null && time.end !== null && time.end > time.start);

    summaries.set(dateKey, {
      startTime: times.length > 0 ? formatTime(Math.min(...times.map((time) => time.start))) : "",
      endTime: times.length > 0 ? formatTime(Math.max(...times.map((time) => time.end))) : ""
    });
  }

  return summaries;
}

function clearRow(row: ExcelJS.Row): void {
  for (let column = 1; column <= lastColumn; column += 1) {
    row.getCell(column).value = null;
  }
}

function formatWeekdayCell(cell: ExcelJS.Cell, weekdayIndex: number): void {
  if (weekdayIndex !== 0 && weekdayIndex !== 6) {
    cell.fill = { type: "pattern", pattern: "none" };
    cell.font = { ...cell.font, color: { theme: 1 } };
    return;
  }

  cell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFFCE4D6" }
  };
  cell.font = { ...cell.font, color: { argb: "FFFF0000" } };
}

function writeTimeCell(cell: ExcelJS.Cell, value: string): void {
  cell.numFmt = "h:mm";
  cell.value = value ? toExcelTime(value) : null;
}

function toExcelTime(value: string): Date | string {
  const minutes = toMinutes(value);
  if (minutes === null) {
    return value;
  }

  return new Date(1899, 11, 30, Math.floor(minutes / 60), minutes % 60);
}

function toMinutes(time: string): number | null {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(time);
  if (!match) {
    return null;
  }

  return Number(match[1]) * 60 + Number(match[2]);
}

function formatTime(minutes: number): string {
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

function toReiwaYear(year: number): number {
  return year >= 2019 ? year - 2018 : year;
}
