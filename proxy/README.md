# study-timer-proxy (Cloudflare Worker)

A thin CORS proxy between the study-timer PWA and Notion. The browser can't call
Notion directly (CORS + the token must stay secret), so this Worker holds the
token server-side and normalizes rows into the shape the app expects.

## Endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/schedule?date=YYYY-MM-DD` | Timed + all-day rows for one **KST study day** |
| `GET` | `/api/schedule/month?ym=YYYY-MM` | Per-day events for the calendar/record views |
| `POST` | `/api/actual` | Write actual minutes back — body `{ "date": "2026-07-19", "bySubject": { "미적분1": 95 } }` |
| `GET` | `/api/goals` | Per-subject total planned hours (timed durations + all-day 예상시간(h)) |
| `POST` | `/api/todo` | Sync a plan row's 완료 checkbox — body `{ "pageId": "…", "done": true }` |
| `GET`/`POST` | `/api/sessions` | Durable cross-device study-session log (needs the KV binding below) |

`GET /api/schedule` returns:

```json
{
  "date": "2026-07-19",
  "timed":  [{ "id":"…", "subject":"미적분1", "title":"…", "start":"…+09:00", "end":"…+09:00", "status":"예정", "done":false }],
  "allDay": [{ "id":"…", "subject":"학원", "title":"국어 학원", "estH":3, "status":null, "endDate":null }]
}
```

Timezone: Notion returns these datetimes with the **intended KST wall clock** in
the string (e.g. `2026-07-18T08:00:00Z` means 오전 8시), so the proxy reads the
literal date/time and labels it `+09:00` — it never re-offsets. That's what makes
an 08:00 Notion block land on the 8am grid row (doc §7). A row is a **timed**
block when its `날짜.start` has a time component, and it is bucketed into the KST
study day (05:00→05:00, `STUDY_DAY_START`). `POST /api/actual` writes each subject's daily
total into the `실제시간(분)` (Number) property on that day's **earliest matching
timed plan row** for the subject; adjust `putActual()` if you prefer another
mapping. localStorage stays the app's source of truth — this is for Claude to
read when re-planning.

## Setup

1. **Create a Notion internal integration** — https://www.notion.so/my-integrations
   → *New integration* → copy the token (`ntn_…`). The Notion token used by
   Claude's MCP is **not** reusable here; the Worker needs its own.
2. **Share the database with the integration** — open
   `공부 계획 2026 여름 (7/13~8/17)` → *⋯* → *Connections* → add your integration.
3. **Add the `실제시간(분)` Number property** to the DB (once) so write-back has a
   target. (Claude added this via the Notion MCP during setup; if it's missing,
   add a Number column named exactly `실제시간(분)`.)
4. **Install & configure**

   ```bash
   cd proxy
   npm install
   cp .dev.vars.example .dev.vars   # put your NOTION_TOKEN here for local dev
   npm run dev                      # http://localhost:8787
   ```

5. **Deploy**

   ```bash
   npx wrangler login
   npx wrangler secret put NOTION_TOKEN   # paste the ntn_… token
   npm run deploy
   ```

   Then point the PWA at it: set `VITE_API_BASE=https://study-timer-proxy.<you>.workers.dev`
   in the app's `.env` and rebuild.

## Cross-device records (KV) — optional but recommended

Study records are stored in the browser by default, so they don't follow you to
another device/browser. To keep them everywhere, give the Worker a KV namespace:

```bash
cd proxy
npx wrangler kv namespace create SESSIONS
# copy the printed id, then in wrangler.toml uncomment the [[kv_namespaces]]
# block and paste it as `id = "..."`
npm run deploy
```

The app then pulls the cloud log on open, **unions** it with local (so no device
overwrites another), and pushes changes back. Without KV, `/api/sessions` just
returns an empty log and the app stays local-only.

## Config (`wrangler.toml [vars]`)

| Var | Default | Notes |
| --- | --- | --- |
| `NOTION_DATABASE_ID` | the summer-plan DB | change to reuse for another term |
| `NOTION_VERSION` | `2022-06-28` | Notion REST version |
| `STUDY_DAY_START` | `5` | must match the app's `studyDayStart` |
| `ALLOW_ORIGIN` | `*` | set to your PWA origin to lock down CORS |
| `ACTUAL_PROP` | `실제시간(분)` | the write-back Number column |

`NOTION_TOKEN` is a **secret**, never a var — set it with `wrangler secret put`.

## Quick check

```bash
curl "http://localhost:8787/api/schedule?date=2026-07-19"
# → an 08:00 Notion block should come back with start "…T08:00:00.000+09:00"
```
