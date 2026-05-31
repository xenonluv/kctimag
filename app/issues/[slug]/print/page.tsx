// PDF 생성 전용 인쇄 경로 (Puppeteer가 이 페이지를 렌더 → print to PDF).
// 헤더/푸터 없이 매거진 본문만 표시.
import { notFound } from "next/navigation";
import { allSlugs, readIssue } from "@/lib/content";
import IssueView from "@/components/IssueView";

export const dynamic = "force-static";

export function generateStaticParams() {
  return allSlugs().map((slug) => ({ slug }));
}

export default async function PrintPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const issue = readIssue(slug);
  if (!issue) notFound();
  return <IssueView issue={issue} />;
}
