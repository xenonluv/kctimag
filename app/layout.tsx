import type { Metadata } from "next";
import "./globals.css";
import GeoBackground from "@/components/GeoBackground";

export const metadata: Metadata = {
  title: "KCTI - 주간 한국문화 AI 큐레이션 뉴스모음",
  description:
    "AI가 매주 한국 문화 뉴스를 엄선해 발행하는 주간 큐레이션 뉴스모음 (Korean Culture Times)",
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
