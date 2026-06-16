import "server-only";

import type { WorkEntry } from "@prisma/client";
import ExcelJS from "exceljs";
import path from "node:path";
import { calculateWorkHours, formatDateKey, parseMonthValue } from "@/lib/attendance";

type UserInfo = {
  opNo: string;
  name: string;
};

const templatePath = path.join(process.cwd(), "templates", "attendance-template.xlsx");
const weekSheetNames = ["1週目", "2週目", "3週目", "4週目", "5週目", "6週目"];
const dataStartRow = 7;
const dataEndColumn = 10;
const clearRows = 120;

export async function buildAttendanceExcel(entries: WorkEntry[], month: string, user: UserInfo): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(templatePath);

  const { year, monthIndex } = parseMonthValue(month);
  const worksheet = workbook.getWorksheet(weekSheetNames[0]) ?? workbook.worksheets[0];
  if (!worksheet) {
    throw new Error("週次作業報告書テンプレートにシートが見つかりません。");
  }

  for (const sheetName of weekSheetNames.slice(1)) {
    const extraSheet = workbook.getWorksheet(sheetName);
    if (extraSheet) {
      workbook.removeWorksheet(extraSheet.id);
    }
  }

  worksheet.name = "1ヶ月分";
  worksheet.getCell("B3").value = user.opNo;
  worksheet.getCell("B4").value = user.name;
  worksheet.getCell("D4").value = year;
  worksheet.getCell("F4").value = monthIndex + 1;
  worksheet.getCell("H4").value = "";
  worksheet.getCell("I4").value = "";
  worksheet.getCell("F6").value = "オーダー名";
  clearDataRows(worksheet);

  entries.forEach((entry, rowIndex) => {
    const row = worksheet.getRow(dataStartRow + rowIndex);
    const values = [
      formatSlashDate(entry.workDate),
      entry.orderCode,
      entry.isTravel ? "1" : "",
      entry.process,
      entry.detail,
      entry.orderName,
      entry.startTime,
      entry.endTime,
      entry.workContent,
      calculateWorkHours(entry.startTime, entry.endTime)
    ];
    copyRowStyle(worksheet, 6, dataStartRow + rowIndex);
    values.forEach((value, columnIndex) => {
      row.getCell(columnIndex + 1).value = value;
    });
    row.commit();
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
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

function formatSlashDate(date: Date): string {
  return formatDateKey(date).replaceAll("-", "/");
}
