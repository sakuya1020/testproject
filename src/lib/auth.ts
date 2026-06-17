import { createHash } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

export type CurrentUser = {
  id: number;
  loginId: string;
  name: string;
  opNo: string;
  isAdmin: boolean;
};

const SESSION_COOKIE = "attendance_user_id";

export function hashPassword(password: string): string {
  return createHash("sha256").update(password).digest("hex");
}

export async function ensureInitialAdmin(): Promise<void> {
  const admin = await prisma.user.findUnique({
    where: { loginId: "admin" },
    select: { id: true }
  });

  if (admin) {
    return;
  }

  await prisma.user.create({
    data: {
      loginId: "admin",
      passwordHash: hashPassword("admin"),
      name: "管理者",
      opNo: "admin",
      isAdmin: true
    }
  });
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  await ensureInitialAdmin();
  const cookieStore = await cookies();
  const userId = Number(cookieStore.get(SESSION_COOKIE)?.value);

  if (!Number.isInteger(userId) || userId <= 0) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      loginId: true,
      name: true,
      opNo: true,
      isAdmin: true
    }
  });

  return user;
}

export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}

export async function requireAdmin(): Promise<CurrentUser> {
  const user = await requireUser();

  if (!user.isAdmin) {
    redirect("/");
  }

  return user;
}

export async function signIn(userId: number): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, String(userId), {
    httpOnly: true,
    sameSite: "lax",
    path: "/"
  });
}

export async function signOut(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}
