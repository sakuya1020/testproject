import Link from "next/link";
import { AppHeader } from "@/app/AppHeader";
import { SettingsForm } from "@/app/settings/SettingsForm";
import { getMonthValue } from "@/lib/attendance";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { toSettingsView } from "@/lib/settings";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const currentUser = await requireUser();
  const [setting, presets] = await Promise.all([
    prisma.userSetting.findUnique({ where: { id: 1 } }),
    prisma.orderPreset.findMany({ orderBy: [{ displayOrder: "asc" }, { id: "asc" }] })
  ]);

  return (
    <main className="page">
      <AppHeader currentUser={currentUser} />
      <header className="pageHeader">
        <div>
          <p className="eyebrow">Attendance settings</p>
          <h1>設定</h1>
        </div>
        <Link className="downloadButton" href="/">
          勤怠入力へ
        </Link>
      </header>
      <SettingsForm settings={toSettingsView(setting, presets)} currentMonth={getMonthValue()} />
    </main>
  );
}
