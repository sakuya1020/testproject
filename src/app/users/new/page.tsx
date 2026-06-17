import Link from "next/link";
import { AppHeader } from "@/app/AppHeader";
import { createUser } from "@/app/actions";
import { UserForm } from "@/app/users/UserForm";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function NewUserPage() {
  const currentUser = await requireAdmin();

  return (
    <main className="page">
      <AppHeader currentUser={currentUser} />
      <header className="pageHeader">
        <div>
          <p className="eyebrow">Admin only</p>
          <h1>ユーザー新規登録</h1>
        </div>
        <Link className="downloadButton" href="/users">
          一覧へ戻る
        </Link>
      </header>
      <section className="settingsPanel">
        <UserForm action={createUser} />
      </section>
    </main>
  );
}
