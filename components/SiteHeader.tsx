import Link from "next/link";

export default function SiteHeader() {
  return (
    <header className="no-print sticky top-0 z-20 border-b border-white/10 bg-[#0b0f18]/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-4xl items-center justify-between px-5 py-4">
        <Link href="/" className="on-navy font-serif text-xl font-bold tracking-tight">
          KCT<span className="text-accent">.</span>
          <span className="ml-2 align-middle text-xs font-normal text-neutral-400">
            주간 한국 문화 매거진
          </span>
        </Link>
        <nav className="flex gap-4 text-sm text-neutral-300">
          <Link href="/" className="hover:text-accent">
            홈
          </Link>
          <Link href="/#subscribe" className="hover:text-accent">
            구독
          </Link>
        </nav>
      </div>
    </header>
  );
}
