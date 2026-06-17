"use client";

import { useActionState } from "react";
import { login, type ActionResult } from "@/app/actions";

const initialState: ActionResult = {
  ok: false,
  message: ""
};

export function LoginForm() {
  const [result, formAction, isPending] = useActionState(login, initialState);

  return (
    <form action={formAction} className="loginForm">
      {result.message ? <p className={result.ok ? "notice success" : "notice error"}>{result.message}</p> : null}
      <label>
        ID
        <input name="loginId" autoComplete="username" required />
      </label>
      <label>
        パスワード
        <input name="password" type="password" autoComplete="current-password" required />
      </label>
      <button type="submit" disabled={isPending}>
        ログイン
      </button>
    </form>
  );
}
