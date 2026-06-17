import type { User } from "@prisma/client";

type Props = {
  action: (formData: FormData) => Promise<void>;
  user?: Pick<User, "id" | "loginId" | "name" | "opNo" | "isAdmin">;
};

export function UserForm({ action, user }: Props) {
  return (
    <form action={action} className="userForm">
      {user ? <input name="id" type="hidden" value={user.id} /> : null}
      <label>
        ID
        <input name="loginId" maxLength={50} defaultValue={user?.loginId ?? ""} required />
      </label>
      <label>
        パスワード
        <input name="password" type="password" required={!user} />
      </label>
      <label>
        氏名
        <input name="name" defaultValue={user?.name ?? ""} required />
      </label>
      <label>
        OP-No
        <input name="opNo" maxLength={20} defaultValue={user?.opNo ?? ""} required />
      </label>
      <label className="checkboxLabel">
        <input name="isAdmin" type="checkbox" defaultChecked={user?.isAdmin ?? false} />
        管理者
      </label>
      <div className="formActions">
        <button type="submit">{user ? "保存" : "登録"}</button>
      </div>
    </form>
  );
}
