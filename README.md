# 캐스팅픽 · CastingPick

보고 싶은 배우, 볼 수 있는 날. React 기반 모바일 우선 뮤지컬 회차 검색 웹앱입니다.

## 실행

Node.js 22.12 이상(검증 환경: 24.20)이 필요합니다.

```sh
npm ci
npm run dev
```

브라우저에서 `http://127.0.0.1:5173`을 여세요. `.env`가 없으면 **명확하게 표시되는 데모 모드**로 작동합니다. 데모 공연·배우·일정은 모두 가상 데이터이며 변경과 관심 회차는 브라우저에 저장됩니다.

```sh
npm test
npm run build
npm run preview
```

## 구현한 흐름

- 공연 목록: 작품명·공연장 검색, 작품/시즌 선택
- 공연 상세: 역할별 배우 다중 선택, 기간·주말 필터, 날짜순 회차 결과
- 같은 역할 내 OR, 역할 간 AND. 미선택 역할은 제한 없음
- 회차 카드: 날짜·시간·전체 출연진, 선택 배우 강조, 관심 저장/해제
- 관심 회차: 기기 내 저장; Supabase 계정 로그인 시 해당 계정에 저장
- 관리자: 이메일/비밀번호 로그인, DB 관리자 권한 검사
- 새 공연 등록: 제목·공연장·시즌 기간·배역
- 이미지 등록: 파일 선택/드래그, 이미지 미리보기, 인스타 출처 링크
- 분석 검수: 원본과 비교, 날짜/시간/배우 수정, 행 제외·추가
- 신규/중복/변경 판정, 검수 오류 차단, 확인 후 일괄 저장
- 저장 결과: 신규·변경·중복 제외 건수와 공연으로 돌아가기

인스타 링크는 **출처 보관용**입니다. 임의 게시물 사진을 자동 수집하지 않습니다. 파일을 함께 업로드하거나 수동 입력하세요. 데모의 ‘샘플 검수 체험’은 업로드 파일을 분석하지 않는 예시 흐름입니다.

## 디자인

첨부 팔레트에서 추출한 색상입니다. 이전 모바일 목업의 시스템 산세리프 폰트와 역할별 칩/회차 카드 구조를 유지했습니다.

| 역할 | 색상 |
|---|---|
| 메인 플럼 | `#65405D` |
| 모브 포인트 | `#9E7A7A` |
| 선택 배경 라일락 | `#F0E7ED` |
| 본문 잉크 | `#302633` |
| 전체 배경 | `#FAF8F6` |

320px 이상의 작은 화면에서 세로 흐름을 사용하고, 넓은 화면에서는 필터와 결과를 나란히 배치합니다. 터치 타깃, 키보드 포커스, 선택 상태, 결과 안내, 오류/빈 상태, 모바일 하단 내비게이션을 포함합니다. 포스터는 외부 이미지 없이 CSS로 구성한 가상 공연 아트입니다.

## Supabase 연결

1. Supabase 프로젝트를 만듭니다.
2. SQL Editor에서 아래 파일을 순서대로 실행합니다.
   - `supabase/migrations/202609220001_initial.sql`
   - `supabase/migrations/202609220002_validate_roles.sql`
3. `.env.example`을 `.env`로 복사하고 프로젝트 URL과 **publishable key 또는 anon key**를 입력합니다.

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
```

4. 개발 서버를 다시 시작합니다. 연결된 환경은 데모로 자동 대체하지 않습니다. DB가 비어 있다면 빈 공연 목록이 정상입니다.
5. Supabase Authentication → Users에서 본인 이메일/비밀번호 사용자를 생성합니다. 그 사용자의 UUID를 확인하고 SQL Editor에서 관리자 명단에 추가합니다.

```sql
insert into public.admin_users(user_id) values ('YOUR_AUTH_USER_UUID');
```

6. 웹앱의 시간표 등록에서 로그인하고 ‘공연 추가’를 누릅니다. 공연마다 시즌/공연장을 별도 등록합니다.
7. 이미지 분석을 연결하기 전에도 ‘직접 회차 입력하기’로 실제 데이터를 저장할 수 있습니다.

브라우저에는 service role key나 AI API key를 넣지 마세요. `VITE_`로 시작하는 값은 공개됩니다. `src/lib/api.js`는 Supabase Auth / REST / Storage / Edge Functions HTTP API를 사용하며 만료 전 토큰 갱신을 처리합니다. 클라이언트 SDK를 추가하지 않아도 실행됩니다.

계정 가입 화면은 이 버전에 포함하지 않았습니다. 일반 방문자는 로그인 없이 검색하고 기기에 관심 회차를 보관합니다. 계정 동기화가 필요한 사람은 Authentication에 생성한 계정으로 로그인할 수 있으며 관리자 권한과는 별개입니다. 기기 관심 회차를 로그인 계정으로 자동 병합하지는 않습니다.

## 이미지 이해 AI 연결

AI는 Supabase Edge Function에서 Gemini API로 호출합니다. 브라우저에 비밀 키가 노출되지 않습니다. 분석 결과는 곧바로 확정 DB에 저장하지 않고, 검수 후 저장합니다.

Supabase CLI 설치 및 프로젝트 연결 후:

```sh
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase secrets set GEMINI_API_KEY=YOUR_KEY
supabase secrets set GEMINI_MODEL=YOUR_SUPPORTED_MODEL_ID
supabase secrets set APP_ORIGIN=http://127.0.0.1:5173
supabase functions deploy analyze-schedule
```

`GEMINI_MODEL`은 본인 계정에서 사용 가능한 **이미지 입력·JSON Schema 구조화 출력 지원 모델 ID**로 지정하세요. 특정 모델의 이용 가능 여부를 가정해 하드코딩하지 않았습니다. 운영 배포 시 `APP_ORIGIN`을 실제 웹앱 origin으로 변경하세요. 이 예시는 origin 하나를 허용합니다.

Function의 플랫폼 JWT 검사 설정은 꺼져 있지만, 함수 내부에서 **Supabase Auth에 토큰을 검증하고 DB의 관리자 권한을 확인한 뒤에만** AI를 호출합니다. 파일 형식/8MB 제한, 요청 타임아웃, 실패 안내를 포함합니다. API 한도와 월 예산은 사용하는 AI 서비스 콘솔에서 설정하세요.

문서: [Gemini 이미지 입력](https://ai.google.dev/gemini-api/docs/image-understanding), [구조화 출력](https://ai.google.dev/gemini-api/docs/structured-output), [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security).

## 데이터 모델과 중복 처리

- `productions`: 작품의 특정 시즌·공연장·기간과 배역 배열
- `performances`: 회차, 한국 현지 일시, 역할/배우 JSONB 배열
- `favorites`: 로그인 사용자별 관심 회차
- `imports`: 업로드 출처, 등록자, 저장 요약
- `change_logs`: 캐스팅 변경 전후 이력
- `admin_users`: SQL Editor에서만 부여하는 관리자 명단
- 비공개 Storage `casting-sources`: 확정 저장 시 업로드한 원본

작은 사이드프로젝트에 맞춰 출연진은 `{role, actor}[]`로 보관합니다. 전역 배우 ID/프로필·동명이인 구분이 필요해지면 배우 테이블을 추가하세요. 현재 이름 비교는 선택한 시즌·배역 안에서만 합니다.

`production_id + starts_at`에 DB 고유 제약을 둡니다. 서버 RPC `commit_import`는 권한·기간·배역·빈 값·배치 내 중복을 검증하고 한 트랜잭션에서 저장합니다. 같은 출연진은 건너뛰고, 변경은 검수 시점 `updated_at`이 같은 경우에만 적용합니다. 다른 관리자가 먼저 수정했다면 덮어쓰기를 거부합니다. 실패한 배치는 모두 롤백됩니다.

현재 공연은 한국 일정만 다루며 `starts_at`은 `timestamp without time zone`으로 저장합니다. 캐스팅 변경은 같은 회차에서 지원하고, 회차 시간 변경·취소 전용 UI는 후속 범위입니다. 잘린 이미지에서 사라진 행을 공연 취소로 추론하지 않습니다.

일정과 공연 목록은 500행씩 페이지를 나눠 가져와 첫 1,000행에서 잘리는 문제를 방지합니다. 전체 데이터가 커지면 시즌별 조회와 서버 필터링으로 전환할 수 있습니다.

## 권한

- 비로그인: 공연/회차 읽기만
- 일반 로그인: 본인의 관심 회차 읽기/추가/삭제
- 관리자: 공연 등록 및 검수 RPC, 비공개 원본 접근
- 클라이언트의 회차 직접 쓰기는 금지하고 검수 RPC만 허용
- 관리자 명단은 브라우저에서 수정 불가

읽기/쓰기 권한은 화면 표시뿐 아니라 DB RLS와 grant로 제한됩니다. 저장 실패/검수 취소 시 남을 수 있는 원본 파일 정리는 운영 시 보관 정책에 맞춰 추가하세요.

## 배포

`npm run build` 결과인 `dist/`를 정적 웹 호스팅에 배포하면 됩니다. URL은 hash routing(`#/show/...`)을 사용하므로 SPA rewrite 설정이 없어도 경로를 유지합니다. 빌드 환경에 위 두 `VITE_` 환경 변수를 설정하고, Supabase Auth의 Site URL과 Edge Function의 APP_ORIGIN을 실제 도메인으로 맞추세요.

AI 분석·Supabase 마이그레이션은 웹 배포와 별도로 설정해야 합니다. 이 전달본에서 실제 프로젝트 연결/배포는 하지 않았습니다.

## 검증

- `npm test`: 필터 OR/AND, 날짜/주말, 중복/변경, 잘못된 날짜·배역, 인스타 URL 검사 등 8개 테스트 통과
- `npm run build`: 프로덕션 빌드 성공
- 격리된 DOM 환경에서 실제 번들로 검색 → 배우 필터 → 관심 저장 → 관리자 샘플 검수 → 저장 → 결과 반영까지 통과
- 개발 서버 포트/브라우저 실행이 제공 환경에서 제한되어 실제 브라우저의 레이아웃·스크린샷 QA는 수행하지 못했습니다.
- Supabase 연결 정보·DB 런타임·AI 키가 없어서 실제 인증/RLS/SQL/AI 통합 호출은 실행하지 못했습니다.

마이그레이션 후 폐기 가능한 로컬 Supabase DB에서 권한/트랜잭션 테스트를 실행할 수 있습니다. 테스트 전체는 롤백됩니다.

```sh
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/security.sql
```

모바일 브라우저에서 320/390/430px, 데스크톱에서 1024px로 날짜 입력·스크롤·키보드 포커스를 최종 확인하세요. 실제 캐스팅표 몇 장으로 누락/오독 여부도 검수해야 합니다.

## GitHub에 반영

대상: `https://github.com/WalletPanic/CastingPick.git`

현재 환경에서는 GitHub 연결이 실패해 원격 저장소의 기존 파일과 기본 브랜치를 확인하지 못했습니다. **원격에 커밋하거나 푸시하지 않았습니다.** 이 폴더는 독립 실행 가능한 소스 전달본입니다.

네트워크가 되는 환경에서 저장소를 clone하고 새 브랜치를 만든 뒤, 기존 파일을 검토하면서 이 프로젝트 파일을 반영하세요. 기존 저장소에 그대로 강제 푸시하지 마세요.

```sh
git clone https://github.com/WalletPanic/CastingPick.git
cd CastingPick
git switch -c feat/mobile-casting-app
# 전달본의 소스를 기존 저장소와 비교해 반영 (.env, node_modules, dist 제외)
npm ci
npm test
npm run build
git add .
git commit -m "Build mobile-first casting schedule app"
git push -u origin feat/mobile-casting-app
```

데모 빌드를 한 파일로 내보내려면 환경 변수를 비운 상태로 빌드한 뒤 `node scripts/export-preview.mjs preview.html`을 실행하세요. 운영 환경값을 넣은 빌드는 데모 미리보기로 배포하지 마세요.


## 캐스팅 스케줄 표

`202609220003_casting_schedule.sql` 마이그레이션을 적용하면 Supabase의 `casting_schedule` 뷰에서 한 행에 한 공연 회차를 확인할 수 있습니다. 기존 DB에는 앞선 마이그레이션 적용 후 추가 실행하세요. 새 DB에는 모든 마이그레이션을 파일명 순서대로 적용하세요.

| 컬럼 | 의미 |
|---|---|
| production_title | 공연명 |
| production_year | 시즌 시작 연도 (연말을 넘겨도 동일) |
| theater_name | 극장 |
| casting_round | 1차·2차 캐스팅 스케줄 공개분 |
| performance_date | 공연 날짜 |
| performance_time | 공연 시간 (한국 시간) |
| lead_1_character / lead_1_actor | 첫 번째 배역 / 배우 |
| lead_2_character / lead_2_actor | 두 번째 배역 / 배우 |
| full_cast | 전체 배역·배우 목록 |

첫 번째·두 번째 배역은 공연 등록 시 입력한 배역 순서로 결정됩니다. 주연부터 입력하세요. 배역이 하나면 두 번째 값은 NULL입니다. 전체 배역은 `full_cast`에 유지됩니다.

관리자 등록 화면에서 공개 차수를 입력하면 검수 후 저장하는 모든 회차에 적용됩니다. 같은 날짜·시간에 새 공개 차수를 저장하면 기존 회차의 차수를 갱신합니다. 이 뷰는 최신 상태를 보여주며 공개분별 과거 스냅샷을 보관하지 않습니다. 기존 데이터의 차수는 1로 초기화되므로 필요한 회차는 올바른 차수로 다시 저장하세요. 뷰는 조회용이며 입력은 관리자 화면을 이용하세요.
