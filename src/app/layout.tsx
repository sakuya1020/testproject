import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "勤怠入力プロトタイプ",
  description: "Next.js, TypeScript, Prisma, SQLite attendance prototype"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
