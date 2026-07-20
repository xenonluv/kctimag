import type { Metadata } from "next";
import AssistantChat from "@/components/AssistantChat";
import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";

export const metadata: Metadata = {
  title: "문화기술 정책보고서 어시스턴트 - KCTI",
  description:
    "최근 7일간 수집된 한국 문화 뉴스를 근거로 문화기술 동향·정책 보고서를 대화로 작성하는 AI 어시스턴트",
};

export default function AssistantPage() {
  return (
    <>
      <SiteHeader />
      <AssistantChat />
      <SiteFooter />
    </>
  );
}
