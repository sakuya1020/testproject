import Link from "next/link";
import { notFound } from "next/navigation";
import { AppHeader } from "@/app/AppHeader";
import { updateUser } from "@/app/actions";
import { UserForm } from "@/app/users/UserForm";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function EditUserPage({ params }: PageProps) {
  const currentUser = await requireAdmin();
  const { id } = await params;
  const userId = Number(id);

  if (!Number.isInteger(userId)) {
    notFound();
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (!user) {
    notFound();
  }

  return (
    <main className="page">
      <AppHeader currentUser={currentUser} />
      <header className="pageHeader">
        <div>
          <p className="eyebrow">Admin only</p>
          <h1>ユーザー変更</h1>
        </div>
        <Link className="downloadButton" href="/users">
          一覧へ戻る
        </Link>
      </header>
      <section className="settingsPanel">
        <UserForm action={updateUser} user={user} />
      </section>
    </main>
  );
}
