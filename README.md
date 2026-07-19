# 공부 타이머 (Study Timer)

열품타 스타일 **아이패드 PWA** 공부 타이머. 과목을 골라 타이머를 켜면 실제 공부 시각이
하루 그리드에 진하게 차오르고, 노션에 미리 만들어 둔 계획과 대조된다. 스케줄 원천은 기존
**노션 DB**이며, 앱은 얇은 **Cloudflare Worker 프록시**를 통해 오늘 일정을 읽고 실제 공부시간을
다시 기록한다.

디자인 프로토타입 `공부 타이머.dc.html`(Claude Design)을 실제 앱으로 구현한 것으로, 데모 시계·
목업 데이터를 실제 시계 + 데이터 소스 계층으로 바꾸고 PWA로 설치 가능하게 만들었다.

## 화면

- **플래너** — 타임스탬프 기반 타이머 + 오늘 과목 목록, 그리고 10분 단위 하루 그리드
  (계획=연한 색, 실제=진한 색, 현재 시각 라인). 화면을 꺼도/새로고침해도 경과 시간이 유지된다.
- **캘린더** — 노션 계획을 월 단위로 펼친 뷰. 날짜를 누르면 그날 할 일(체크박스) 상세가 열린다.
- **기록** — 과목별 누적·목표, 최근 14일 일별 공부량, 이번 달 통계.

## 구조

```
src/                 프론트엔드 (Vite + React + TS PWA)
  data/              subjects · dataSource(Local/Notion) · mockSchedule · store(localStorage)
  lib/               time(KST·study-day) · colors(oklch) · sessions(집계·그리드 셀)
  hooks/             useTimer(타임스탬프 스톱워치) · useNow
  components/ views/  UI
proxy/               Cloudflare Worker — 노션 CORS 프록시 (README 별도)
scripts/             PWA 아이콘 생성기
```

데이터 접근은 `src/data/dataSource.ts`의 `DataSource` 인터페이스 하나로 추상화된다.
`VITE_API_BASE`가 없으면 **로컬 목업 + localStorage**로 완전히 오프라인 동작하고, 설정하면
동일한 UI가 **노션 프록시**로 전환된다.

## 개발

```bash
npm install
npm run dev            # http://localhost:5173
npm run build          # 타입체크 + 프로덕션 빌드(PWA)
npm run preview
```

아이콘을 다시 만들려면: `node scripts/generate-icons.mjs`

## 노션 연동 (실데이터)

1. `proxy/README.md`를 따라 Cloudflare Worker를 배포하고 `NOTION_TOKEN`을 설정한다.
   (노션 내부 인테그레이션 생성 → DB `공부 계획 2026 여름 (7/13~8/17)` 공유)
2. 앱 `.env`에 `VITE_API_BASE=https://study-timer-proxy.<you>.workers.dev` 를 넣고 다시 빌드한다.

프록시는 오늘/한 달 일정을 읽고, 타이머가 잰 과목별 실제 분을 노션 `실제시간(분)` 속성에
기록한다. localStorage가 타이머의 원천이고, 노션 기록은 클로드가 일정을 재조정할 때 참고한다.

## 시간대 규칙

노션 날짜는 UTC로 저장되므로 그리드는 **KST(+09:00)** 로 변환해 그린다. "공부 하루"는 기본
**05:00 → 다음날 05:00** 로, 자정을 넘긴 공부도 전날로 집계된다 (`src/lib/time.ts`).
