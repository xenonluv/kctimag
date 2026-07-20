-- KCT 매거진 — Supabase 스키마
-- Supabase 대시보드 → SQL Editor 에서 실행.

-- 구독자
create table if not exists subscribers (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  status text not null default 'confirmed',   -- pending | confirmed | unsubscribed
  unsubscribe_token text,
  created_at timestamptz default now()
);

-- 발송 로그
create table if not exists send_logs (
  id uuid primary key default gen_random_uuid(),
  issue_slug text not null,
  sent int default 0,
  failed int default 0,
  created_at timestamptz default now()
);

-- RLS 활성화: 정책을 두지 않으면 anon(공개 키)은 접근 불가.
-- 서버(service_role 키)는 RLS를 우회하므로 구독 API/관리자/파이프라인만 데이터에 접근.
alter table subscribers enable row level security;
alter table send_logs enable row level security;

-- PDF 보관용 공개 Storage 버킷 (이미 있으면 무시)
insert into storage.buckets (id, name, public)
values ('issues', 'issues', true)
on conflict (id) do nothing;

-- 매일 누적 수집되는 원천 뉴스 (Vercel Cron이 daily insert, 주간 분석이 7일치 조회)
create table if not exists news_raw (
  id uuid primary key default gen_random_uuid(),
  link text unique not null,
  title text,
  description text,
  pub_date timestamptz,
  category text,
  category_label text,
  collected_at timestamptz default now()
);
create index if not exists news_raw_pub_date_idx on news_raw (pub_date desc);
alter table news_raw enable row level security;

-- 문화기술 정책보고서 어시스턴트: 관리자가 admin 페이지에서 지정한 구독자만 사용
alter table subscribers add column if not exists chat_allowed boolean not null default false;

-- 어시스턴트 사용 기록 (일일 사용량 제한 + 사용 통계)
create table if not exists chat_logs (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  kind text not null default 'chat',   -- chat | report
  created_at timestamptz default now()
);
create index if not exists chat_logs_email_created_idx on chat_logs (email, created_at desc);
create index if not exists chat_logs_created_idx on chat_logs (created_at desc); -- 전체 합산 카운트용
alter table chat_logs enable row level security;
