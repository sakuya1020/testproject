import Link from "next/link";
import { logout } from "@/app/actions";
import type { CurrentUser } from "@/lib/auth";

type Props = {
  currentUser: CurrentUser;
};

export function AppHeader({ currentUser }: Props) {
  return (
    <div className="appHeader">
      <div>
        <p className="eyebrow">ログイン中</p>
        <p className="currentUser">
          {currentUser.name} / OP-No {currentUser.opNo}
        </p>
      </div>
      <nav className="appNav" aria-label="メインメニュー">
        <Link className="secondaryButton navLink" href="/">
          勤怠入力
        </Link>
        <Link className="secondaryButton navLink" href="/settings">
          設定
        </Link>
        {currentUser.isAdmin ? (
          <Link className="secondaryButton navLink" href="/users">
            ユーザー管理
          </Link>
        ) : null}
        <form action={logout}>
          <button className="dangerButton" type="submit">
            ログアウト
          </button>
        </form>
      </nav>
    </div>
  );
}
