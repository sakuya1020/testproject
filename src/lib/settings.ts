import type { OrderPreset, UserSetting } from "@prisma/client";
import { daysInMonth, type WorkEntryInput } from "@/lib/attendance";

export type OrderPresetInput = {
  displayOrder: number;
  orderNo: string;
  orderName: string;
  time1Start: string;
  time1End: string;
  time2Start: string;
  time2End: string;
};

export type SettingsView = {
  opNo: string;
  name: string;
  orders: OrderPresetInput[];
};

const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;

export function toSettingsView(setting: UserSetting | null, presets: OrderPreset[]): SettingsView {
  return {
    opNo: setting?.opNo ?? "",
    name: setting?.name ?? "",
    orders: Array.from({ length: 10 }, (_, index) => {
      const preset = presets.find((item) => item.displayOrder === index);
      return {
        displayOrder: index,
        orderNo: preset?.orderNo ?? "",
        orderName: preset?.orderName ?? "",
        time1Start: preset?.time1Start ?? "",
        time1End: preset?.time1End ?? "",
        time2Start: preset?.time2Start ?? "",
        time2End: preset?.time2End ?? ""
      };
    })
  };
}

export function parseSettingsForm(formData: FormData): SettingsView {
  const opNo = getString(formData, "opNo");
  const name = getString(formData, "name");

  if (!/^\d{0,3}$/.test(opNo)) {
    throw new Error("OP-NOは数値3桁以内で入力してください。");
  }

  const orders = Array.from({ length: 10 }, (_, index) => ({
    displayOrder: index,
    orderNo: getString(formData, `orderNo-${index}`),
    orderName: getString(formData, `orderName-${index}`),
    time1Start: getString(formData, `time1Start-${index}`),
    time1End: getString(formData, `time1End-${index}`),
    time2Start: getString(formData, `time2Start-${index}`),
    time2End: getString(formData, `time2End-${index}`)
  })).filter(hasPresetInput);

  for (const order of orders) {
    validatePreset(order);
  }

  return { opNo, name, orders };
}

export function buildInitializedEntries(params: {
  month: string;
  process: string;
  detail: string;
  preset: OrderPresetInput;
}): WorkEntryInput[] {
  const process = params.process.trim().toUpperCase();
  const detail = params.detail.trim();

  if (!/^[A-Za-z]{0,2}$/.test(process)) {
    throw new Error("工程はアルファベット2文字以内で入力してください。");
  }
  if (!/^\d{0,2}$/.test(detail)) {
    throw new Error("詳細は数字2桁以内で入力してください。");
  }

  return daysInMonth(params.month)
    .filter((day) => !day.isWeekend && !isJapaneseHoliday(day.date))
    .flatMap((day) => [
      createInitializedEntry(day.date, 0, params.preset, process, detail, params.preset.time1Start, params.preset.time1End),
      createInitializedEntry(day.date, 1, params.preset, process, detail, params.preset.time2Start, params.preset.time2End)
    ]);
}

export function isJapaneseHoliday(dateKey: string): boolean {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  const holidays = japaneseHolidaySet(year);
  return holidays.has(dateKey) || isSubstituteHoliday(date, holidays);
}

function createInitializedEntry(
  date: string,
  rowIndex: number,
  preset: OrderPresetInput,
  process: string,
  detail: string,
  startTime: string,
  endTime: string
): WorkEntryInput {
  return {
    date,
    rowIndex,
    orderCode: preset.orderNo,
    isTravel: false,
    process,
    detail,
    orderName: preset.orderName,
    startTime,
    endTime,
    workContent: ""
  };
}

function validatePreset(order: OrderPresetInput): void {
  if (!/^[\x20-\x7E]{0,9}$/.test(order.orderNo)) {
    throw new Error("オーダーNoは半角9文字以内で入力してください。");
  }

  for (const value of [order.time1Start, order.time1End, order.time2Start, order.time2End]) {
    if (value && !timePattern.test(value)) {
      throw new Error("時間は HH:mm 形式で入力してください。");
    }
  }
}

function hasPresetInput(order: OrderPresetInput): boolean {
  return Boolean(
    order.orderNo ||
      order.orderName ||
      order.time1Start ||
      order.time1End ||
      order.time2Start ||
      order.time2End
  );
}

function getString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function japaneseHolidaySet(year: number): Set<string> {
  const holidays = new Set<string>();
  addHoliday(holidays, year, 1, 1);
  addHoliday(holidays, year, 2, 11);
  addHoliday(holidays, year, 2, 23);
  addHoliday(holidays, year, 4, 29);
  addHoliday(holidays, year, 5, 3);
  addHoliday(holidays, year, 5, 4);
  addHoliday(holidays, year, 5, 5);
  addHoliday(holidays, year, 8, 11);
  addHoliday(holidays, year, 11, 3);
  addHoliday(holidays, year, 11, 23);
  addHappyMonday(holidays, year, 1, 2);
  addHappyMonday(holidays, year, 7, 3);
  addHappyMonday(holidays, year, 9, 3);
  addHappyMonday(holidays, year, 10, 2);
  addHoliday(holidays, year, 3, springEquinoxDay(year));
  addHoliday(holidays, year, 9, autumnEquinoxDay(year));
  return holidays;
}

function addHoliday(holidays: Set<string>, year: number, month: number, day: number): void {
  holidays.add(formatDate(year, month, day));
}

function addHappyMonday(holidays: Set<string>, year: number, month: number, week: number): void {
  const date = new Date(year, month - 1, 1);
  const offsetToMonday = (8 - date.getDay()) % 7;
  const day = 1 + offsetToMonday + (week - 1) * 7;
  addHoliday(holidays, year, month, day);
}

function isSubstituteHoliday(date: Date, holidays: Set<string>): boolean {
  if (date.getDay() === 0) {
    return false;
  }

  const previous = new Date(date);
  previous.setDate(previous.getDate() - 1);
  while (previous.getDay() !== 0) {
    if (!holidays.has(formatDate(previous.getFullYear(), previous.getMonth() + 1, previous.getDate()))) {
      return false;
    }
    previous.setDate(previous.getDate() - 1);
  }

  return holidays.has(formatDate(previous.getFullYear(), previous.getMonth() + 1, previous.getDate()));
}

function springEquinoxDay(year: number): number {
  return Math.floor(20.8431 + 0.242194 * (year - 1980) - Math.floor((year - 1980) / 4));
}

function autumnEquinoxDay(year: number): number {
  return Math.floor(23.2488 + 0.242194 * (year - 1980) - Math.floor((year - 1980) / 4));
}

function formatDate(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}
