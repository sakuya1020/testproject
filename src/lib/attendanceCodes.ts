export const attendanceCodeOptions = [
  { code: "00", label: "出勤" },
  { code: "04", label: "代休" },
  { code: "11", label: "有給" },
  { code: "12", label: "午前有給" },
  { code: "13", label: "午後有給" },
  { code: "51", label: "夏季休暇" },
  { code: "98", label: "休日出勤" },
  { code: "99", label: "休日" }
] as const;

export type AttendanceCode = (typeof attendanceCodeOptions)[number]["code"];

export type DailyAttendanceCodeInput = {
  date: string;
  code: AttendanceCode;
};

export const attendanceCodeLabels: Record<AttendanceCode, string> = Object.fromEntries(
  attendanceCodeOptions.map((option) => [option.code, option.label])
) as Record<AttendanceCode, string>;

export const nonEditableAttendanceCodes = new Set<AttendanceCode>(["11", "12", "13", "51"]);

const attendanceCodeSet = new Set<string>(attendanceCodeOptions.map((option) => option.code));

export function isAttendanceCode(value: string): value is AttendanceCode {
  return attendanceCodeSet.has(value);
}

export function defaultAttendanceCode(isHoliday: boolean): AttendanceCode {
  return isHoliday ? "99" : "00";
}
