# SajuMe Yun

이름·생년월일·태어난 시간·성별·양력/음력을 입력하면 Gemini가 사주 성격·기질·재능을 해석해 주는 React 웹 앱입니다.

## 기능

- 사주 입력 폼 (이름, 생년월일, 시간, 성별, 양력/음력)
- `buildSajuPrompt()` 기반 사주 기본차트해석 프롬프트
- Gemini API (`gemini-3.6-flash`) 호출 — `fetch`만 사용
- 풀이 중 버튼 비활성화 + `🔮 풀이 중...` 표시
- 모노톤 무당 톤 UI

## 기술 스택

- React 19 + Vite 8
- Gemini API (REST `generateContent`)

## 시작하기

### 1. 설치

```bash
npm install
```

### 2. API 키 설정

프로젝트 루트에 `.env` 파일을 만들고 키를 넣습니다.

```env
VITE_GEMINI_API_KEY=여기에_발급받은_키
```

키는 [Google AI Studio](https://aistudio.google.com/apikey)에서 발급할 수 있습니다.  
`.env`는 Git에 올리지 않습니다 (`.gitignore`에 포함).

### 3. 실행

```bash
npm run dev
```

브라우저에서 `http://localhost:5173` 로 접속합니다.  
`.env`를 수정했다면 개발 서버를 재시작하세요.

### 기타 명령

```bash
npm run build    # 프로덕션 빌드
npm run preview  # 빌드 결과 미리보기
npm run lint     # ESLint
```

## 프로젝트 구조

```
src/
  App.jsx      # 입력 폼 + Gemini 호출
  prompt.js    # buildSajuPrompt()
  App.css      # 화면 스타일
  index.css    # 전역 스타일
```

## 주의

- `VITE_` 접두사 환경변수는 클라이언트에 노출됩니다. 학습/데모 용도로만 쓰고, 배포 시에는 서버 경유를 권장합니다.
- API 키는 저장소에 커밋하지 마세요.
