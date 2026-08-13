# 사주미

고양이 무당 **무냥이**가 이름·생년월일·태어난 시간·성별·양력/음력을 보고 사주를 풀어 주는 웹 앱입니다.

로그인은 필수가 아닙니다. 손님은 먼저 풀이를 받아 앞부분을 볼 수 있고, Google로 이름을 남기면 전체 결과와 기록이 열립니다.

## 기능

- 사주 정보 입력 (이름, 생년월일, 시간, 성별, 양력/음력)
- 무냥이 말투의 기본차트해석 (Gemini `gemini-3.6-flash`)
- 풀이 중 전체 화면 로딩 리추얼
- 손님 미리보기: 결과 앞부분만 공개, 나머지는 로그인 후 열람
- Google 로그인 후 프로필·해석 기록 저장
- 기록 목록에서 열람, 수정, 삭제
- 공유 링크 (`/result/:token`)로 결과 공개
- 지금까지 생성된 사주 수 표시
- GA4로 로그인, 해석, 공유 등 주요 행동 추적

## 기술 스택

- React 19 + Vite 8
- Supabase (Google Auth, Postgres, RLS)
- Gemini API (`generateContent`)
- Google Analytics 4 (`G-LYPT783Z4J`)

## 시작하기

### 1. 설치

```bash
npm install
```

### 2. 환경 변수

프로젝트 루트에 `.env`를 만들고 `.env.example`을 참고해 값을 넣습니다.

```env
VITE_GEMINI_API_KEY=여기에_발급받은_키
VITE_SUPABASE_URL=여기에_프로젝트_URL
VITE_SUPABASE_ANON_KEY=여기에_anon_키
VITE_GOOGLE_CLIENT_ID=여기에_구글_웹_클라이언트_ID
```

- Gemini 키: [Google AI Studio](https://aistudio.google.com/apikey)
- Supabase: Dashboard → Project Settings → API
- Google Client ID: [Providers → Google](https://supabase.com/dashboard/project/dmvocosmmuhmkwhhypvb/auth/providers?provider=Google)

Vercel에도 같은 `VITE_` 값을 넣고 **Redeploy** 해야 배포 사이트에서 로그인이 된다.

### Google 로그인 (Vercel / 휴대폰)

로그인은 페이지를 나가지 않고 Google 팝업으로 처리한다. 그래서 `localhost`로 튕기지 않는다.

1. [Google 클라이언트](https://console.cloud.google.com/auth/clients)의 **Authorized JavaScript origins**에 아래를 넣는다.
   - `https://saju-me-yun.vercel.app`
   - `http://localhost:5173`
2. **Authorized redirect URIs**는 앱 주소가 아니라 이것만 둔다.
   - `https://dmvocosmmuhmkwhhypvb.supabase.co/auth/v1/callback`
3. 휴대폰은 **카카오톡 인앱이 아니라 Safari/Chrome**으로 [사주미](https://saju-me-yun.vercel.app)를 연다.

`.env`는 Git에 올리지 않습니다.

### 3. 실행

```bash
npm run dev
```

브라우저에서 `http://localhost:5173` 으로 접속합니다.  
`.env`를 바꿨다면 개발 서버를 재시작하세요.

```bash
npm run build    # 프로덕션 빌드
npm run preview  # 빌드 결과 미리보기
npm run lint     # ESLint
```

## 이용 흐름

1. 사주 정보를 저장한다.
2. **사주 해석하기**를 누르면 무냥이가 풀이를 시작한다.
3. 손님은 결과의 앞부분만 본다. Google로 로그인하면 전체 풀이와 기록이 남는다.
4. 로그인한 사용자는 왼쪽 목록에서 지난 사주를 다시 열고, 공유 링크로 보낼 수 있다.

공유 페이지 주소는 `/result/{share_token}` 입니다.

## 프로젝트 구조

```
src/
  main.jsx                 # 엔트리. /result/:token 이면 공유 페이지
  App.jsx                  # 화면 조립 (계정 / 목록 / 워크스페이스 / 결과)
  App.css                  # 셸 레이아웃·반응형
  index.css                # 전역 토큰·배경
  hooks/useSajuApp.js      # 인증·프로필·기록·해석 상태
  pages/SharedResult.jsx   # 공유 링크 전용 페이지
  components/
    ui/                    # 부적 모서리, 무냥이, 토스트, Google 아이콘
    auth/                  # 상단 계정 바, 세션 확인 화면
    profile/               # 사주 정보 카드·입력 모달
    reading/               # 기록 목록, 중앙 워크스페이스, 결과 패널
    ritual/                # 풀이 중 로딩 연출
  lib/                     # supabase, auth, gemini, readings, prompt, analytics
  styles/form.css          # 입력·칩·제출 버튼 공통 스타일
supabase/                  # 테이블·RLS·공유 RPC 마이그레이션
```

## 분석 이벤트

GA4에서 확인할 수 있는 주요 이벤트입니다.

| 이벤트 | 의미 |
|---|---|
| `saju_analyze` / `saju_analyze_complete` | 사주 해석 시작 / 완료 |
| `login_click` / `login` | Google 로그인 클릭 / 성공 |
| `profile_save` | 사주 정보 저장 |
| `share` | 결과 공유 |
| `shared_result_view` | 공유 페이지 열람 |
| `cta_try_saju` | 공유 페이지에서 앱으로 이동 |

전환으로 보려면 GA4에서 `saju_analyze_complete`, `login`을 주요 이벤트로 지정하면 됩니다.

## 주의

- `VITE_` 환경 변수는 클라이언트에 노출됩니다. 학습·데모용이면 이 구조로 충분하고, 본격 배포 시 Gemini 호출은 서버 경유를 권장합니다.
- API 키와 Supabase anon 키는 저장소에 커밋하지 마세요.
- 사주 결과는 재미와 참고용입니다. 의료·법률·재정적 조언이 아닙니다.
