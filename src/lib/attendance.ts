import type { WorkEntry } from "@prisma/client";

export type WorkEntryInput = {
  id?: number;
  date: string;
  rowIndex: number;
  orderCode: string;
  isTravel: boolean;
  process: string;
  detail: string;
  orderName: string;
  startTime: string;
  endTime: string;
  workContent: string;
};

export type WorkEntryView = WorkEntryInput & {
  id: number;
};

const halfWidthPattern = /^[\x20-\x7E]{0,9}$/;
const processPattern = /^[A-Za-z]{0,2}$/;
const detailPattern = /^\d{0,2}$/;
const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;

export function getMonthValue(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function parseMonthValue(month: string): { year: number; monthIndex: number; value: string } {
  const match = /^(\d{4})-(\d{2})$/.exec(month);
  if (!match) {
    return parseMonthValue(getMonthValue());
  }

  const year = Number(match[1]);
  const monthNumber = Number(match[2]);
  if (monthNumber < 1 || monthNumber > 12) {
    return parseMonthValue(getMonthValue());
  }

  return { year, monthIndex: monthNumber - 1, value: month };
}

export function monthRange(month: string): { start: Date; end: Date; value: string } {
  const parsed = parseMonthValue(month);
  return {
    start: new Date(parsed.year, parsed.monthIndex, 1),
    end: new Date(parsed.year, parsed.monthIndex + 1, 1),
    value: parsed.value
  };
}

export function formatDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function daysInMonth(month: string): Array<{ date: string; day: number; weekday: string; isWeekend: boolean }> {
  const { year, monthIndex } = parseMonthValue(month);
  const days: Array<{ date: string; day: number; weekday: string; isWeekend: boolean }> = [];
  const formatter = new Intl.DateTimeFormat("ja-JP", { weekday: "short" });

  for (let date = new Date(year, monthIndex, 1); date.getMonth() === monthIndex; date.setDate(date.getDate() + 1)) {
    const snapshot = new Date(date);
    const weekday = snapshot.getDay();
    days.push({
      date: formatDateKey(snapshot),
      day: snapshot.getDate(),
      weekday: formatter.format(snapshot),
      isWeekend: weekday === 0 || weekday === 6
    });
  }

  return days;
}

export function toWorkEntryView(entry: WorkEntry): WorkEntryView {
  return {
    id: entry.id,
    date: formatDateKey(entry.workDate),
    rowIndex: entry.rowIndex,
    orderCode: entry.orderCode,
    isTravel: entry.isTravel,
    process: entry.process,
    detail: entry.detail,
    orderName: entry.orderName,
    startTime: entry.startTime,
    endTime: entry.endTime,
    workContent: entry.workContent
  };
}

export function normalizeEntries(entries: WorkEntryInput[]): WorkEntryInput[] {
  return entries
    .filter(hasMeaningfulInput)
    .map((entry) => validateEntry(entry))
    .sort((a, b) => a.date.localeCompare(b.date) || a.rowIndex - b.rowIndex);
}

export function calculateWorkHours(startTime: string, endTime: string): string {
  if (!timePattern.test(startTime) || !timePattern.test(endTime)) {
    return "";
  }

  const start = toMinutes(startTime);
  const end = toMinutes(endTime);
  if (end <= start) {
    return "";
  }

  return ((end - start) / 60).toFixed(2);
}

export function workEntriesToCsv(entries: WorkEntry[]): string {
  const header = [
    "日付",
    "オーダー",
    "移動",
    "工程",
    "詳細",
    "オーダー名",
    "勤務開始時間",
    "勤務終了時間",
    "稼働時間",
    "作業内容"
  ];
  const rows = entries.map((entry) => [
    formatDateKey(entry.workDate),
    entry.orderCode,
    entry.isTravel ? "1" : "0",
    entry.process,
    entry.detail,
    entry.orderName,
    entry.startTime,
    entry.endTime,
    calculateWorkHours(entry.startTime, entry.endTime),
    entry.workContent
  ]);

  return [header, ...rows].map((row) => row.map(escapeCsv).join(",")).join("\r\n");
}

function validateEntry(entry: WorkEntryInput): WorkEntryInput {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(entry.date)) {
    throw new Error("日付が不正です。");
  }

  if (!halfWidthPattern.test(entry.orderCode)) {
    throw new Error("オーダーは半角9文字以内で入力してください。");
  }

  if (!processPattern.test(entry.process)) {
    throw new Error("工程はアルファベット2文字以内で入力してください。");
  }

  if (!detailPattern.test(entry.detail)) {
    throw new Error("詳細は数字2桁以内で入力してください。");
  }

  if ((entry.startTime && !timePattern.test(entry.startTime)) || (entry.endTime && !timePattern.test(entry.endTime))) {
    throw new Error("勤務時間は HH:mm 形式で入力してください。");
  }

  return {
    date: entry.date,
    rowIndex: entry.rowIndex,
    orderCode: entry.orderCode.trim(),
    isTravel: entry.isTravel,
    process: entry.process.trim().toUpperCase(),
    detail: entry.detail.trim(),
    orderName: entry.orderName.trim(),
    startTime: entry.startTime.trim(),
    endTime: entry.endTime.trim(),
    workContent: entry.workContent.trim()
  };
}

function hasMeaningfulInput(entry: WorkEntryInput): boolean {
  return Boolean(
    entry.orderCode.trim() ||
      entry.isTravel ||
      entry.process.trim() ||
      entry.detail.trim() ||
      entry.orderName.trim() ||
      entry.startTime.trim() ||
      entry.endTime.trim() ||
      entry.workContent.trim()
  );
}

function toMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function escapeCsv(value: string): string {
  if (!/[",\r\n]/.test(value)) {
    return value;
  }
  return `"${value.replaceAll("\"", "\"\"")}"`;
}
