import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { allSpecialSlugs, readSpecial } from "@/lib/special";
import SpecialView from "@/components/SpecialView";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";

export const dynamic = "force-static";

export function generateStaticParams() {
  return allSpecialSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const article = readSpecial(slug);
  if (!article) return {};
  const flatTitle = article.meta.title.replace(/\s*\n\s*/g, " ");
  return {
    title: `${flatTitle} — KCTI 특별기획`,
    description: article.meta.dek,
    openGraph: {
      title: flatTitle,
      description: article.meta.dek,
      images: article.meta.coverImageUrl ? [article.meta.coverImageUrl] : [],
    },
  };
}

export default async function SpecialPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = readSpecial(slug);
  if (!article) notFound();

  return (
    <>
      <SiteHeader />
      <SpecialView article={article} />
      <div className="no-print mx-auto max-w-3xl px-5 pb-8">
        <Link href="/" className="text-sm text-accent underline">
          ← 홈으로
        </Link>
      </div>
      <SiteFooter />
    </>
  );
}
