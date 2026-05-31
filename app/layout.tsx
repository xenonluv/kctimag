import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "KCT — 주간 한국 문화 매거진",
  description: "주 1회 발행되는 한국 문화 전반 큐레이션 매거진 (Korean Culture Times)",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
