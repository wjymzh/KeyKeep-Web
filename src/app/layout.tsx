import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "KeyKeep Web",
  description: "安全密码管理 - Web 端",
  icons: { icon: "/favicon.png" },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body className="antialiased min-h-screen">{children}</body>
    </html>
  );
}
