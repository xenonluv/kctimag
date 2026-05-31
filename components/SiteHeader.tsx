import Link from "next/link";

export default function SiteHeader() {
  return (
    <header className="no-print border-b border-neutral-200 bg-paper">
      <div className="mx-auto flex max-w-4xl items-center justify-between px-5 py-4">
        <Link href="/" className="font-serif text-xl font-bold tracking-tight">
          KCT<span className="text-accent">.</span>
          <span className="ml-2 align-middle text-xs font-normal text-neutral-500">
            주간 한국 문화 매거진
          </span>
        </Link>
        <nav className="flex gap-4 text-sm">
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
