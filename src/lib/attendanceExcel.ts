import "server-only";

import type { WorkEntry } from "@prisma/client";
import ExcelJS from "exceljs";
import path from "node:path";
import { daysInMonth, formatDateKey, parseMonthValue } from "@/lib/attendance";

type UserInfo = {
  opNo: string;
  name: string;
};

type MonthDay = ReturnType<typeof daysInMonth>[number];

const templatePath = path.join(process.cwd(), "templates", "attendance-template.xlsx");
const weekSheetNames = ["1週目", "2週目", "3週目", "4週目", "5週目", "6週目"];
const dataStartRow = 7;
const dataEndColumn = 10;
const clearRows = 120;

export async function buildAttendanceExcel(entries: WorkEntry[], month: string, user: UserInfo): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(templatePath);

  const { year, monthIndex } = parseMonthValue(month);
  const entriesByDate = new Map<string, WorkEntry[]>();
  for (const entry of entries) {
    const dateKey = formatDateKey(entry.workDate);
    entriesByDate.set(dateKey, [...(entriesByDate.get(dateKey) ?? []), entry]);
  }

  const weeks = groupDaysByWeek(daysInMonth(month));
  for (const sheetName of weekSheetNames.slice(weeks.length)) {
    const unusedSheet = workbook.getWorksheet(sheetName);
    if (unusedSheet) {
      workbook.removeWorksheet(unusedSheet.id);
    }
  }

  weeks.forEach((week, index) => {
    const worksheet = workbook.getWorksheet(weekSheetNames[index]);
    if (!worksheet) {
      return;
    }

    worksheet.name = `${index + 1}週目`;
    worksheet.getCell("B3").value = user.opNo;
    worksheet.getCell("B4").value = user.name;
    worksheet.getCell("D4").value = year;
    worksheet.getCell("F4").value = monthIndex + 1;
    worksheet.getCell("H4").value = index + 1;
    worksheet.getCell("I4").value = "週";
    worksheet.getCell("F6").value = "オーダー名";
    clearDataRows(worksheet);

    const rows = week.flatMap((day) => entriesByDate.get(day.date) ?? []);
    rows.forEach((entry, rowIndex) => {
      const row = worksheet.getRow(dataStartRow + rowIndex);
      const values = [
        formatReportDate(entry.workDate),
        entry.orderCode,
        entry.isTravel ? "1" : "",
        entry.process,
        entry.detail,
        entry.orderName,
        entry.startTime,
        entry.endTime,
        entry.workContent,
        formatWorkDuration(entry.startTime, entry.endTime)
      ];
      copyRowStyle(worksheet, 6, dataStartRow + rowIndex);
      values.forEach((value, columnIndex) => {
        row.getCell(columnIndex + 1).value = value;
      });
      row.commit();
    });

    fitColumnsToContent(worksheet);
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

function groupDaysByWeek(days: MonthDay[]): MonthDay[][] {
  const groups: MonthDay[][] = [];
  let current: MonthDay[] = [];

  for (const day of days) {
    const weekdayIndex = new Date(`${day.date}T00:00:00`).getDay();
    if (current.length > 0 && weekdayIndex === 1) {
      groups.push(current);
      current = [];
    }
    current.push(day);
  }

  if (current.length > 0) {
    groups.push(current);
  }

  return groups;
}

function clearDataRows(worksheet: ExcelJS.Worksheet) {
  for (let rowNumber = dataStartRow; rowNumber < dataStartRow + clearRows; rowNumber += 1) {
    const row = worksheet.getRow(rowNumber);
    for (let columnNumber = 1; columnNumber <= dataEndColumn; columnNumber += 1) {
      row.getCell(columnNumber).value = null;
    }
  }
}

function copyRowStyle(worksheet: ExcelJS.Worksheet, sourceRowNumber: number, targetRowNumber: number) {
  const sourceRow = worksheet.getRow(sourceRowNumber);
  const targetRow = worksheet.getRow(targetRowNumber);
  targetRow.height = sourceRow.height;

  for (let columnNumber = 1; columnNumber <= dataEndColumn; columnNumber += 1) {
    const sourceCell = sourceRow.getCell(columnNumber);
    const targetCell = targetRow.getCell(columnNumber);
    targetCell.style = { ...sourceCell.style };
    targetCell.fill = { type: "pattern", pattern: "none" };
  }
}

function formatReportDate(date: Date): string {
  const weekdays = ["日", "月", "火", "水", "木", "金", "土"];
  return `${date.getMonth() + 1}/${date.getDate()}(${weekdays[date.getDay()]}曜)`;
}

function formatWorkDuration(startTime: string, endTime: string): string {
  const start = toMinutes(startTime);
  const end = toMinutes(endTime);
  if (start === null || end === null || end <= start) {
    return "";
  }

  const duration = end - start;
  return `${Math.floor(duration / 60)}:${String(duration % 60).padStart(2, "0")}`;
}

function toMinutes(time: string): number | null {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(time);
  if (!match) {
    return null;
  }

  return Number(match[1]) * 60 + Number(match[2]);
}

function fitColumnsToContent(worksheet: ExcelJS.Worksheet): void {
  for (let columnNumber = 1; columnNumber <= dataEndColumn; columnNumber += 1) {
    let maxWidth = 0;
    worksheet.getColumn(columnNumber).eachCell({ includeEmpty: false }, (cell) => {
      maxWidth = Math.max(maxWidth, measureTextWidth(cell.text));
    });
    worksheet.getColumn(columnNumber).width = Math.min(Math.max(maxWidth + 2, 4), 42);
  }
}

function measureTextWidth(value: string): number {
  return [...value].reduce((width, character) => width + (character.charCodeAt(0) > 255 ? 2 : 1), 0);
}
