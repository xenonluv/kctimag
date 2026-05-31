// 파이프라인 스크립트(tsx, Next 외부 실행) 전용 환경변수 로더.
// 각 파이프라인 엔트리 스크립트 최상단에서 import 한다: `import "@/lib/load-env";`
// Next.js 웹앱은 .env.local 을 자동 로드하므로 이 파일이 필요 없다.
import dotenv from "dotenv";
import path from "node:path";

dotenv.config({ path: path.join(process.cwd(), ".env.local") });
dotenv.config({ path: path.join(process.cwd(), ".env") });
