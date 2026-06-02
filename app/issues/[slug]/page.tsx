import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { allSlugs, readIssue } from "@/lib/content";
import IssueView from "@/components/IssueView";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";

export const dynamic = "force-static";

export function generateStaticParams() {
  return allSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const issue = readIssue(slug);
  if (!issue) return {};
  return {
    title: `${issue.meta.title} — KCTI`,
    description: issue.meta.dek,
    openGraph: {
      title: issue.meta.title,
      description: issue.meta.dek,
      images: issue.meta.coverImageUrl ? [issue.meta.coverImageUrl] : [],
    },
  };
}

export default async function IssuePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const issue = readIssue(slug);
  if (!issue) notFound();

  return (
    <>
      <SiteHeader />
      <div className="no-print mx-auto flex max-w-3xl items-center gap-3 px-5 pt-6">
        {issue.meta.pdfUrl ? (
          <a
            href={`${issue.meta.pdfUrl}?download=KCT-${slug}.pdf&v=${encodeURIComponent(issue.generatedAt)}`}
            className="inline-flex items-center gap-1 rounded-full bg-accent px-4 py-1.5 text-sm font-medium text-white transition hover:opacity-90"
          >
            📄 PDF 다운로드
          </a>
        ) : (
          <a
            href={`/issues/${slug}/print?print=1`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-full border border-accent px-4 py-1.5 text-sm font-medium text-accent transition hover:bg-accent hover:text-white"
          >
            📄 PDF로 저장 · 인쇄
          </a>
        )}
      </div>
      <IssueView issue={issue} />
      <div className="no-print mx-auto max-w-3xl px-5 pb-8">
        <Link href="/" className="text-sm text-accent underline">
          ← 전체 호 목록
        </Link>
      </div>
      <SiteFooter />
    </>
  );
}
