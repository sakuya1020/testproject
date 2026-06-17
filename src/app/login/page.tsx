import { redirect } from "next/navigation";
import { LoginForm } from "@/app/login/LoginForm";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const currentUser = await getCurrentUser();

  if (currentUser) {
    redirect("/");
  }

  return (
    <main className="loginPage">
      <section className="loginPanel" aria-labelledby="login-title">
        <p className="eyebrow">Attendance prototype</p>
        <h1 id="login-title">ログイン</h1>
        <p className="loginLead">IDとパスワードを入力してください。</p>
        <LoginForm />
      </section>
    </main>
  );
}
