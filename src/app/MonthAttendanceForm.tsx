"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { saveMonthlyEntries, type SaveMonthlyEntriesResult } from "@/app/actions";
import {
  calculateWorkHours,
  daysInMonth,
  type WorkEntryInput,
  type WorkEntryView
} from "@/lib/attendance";

type Props = {
  month: string;
  initialEntries: WorkEntryView[];
  orderOptions: Array<{
    orderNo: string;
    orderName: string;
  }>;
};

type MonthDay = {
  date: string;
  day: number;
  weekday: string;
  isWeekend: boolean;
};

type WeekGroup = {
  index: number;
  label: string;
  days: MonthDay[];
};

const openWeeksStorageKeyPrefix = "attendance-open-week-indexes";

export function MonthAttendanceForm({ month, initialEntries, orderOptions }: Props) {
  const [selectedMonth, setSelectedMonth] = useState(month);
  const [showWeekends, setShowWeekends] = useState(false);
  const [openWeeks, setOpenWeeks] = useState<Set<number>>(new Set());
  const [entries, setEntries] = useState<WorkEntryInput[]>(() => createInitialEntries(month, initialEntries));
  const [result, setResult] = useState<SaveMonthlyEntriesResult | null>(null);
  const [isPending, startTransition] = useTransition();
  const monthDays = useMemo(() => daysInMonth(month), [month]);
  const weekGroups = useMemo(() => groupDaysByWeek(monthDays), [monthDays]);
  const openWeeksStorageKey = `${openWeeksStorageKeyPrefix}:${month}`;

  useEffect(() => {
    const stored = window.localStorage.getItem(openWeeksStorageKey);
    if (!stored) {
      return;
    }

    try {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        setOpenWeeks(new Set(parsed.filter((value) => Number.isInteger(value))));
      }
    } catch {
      setOpenWeeks(new Set());
    }
  }, [openWeeksStorageKey]);

  function updateEntry(index: number, patch: Partial<WorkEntryInput>) {
    setEntries((current) => current.map((entry, entryIndex) => (entryIndex === index ? { ...entry, ...patch } : entry)));
  }

  function updateOrder(index: number, value: string) {
    const orderCode = toHalfWidth(value).slice(0, 9);
    const option = orderOptions.find((order) => order.orderNo === orderCode);
    updateEntry(index, {
      orderCode,
      ...(option ? { orderName: option.orderName } : {})
    });
  }

  function addRow(date: string) {
    setEntries((current) => {
      const dayRows = current.filter((entry) => entry.date === date);
      return [...current, createEmptyEntry(date, dayRows.length)];
    });
  }

  function toggleWeek(index: number) {
    setOpenWeeks((current) => {
      const next = new Set(current);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      window.localStorage.setItem(openWeeksStorageKey, JSON.stringify([...next].sort((a, b) => a - b)));
      return next;
    });
  }

  function submitEntries() {
    startTransition(async () => {
      setResult(await saveMonthlyEntries(month, entries));
    });
  }

  function moveMonth() {
    window.location.href = `/?month=${selectedMonth}`;
  }

  return (
    <div className="monthlyShell">
      <section className="toolbar" aria-label="年月設定">
        <label className="monthSelector">
          年月
          <input type="month" value={selectedMonth} onChange={(event) => setSelectedMonth(event.target.value)} />
        </label>
        <button type="button" onClick={moveMonth}>
          表示
        </button>
        <button type="button" className="secondaryButton" onClick={() => setShowWeekends((value) => !value)}>
          {showWeekends ? "土日を隠す" : "土日を表示"}
        </button>
        <button type="button" onClick={submitEntries} disabled={isPending}>
          {isPending ? "保存中" : "月次保存"}
        </button>
        <a className="downloadButton" href={`/api/attendance/excel?month=${month}`}>
          Excel
        </a>
        <a className="downloadButton secondaryDownloadButton" href={`/api/overtime/excel?month=${month}`}>
          残業申告書
        </a>
      </section>

      <datalist id="order-options">
        {orderOptions.map((order) => (
          <option value={order.orderNo} key={order.orderNo}>
            {order.orderName}
          </option>
        ))}
      </datalist>

      {result ? <p className={result.ok ? "notice success" : "notice error"}>{result.message}</p> : null}

      <section className="monthGrid" aria-label="週別入力欄">
        {weekGroups.map((week) => {
          const isOpen = openWeeks.has(week.index);
          const visibleDays = week.days.filter((day) => shouldShowDay(day, entries, showWeekends));
          const inputCount = countWeekInputs(week.days, entries);

          return (
            <section className="weekPanel" key={week.index}>
              <button
                type="button"
                className="weekHeader"
                aria-expanded={isOpen}
                onClick={() => toggleWeek(week.index)}
              >
                <span>{isOpen ? "▼" : "▶"}</span>
                <strong>{week.label}</strong>
                <span>{inputCount}件入力</span>
              </button>
              {isOpen ? (
                <div className="weekBody">
                  {visibleDays.length === 0 ? <p className="emptyWeek">表示対象の日がありません。</p> : null}
                  {visibleDays.map((day) => {
                    const dayEntries = entries
                      .map((entry, index) => ({ entry, index }))
                      .filter(({ entry }) => entry.date === day.date)
                      .sort((a, b) => a.entry.rowIndex - b.entry.rowIndex);

                    return (
                      <article className={day.isWeekend ? "dayPanel weekend" : "dayPanel"} key={day.date}>
                        <header className="dayHeader">
                          <div>
                            <h2>
                              {day.day}日 <span>{day.weekday}</span>
                            </h2>
                            <p>{day.date}</p>
                          </div>
                          <button type="button" className="secondaryButton" onClick={() => addRow(day.date)}>
                            行追加
                          </button>
                        </header>

                        <div className="entryTable">
                          <div className="entryHead">
                            <span>オーダー</span>
                            <span>移動</span>
                            <span>工程</span>
                            <span>詳細</span>
                            <span>オーダー名</span>
                            <span>開始</span>
                            <span>終了</span>
                            <span>稼働</span>
                            <span>作業内容</span>
                          </div>
                          {dayEntries.map(({ entry, index }) => (
                            <div className="entryRow" key={`${entry.date}-${entry.rowIndex}`}>
                              <input
                                aria-label={`${day.date} オーダー`}
                                list="order-options"
                                maxLength={9}
                                pattern="[\x20-\x7E]*"
                                value={entry.orderCode}
                                onChange={(event) => updateOrder(index, event.target.value)}
                              />
                              <label className="checkboxCell">
                                <input
                                  aria-label={`${day.date} 移動時間`}
                                  type="checkbox"
                                  checked={entry.isTravel}
                                  onChange={(event) => updateEntry(index, { isTravel: event.target.checked })}
                                />
                              </label>
                              <input
                                aria-label={`${day.date} 工程`}
                                maxLength={2}
                                value={entry.process}
                                onChange={(event) =>
                                  updateEntry(index, {
                                    process: event.target.value.replace(/[^A-Za-z]/g, "").slice(0, 2).toUpperCase()
                                  })
                                }
                              />
                              <input
                                aria-label={`${day.date} 詳細`}
                                inputMode="numeric"
                                maxLength={2}
                                value={entry.detail}
                                onChange={(event) => updateEntry(index, { detail: event.target.value.replace(/\D/g, "").slice(0, 2) })}
                              />
                              <input
                                aria-label={`${day.date} オーダー名`}
                                value={entry.orderName}
                                onChange={(event) => updateEntry(index, { orderName: event.target.value })}
                              />
                              <input
                                aria-label={`${day.date} 勤務開始時間`}
                                type="time"
                                value={entry.startTime}
                                onChange={(event) => updateEntry(index, { startTime: event.target.value })}
                              />
                              <input
                                aria-label={`${day.date} 勤務終了時間`}
                                type="time"
                                value={entry.endTime}
                                onChange={(event) => updateEntry(index, { endTime: event.target.value })}
                              />
                              <output>{calculateWorkHours(entry.startTime, entry.endTime)}</output>
                              <input
                                aria-label={`${day.date} 作業内容`}
                                value={entry.workContent}
                                onChange={(event) => updateEntry(index, { workContent: event.target.value })}
                              />
                            </div>
                          ))}
                        </div>
                      </article>
                    );
                  })}
                </div>
              ) : null}
            </section>
          );
        })}
      </section>
    </div>
  );
}

function groupDaysByWeek(days: MonthDay[]): WeekGroup[] {
  const groups: WeekGroup[] = [];
  let current: MonthDay[] = [];

  for (const day of days) {
    const weekdayIndex = new Date(`${day.date}T00:00:00`).getDay();
    if (current.length > 0 && weekdayIndex === 1) {
      groups.push(createWeekGroup(groups.length, current));
      current = [];
    }
    current.push(day);
  }

  if (current.length > 0) {
    groups.push(createWeekGroup(groups.length, current));
  }

  return groups;
}

function createWeekGroup(index: number, days: MonthDay[]): WeekGroup {
  const first = days[0];
  const last = days[days.length - 1];
  return {
    index,
    label: `第${index + 1}週 ${first.day}日-${last.day}日`,
    days
  };
}

function shouldShowDay(day: MonthDay, entries: WorkEntryInput[], showWeekends: boolean): boolean {
  return !day.isWeekend || showWeekends || entries.some((entry) => entry.date === day.date && hasInputValue(entry));
}

function countWeekInputs(days: MonthDay[], entries: WorkEntryInput[]): number {
  const dates = new Set(days.map((day) => day.date));
  return entries.filter((entry) => dates.has(entry.date) && hasInputValue(entry)).length;
}

function createInitialEntries(month: string, initialEntries: WorkEntryView[]): WorkEntryInput[] {
  const byDate = new Map<string, WorkEntryView[]>();
  for (const entry of initialEntries) {
    byDate.set(entry.date, [...(byDate.get(entry.date) ?? []), entry]);
  }

  return daysInMonth(month).flatMap((day) => {
    const stored = (byDate.get(day.date) ?? []).sort((a, b) => a.rowIndex - b.rowIndex);
    const minimumRows = Math.max(3, stored.length);
    return Array.from({ length: minimumRows }, (_, rowIndex) => stored[rowIndex] ?? createEmptyEntry(day.date, rowIndex));
  });
}

function createEmptyEntry(date: string, rowIndex: number): WorkEntryInput {
  return {
    date,
    rowIndex,
    orderCode: "",
    isTravel: false,
    process: "",
    detail: "",
    orderName: "",
    startTime: "",
    endTime: "",
    workContent: ""
  };
}

function hasInputValue(entry: WorkEntryInput): boolean {
  return Boolean(
    entry.orderCode ||
      entry.isTravel ||
      entry.process ||
      entry.detail ||
      entry.orderName ||
      entry.startTime ||
      entry.endTime ||
      entry.workContent
  );
}

function toHalfWidth(value: string): string {
  return value.replace(/[^\x20-\x7E]/g, "");
}
