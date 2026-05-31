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
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        {/* 네이버 나눔글꼴 — 헤드라인=나눔명조, 본문/UI=나눔고딕 */}
        <link
          href="https://fonts.googleapis.com/css2?family=Nanum+Gothic:wght@400;700;800&family=Nanum+Myeongjo:wght@400;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
