import type { Attendance } from "@prisma/client";

export type AttendanceInput = {
  name: string;
  workDate: Date;
  clockIn: string;
  clockOut: string;
  breakMinutes: number;
  note: string | null;
};

const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;

export function parseAttendanceForm(formData: FormData): AttendanceInput {
  const name = getRequiredString(formData, "name", "氏名");
  const workDateValue = getRequiredString(formData, "workDate", "勤務日");
  const clockIn = getRequiredString(formData, "clockIn", "出勤時刻");
  const clockOut = getRequiredString(formData, "clockOut", "退勤時刻");
  const breakMinutesValue = getRequiredString(formData, "breakMinutes", "休憩時間");
  const noteValue = getString(formData, "note");

  if (!timePattern.test(clockIn) || !timePattern.test(clockOut)) {
    throw new Error("時刻は HH:mm 形式で入力してください。");
  }

  const breakMinutes = Number(breakMinutesValue);
  if (!Number.isInteger(breakMinutes) || breakMinutes < 0) {
    throw new Error("休憩時間は0以上の分数で入力してください。");
  }

  const workDate = new Date(`${workDateValue}T00:00:00`);
  if (Number.isNaN(workDate.getTime())) {
    throw new Error("勤務日を正しく入力してください。");
  }

  return {
    name,
    workDate,
    clockIn,
    clockOut,
    breakMinutes,
    note: noteValue.length > 0 ? noteValue : null
  };
}

export function formatDateInput(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function formatBreak(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) {
    return `${rest}分`;
  }
  if (rest === 0) {
    return `${hours}時間`;
  }
  return `${hours}時間${rest}分`;
}

export function attendanceToCsv(records: Attendance[]): string {
  const header = ["氏名", "勤務日", "出勤時刻", "退勤時刻", "休憩時間", "備考"];
  const rows = records.map((record) => [
    record.name,
    formatDateInput(record.workDate),
    record.clockIn,
    record.clockOut,
    String(record.breakMinutes),
    record.note ?? ""
  ]);

  return [header, ...rows].map((row) => row.map(escapeCsv).join(",")).join("\r\n");
}

function getRequiredString(formData: FormData, key: string, label: string): string {
  const value = getString(formData, key);
  if (value.length === 0) {
    throw new Error(`${label}を入力してください。`);
  }
  return value;
}

function getString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function escapeCsv(value: string): string {
  if (!/[",\r\n]/.test(value)) {
    return value;
  }
  return `"${value.replaceAll("\"", "\"\"")}"`;
}
