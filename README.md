# KCT — 주간 한국 문화 매거진 자동 발행 시스템

주 1회, 한국 문화 전반의 뉴스를 수집·분석·작문해 **매거진을 자동 생성**하고
GitHub push → **Vercel 웹 발행** + **구독자 메일 발송(PDF 첨부)** 까지 수행하는 시스템.

런타임 비용 **100% 무료** (구독 중인 Claude CLI + 각 서비스 무료 티어).

---

## 🤖 7인 "팀" → 코드 파이프라인

| 역할 | 파일 | 하는 일 | 엔진 |
|------|------|---------|------|
| 팀원1 수집 | `scripts/pipeline/01-collect.ts` | 네이버 검색 API로 문화 10개 카테고리 × 최근 7일 뉴스 | Naver API |
| 팀원2 분석 | `02-analyze.ts` | 4대 강도(뉴스·심리·실시간)로 이슈 랭킹 | Claude CLI |
| 팀원3 작문 | `03-write.ts` | 이슈별 섹션 매거진 본문(A4 4장+) | Claude CLI |
| 팀원4 이미지 | `04-illustrate.ts` | 계층형 이미지(스톡/Wikimedia/AI/링크) | Claude + 무료 이미지 API |
| 팀장 총평 | `05-editorial.ts` | 향후 영향·문제점·긍정 요소 칼럼 | Claude CLI |
| (PDF) | `06-pdf.ts` | 인쇄 페이지 → PDF (Puppeteer) | Puppeteer |
| CEO 검증 | `07-ceo-gate.ts` | 분량·이미지·빌드 등 QA 게이트 → 발행 허가 | 코드 검증 |
| 발행·발송 | `08-publish-send.ts` | git push → Vercel, 구독자 메일(PDF 첨부) | git + Resend |
| 오케스트레이터 | `run.ts` | 위 전체를 순서대로 실행 | — |
| 팀원5 웹·관리자 | `app/` | 공개 사이트 + 관리자 모드 | Next.js |

---

## 💰 100% 무료 스택

- **호스팅**: Vercel Hobby (비상업)
- **뉴스**: 네이버 검색 API (25,000/일)
- **런타임 LLM**: Claude CLI (`claude -p`, 구독 사용 → 추가비용 0)
- **이미지**: Pexels(스톡) · Wikimedia Commons(실존·CC) · Pollinations(AI) — 모두 무료·저작권 안전
- **PDF**: Puppeteer (OSS)
- **메일**: Resend (100/일·3,000/월)
- **DB·인증·PDF 보관**: Supabase (무료 티어)
- **크론**: macOS launchd (Mac Studio 상시 가동)

---

## 🚀 설치 (Mac Studio 기준)

### 1) 코드 + 의존성
```bash
git clone https://github.com/xenonluv/kctimag.git
cd kctimag
npm install        # puppeteer가 Chromium을 내려받음
```

### 2) 무료 계정 + 키 발급
- **네이버 개발자**(https://developers.naver.com) → 검색 API → Client ID/Secret
- **Pexels**(https://www.pexels.com/api) → API Key
- **Supabase**(https://supabase.com) → 새 프로젝트 → Project URL, anon key, service_role key
- **Resend**(https://resend.com) → API Key, 발신 도메인(또는 onboarding@resend.dev)

### 3) `.env.local` 작성
`.env.example` 복사 후 값 채우기:
```bash
cp .env.example .env.local
# 편집기로 키 입력
```

### 4) Supabase 스키마
Supabase 대시보드 → SQL Editor → `supabase/schema.sql` 내용 실행
(subscribers/send_logs 테이블 + 공개 `issues` 버킷 생성).

### 5) Claude CLI 인증 확인 ⚠️ (가장 중요)
파이프라인 LLM이 **구독으로 동작**하려면 Mac에서 `claude`가 로그인돼 있어야 합니다.
```bash
echo "hi라고만 답해" | claude -p
```
정상 응답이 나오면 OK. `Invalid API key` 가 뜨면 `claude` 로그인(구독) 상태를 확인하고,
환경에 `ANTHROPIC_API_KEY`(유효하지 않은 값)가 설정돼 있지 않은지 확인하세요.

### 6) GitHub + Vercel 연결
- 이 저장소를 GitHub `xenonluv/kctimag` 에 push.
- Vercel에서 해당 repo를 import → 환경변수(.env.local 값들)를 Vercel 프로젝트 설정에 등록 → 배포.
- `NEXT_PUBLIC_SITE_URL` 을 배포 URL로 설정.

---

## ▶️ 실행

```bash
# 드라이런 (생성만, 발행/발송 안 함) — 결과는 content/issues/<날짜>/issue.json
npx tsx scripts/pipeline/run.ts

# mock 모드 (LLM 없이 배관 점검)
LLM_MODE=mock SKIP_BUILD=1 npx tsx scripts/pipeline/run.ts 2099-01-01

# 실제 발행 (git push → Vercel → PDF → 메일)
PUBLISH=1 npx tsx scripts/pipeline/run.ts

# 단계별 실행
npx tsx scripts/pipeline/01-collect.ts 2026-06-01
```

## ⏰ 주간 자동화 (launchd)
```bash
# 1) plist의 /Users/USERNAME 을 실제 경로로 수정
# 2) 설치
cp scripts/launchd/com.kctimag.weekly.plist ~/Library/LaunchAgents/
chmod +x scripts/launchd/run-weekly.sh
launchctl load ~/Library/LaunchAgents/com.kctimag.weekly.plist
# 즉시 1회 테스트
launchctl start com.kctimag.weekly
```
기본 일정: **매주 월요일 08:00** (plist의 Weekday/Hour 수정 가능).

---

## 🖼️ 계층형 이미지 정책 (저작권 안전 + 사실성)
- 분위기·배경 → **Pexels** 스톡
- 실존 인물·장소·사건 → **Wikimedia Commons** CC/퍼블릭도메인 (출처표기)
- 개념·추상 → **Pollinations** AI 생성 (UI에 "AI 생성" 라벨)
- 합법 이미지 없음 → 임베드 대신 **원문 링크**
- ⚠️ 실존 인물의 가짜 "사진" AI 생성은 금지(초상권·오정보 방지)

> Google Gemini 무료 이미지 생성으로 교체하려면 `lib/images/index.ts`의 `aiAsset`을
> Gemini 호출 + Supabase Storage 업로드로 바꾸면 됩니다(현재는 Pollinations 기본).

## 👤 관리자 모드
`/admin/login` → `ADMIN_PASSWORD` 로 로그인 → 구독자 관리 / 수동·테스트 발송 / 발송 로그.

---

## 🔐 보안 주의
- `NaverAPI.md`, `Pixelapi.md`, `.env.local` 은 `.gitignore` 처리됨 — **절대 커밋 금지**.
- 모든 키는 `.env.local`(로컬) + Vercel 환경변수로만 관리.
- Vercel Hobby는 **비상업 용도**. 수익화 시 유료 플랜 필요.

## 📁 구조
```
app/                  Next.js (공개 + /admin + /api)
components/           매거진 렌더 컴포넌트
lib/                  naver·llm·images·supabase·resend·storage·content
scripts/pipeline/     01~08 + run.ts (역할별 파이프라인)
scripts/launchd/      주간 크론 (plist + 래퍼)
content/issues/<날짜>/ 발행된 호 (issue.json) — git=발행
supabase/schema.sql   DB 스키마
```
