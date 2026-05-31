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
        {/* 디스플레이/본문 세리프 = Nanum Myeongjo · 라벨/UI = Noto Sans KR */}
        <link
          href="https://fonts.googleapis.com/css2?family=Nanum+Myeongjo:wght@400;700;800&family=Noto+Sans+KR:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
