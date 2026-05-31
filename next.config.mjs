/** @type {import('next').NextConfig} */
const nextConfig = {
  // 매거진 이미지는 다양한 외부 호스트(Pexels, Wikimedia, Pollinations, Supabase)에서 오며
  // 일반 <img> 태그로 렌더한다 → Vercel 무료 티어 이미지 최적화 쿼터를 소모하지 않음.
  reactStrictMode: true,
};

export default nextConfig;
