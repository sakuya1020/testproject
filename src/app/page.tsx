import { createAttendance, deleteAttendance, updateAttendance } from "@/app/actions";
import { formatBreak, formatDateInput } from "@/lib/attendance";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function Home() {
  const records = await prisma.attendance.findMany({
    orderBy: [{ workDate: "desc" }, { id: "desc" }]
  });

  return (
    <main className="page">
      <header className="pageHeader">
        <div>
          <p className="eyebrow">Attendance prototype</p>
          <h1>勤怠入力</h1>
        </div>
        <a className="downloadButton" href="/api/attendance/csv">
          CSVダウンロード
        </a>
      </header>

      <section className="panel" aria-labelledby="create-heading">
        <h2 id="create-heading">新規入力</h2>
        <form action={createAttendance} className="formGrid">
          <label>
            氏名
            <input name="name" type="text" required placeholder="山田 太郎" />
          </label>
          <label>
            勤務日
            <input name="workDate" type="date" required />
          </label>
          <label>
            出勤時刻
            <input name="clockIn" type="time" required />
          </label>
          <label>
            退勤時刻
            <input name="clockOut" type="time" required />
          </label>
          <label>
            休憩時間（分）
            <input name="breakMinutes" type="number" min="0" step="1" defaultValue="60" required />
          </label>
          <label className="wide">
            備考
            <input name="note" type="text" placeholder="任意" />
          </label>
          <div className="actions wide">
            <button type="submit">保存</button>
          </div>
        </form>
      </section>

      <section className="panel" aria-labelledby="list-heading">
        <div className="sectionHeader">
          <h2 id="list-heading">保存済みデータ</h2>
          <span>{records.length}件</span>
        </div>

        {records.length === 0 ? (
          <p className="empty">まだ勤怠データはありません。</p>
        ) : (
          <div className="tableWrap">
            <table>
              <thead>
                <tr>
                  <th>氏名</th>
                  <th>勤務日</th>
                  <th>出勤</th>
                  <th>退勤</th>
                  <th>休憩</th>
                  <th>備考</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {records.map((record) => (
                  <tr key={record.id}>
                    <td colSpan={7}>
                      <details>
                        <summary>
                          <span>{record.name}</span>
                          <span>{formatDateInput(record.workDate)}</span>
                          <span>{record.clockIn}</span>
                          <span>{record.clockOut}</span>
                          <span>{formatBreak(record.breakMinutes)}</span>
                          <span>{record.note || "-"}</span>
                          <span>編集</span>
                        </summary>
                        <form action={updateAttendance} className="editGrid">
                          <input type="hidden" name="id" value={record.id} />
                          <label>
                            氏名
                            <input name="name" type="text" defaultValue={record.name} required />
                          </label>
                          <label>
                            勤務日
                            <input
                              name="workDate"
                              type="date"
                              defaultValue={formatDateInput(record.workDate)}
                              required
                            />
                          </label>
                          <label>
                            出勤時刻
                            <input name="clockIn" type="time" defaultValue={record.clockIn} required />
                          </label>
                          <label>
                            退勤時刻
                            <input name="clockOut" type="time" defaultValue={record.clockOut} required />
                          </label>
                          <label>
                            休憩時間（分）
                            <input
                              name="breakMinutes"
                              type="number"
                              min="0"
                              step="1"
                              defaultValue={record.breakMinutes}
                              required
                            />
                          </label>
                          <label>
                            備考
                            <input name="note" type="text" defaultValue={record.note ?? ""} />
                          </label>
                          <div className="rowActions">
                            <button type="submit">更新</button>
                          </div>
                        </form>
                        <form action={deleteAttendance} className="deleteForm">
                          <input type="hidden" name="id" value={record.id} />
                          <button type="submit">削除</button>
                        </form>
                      </details>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
