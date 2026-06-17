import Link from "next/link";
import { AppHeader } from "@/app/AppHeader";
import { deleteUser } from "@/app/actions";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const currentUser = await requireAdmin();
  const users = await prisma.user.findMany({
    orderBy: [{ isAdmin: "desc" }, { id: "asc" }]
  });

  return (
    <main className="page">
      <AppHeader currentUser={currentUser} />
      <header className="pageHeader">
        <div>
          <p className="eyebrow">Admin only</p>
          <h1>ユーザー一覧</h1>
        </div>
        <Link className="downloadButton" href="/users/new">
          新規登録
        </Link>
      </header>

      <section className="settingsPanel">
        <div className="userTable" role="table" aria-label="ユーザー一覧">
          <div className="userTableHead" role="row">
            <span>ID</span>
            <span>氏名</span>
            <span>OP-No</span>
            <span>権限</span>
            <span>操作</span>
          </div>
          {users.map((user) => (
            <div className="userTableRow" role="row" key={user.id}>
              <span>{user.loginId}</span>
              <span>{user.name}</span>
              <span>{user.opNo}</span>
              <span>{user.isAdmin ? "管理者" : "一般"}</span>
              <span className="userActions">
                <Link className="secondaryButton navLink" href={`/users/${user.id}/edit`}>
                  変更
                </Link>
                <form action={deleteUser}>
                  <input name="id" type="hidden" value={user.id} />
                  <button className="dangerButton" type="submit" disabled={user.id === currentUser.id}>
                    削除
                  </button>
                </form>
              </span>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
