"use client";
import { useEffect } from "react";

// /print?print=1 로 들어오면 모든 이미지가 로드된 뒤 인쇄(=PDF 저장) 대화상자를 연다.
// 이미지 lazy 누락 방지: 인쇄 페이지는 eager 로드 + 여기서 완료 대기.
export default function PrintTrigger() {
  useEffect(() => {
    if (
      typeof window === "undefined" ||
      !window.location.search.includes("print=1")
    )
      return;

    let printed = false;
    const fire = () => {
      if (!printed) {
        printed = true;
        window.print();
      }
    };

    const imgs = Array.from(document.images);
    Promise.all(
      imgs.map((img) =>
        img.complete && img.naturalWidth > 0
          ? null
          : new Promise<void>((res) => {
              img.addEventListener("load", () => res());
              img.addEventListener("error", () => res());
            }),
      ),
    ).then(() => setTimeout(fire, 300));

    const fallback = setTimeout(fire, 8000); // 이미지 지연 대비 안전망
    return () => clearTimeout(fallback);
  }, []);

  return null;
}
