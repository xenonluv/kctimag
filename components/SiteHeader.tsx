import Link from "next/link";
import { latestSpecial } from "@/lib/special";

export default function SiteHeader() {
  const special = latestSpecial();
  return (
    <header className="no-print sticky top-0 z-20 border-b border-white/10 bg-[#0b0f18]/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-4xl items-center justify-between px-5 py-4">
        <Link
          href="/"
          className="on-navy font-serif font-bold leading-tight tracking-tight"
        >
          <span className="block text-[11px] font-normal text-neutral-400">
            한국문화기술연구소 발행
          </span>
          <span className="block text-lg">
            주간 한국문화 AI 큐레이션 뉴스모음<span className="text-accent">.</span>
          </span>
        </Link>
        <nav className="flex flex-wrap items-center justify-end gap-x-3 gap-y-2 text-sm text-neutral-300">
          <Link href="/" className="hover:text-accent">
            홈
          </Link>
          {special && (
            <Link
              href={`/special/${special.meta.slug}`}
              className="hover:text-accent"
            >
              특별기획
            </Link>
          )}
          <Link
            href="/events"
            className="rounded-full border border-amber-300/50 bg-amber-400 px-3.5 py-1.5 font-bold text-[#191006] shadow-[0_0_18px_rgba(251,191,36,0.24)] hover:bg-orange-300"
          >
            다음 주 이벤트
          </Link>
          <Link href="/#subscribe" className="hover:text-accent">
            구독
          </Link>
        </nav>
      </div>
    </header>
  );
}
