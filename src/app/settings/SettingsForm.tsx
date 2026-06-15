"use client";

import { useRef, useState, useTransition } from "react";
import { initializeMonthlyEntries, saveSettings, type ActionResult } from "@/app/actions";
import type { SettingsView } from "@/lib/settings";

type Props = {
  settings: SettingsView;
  currentMonth: string;
};

export function SettingsForm({ settings, currentMonth }: Props) {
  const settingsFormRef = useRef<HTMLFormElement>(null);
  const initializeFormRef = useRef<HTMLFormElement>(null);
  const [settingsResult, setSettingsResult] = useState<ActionResult | null>(null);
  const [initializeResult, setInitializeResult] = useState<ActionResult | null>(null);
  const [isPending, startTransition] = useTransition();
  const selectableOrders = settings.orders.filter((order) => order.orderNo);

  function submitSettings() {
    const form = settingsFormRef.current;
    if (!form) {
      return;
    }

    startTransition(async () => {
      setSettingsResult(await saveSettings(new FormData(form)));
    });
  }

  function submitInitialize() {
    const form = initializeFormRef.current;
    if (!form) {
      return;
    }

    startTransition(async () => {
      setInitializeResult(await initializeMonthlyEntries(new FormData(form)));
    });
  }

  return (
    <div className="settingsShell">
      <section className="settingsPanel" aria-labelledby="basic-settings">
        <div className="sectionHeader">
          <h2 id="basic-settings">基本設定</h2>
          <button type="button" onClick={submitSettings} disabled={isPending}>
            設定保存
          </button>
        </div>
        {settingsResult ? <p className={settingsResult.ok ? "notice success" : "notice error"}>{settingsResult.message}</p> : null}
        <form ref={settingsFormRef} className="settingsForm">
          <label>
            OP-NO
            <input name="opNo" inputMode="numeric" maxLength={3} pattern="\d{0,3}" defaultValue={settings.opNo} />
          </label>
          <label>
            氏名
            <input name="name" defaultValue={settings.name} />
          </label>
          <label>
            作業開始時間
            <input name="workStartTime" type="time" defaultValue={settings.workStartTime} />
          </label>
          <label>
            作業終了時間
            <input name="workEndTime" type="time" defaultValue={settings.workEndTime} />
          </label>

          <div className="presetTable">
            <div className="presetHead">
              <span>No.</span>
              <span>オーダーNo</span>
              <span>オーダー名</span>
              <span>時間1 開始</span>
              <span>時間1 終了</span>
              <span>時間2 開始</span>
              <span>時間2 終了</span>
            </div>
            {settings.orders.map((order, index) => (
              <div className="presetRow" key={index}>
                <span>{index + 1}</span>
                <input
                  name={`orderNo-${index}`}
                  maxLength={9}
                  pattern="[\x20-\x7E]*"
                  defaultValue={order.orderNo}
                />
                <input name={`orderName-${index}`} defaultValue={order.orderName} />
                <input name={`time1Start-${index}`} type="time" defaultValue={order.time1Start} />
                <input name={`time1End-${index}`} type="time" defaultValue={order.time1End} />
                <input name={`time2Start-${index}`} type="time" defaultValue={order.time2Start} />
                <input name={`time2End-${index}`} type="time" defaultValue={order.time2End} />
              </div>
            ))}
          </div>
        </form>
      </section>

      <section className="settingsPanel" aria-labelledby="initialize-settings">
        <div className="sectionHeader">
          <h2 id="initialize-settings">月次初期化</h2>
          <button type="button" onClick={submitInitialize} disabled={isPending || selectableOrders.length === 0}>
            初期化実行
          </button>
        </div>
        {initializeResult ? (
          <p className={initializeResult.ok ? "notice success" : "notice error"}>{initializeResult.message}</p>
        ) : null}
        <form ref={initializeFormRef} className="initializeForm">
          <label>
            年月
            <input name="month" type="month" defaultValue={currentMonth} />
          </label>
          <label>
            工程
            <input name="process" maxLength={2} pattern="[A-Za-z]{0,2}" />
          </label>
          <label>
            詳細
            <input name="detail" inputMode="numeric" maxLength={2} pattern="\d{0,2}" />
          </label>
          <label>
            オーダーNo
            <select name="orderNo" defaultValue="">
              <option value="">選択</option>
              {selectableOrders.map((order) => (
                <option value={order.orderNo} key={`${order.displayOrder}-${order.orderNo}`}>
                  {order.orderNo} {order.orderName}
                </option>
              ))}
            </select>
          </label>
        </form>
      </section>
    </div>
  );
}
