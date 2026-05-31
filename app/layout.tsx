import type { Metadata } from "next";
import "./globals.css";
import GeoBackground from "@/components/GeoBackground";

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
        {/* 네이버 나눔고딕 (헤드라인·본문 모두) */}
        <link
          href="https://fonts.googleapis.com/css2?family=Nanum+Gothic:wght@400;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <GeoBackground />
        {children}
      </body>
    </html>
  );
}
