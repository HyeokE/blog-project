# When We Meet 날짜 조율 모드 Implementation Plan — WWM-DATE-01

> **For Hermes:** 구현 배정 시 subagent-driven-development와 test-driven-development skill을 사용하여 아래 작업을 순서대로 수행한다. 이 문서는 별도 설계 역할의 산출물이며 앱 구현·배포 완료 보고가 아니다.

**Goal:** 방 생성에서 시간/날짜 조율을 선택하고, 날짜 모드에서는 월 캘린더에서 여러 가능한 날짜를 저장한 뒤 관리자가 최종 하루와 수신자를 검토하여 명시적으로 종일 초대를 보낸다.

**Architecture:** 기존 시간 모드를 그대로 유지하며 `scheduleMode`로 분기한다. 날짜 응답은 ISO calendar date / PostgreSQL `date[]`, 종일 확정은 `date` 시작·종료로 저장한다. 기존 같은-origin 서버 API, 사용자 RLS, delta merge/CAS, 초대 reserve→Google readback→finalize 상태 기계를 확장한다.

**Tech Stack:** 현재 설치된 Next.js, React, Supabase SSR/RLS, Google Calendar REST, shadcn Calendar/Popover/Dialog/Tabs, react-day-picker, Node test runner, Bun.

**상태:** 2026-10-06 소스·로컬 문서 조사로 확인한 사항과 아래 제안을 구분했다. 실제 날짜 모드, hosted schema, 인증 roundtrip, UI 스크린샷, 테스트 통과는 아직 확인하지 않았다. 앱 코드/DB/초대/서버/Obsidian을 변경하지 않았다.

---

## 1. 범위와 고정된 제품 계약

- 생성 옵션은 `time`(기본값), `date`. 과거 방과 과거 초안에서 mode가 없으면 `time`으로 읽는다. 기존 방을 자동 변환하지 않는다.
- 후보 기간은 기존의 **연속된 inclusive 기간, 최대 28일**이다. 참가자는 이 기간 안에서 **비연속 가능한 날짜 여러 개**를 선택할 수 있다. 임의 후보 날짜로 방 기간을 대체하지 않는다.
- 관리자는 최종 **하루만** 선택한다. 여러 날짜 이벤트/반복 이벤트/자동 전송은 범위 밖이다.
- 모든 참가자의 saved 응답만 Everyone 집계에 사용한다. 내 unsaved 선택은 내 화면에만 보이고 집계 수에 섞지 않는다.
- 수신자 포함/제외/선택 참석 검토와 별도 Send가 필수다. 참가자 응답 저장, 날짜 클릭, 탭 이동, OAuth 복귀가 메일을 보내서는 안 된다.
- 시간 모드의 기존 `All day`는 **00:00–24:00 반시간 가용시간 범위**다. 새 날짜 조율 모드의 종일 이벤트와 별개다. 시간 모드 기존 drag/calendar fill/시간대 표시/확정은 유지한다.
- 날짜 모드에서는 시간축, From/To, All day 체크박스, view timezone 변환, Compact, CalendarFill을 숨긴다. CalendarFill API에 날짜 방을 전달하면 명시적 unsupported 오류로 거절한다. 가져온 날짜를 무조건 free로 취급하지 않는다.
- 방 timezone은 날짜 모드에서도 유지한다(오늘/과거 날짜의 생성 검증 기준, 기존 room 문맥). **저장된 날짜와 최종 날짜를 device timezone에 맞춰 이동하지 않는다.**
- bounded control/surface 4px, warm Craft light/dark, 기존 타이포그래피, opacity 중심 motion, Y 이동 금지. 기존 en/ko 지원을 유지한다(옛 English-only 메모보다 현재 소스 우선).

## 2. 확인된 현재 구조 및 실제 변경 접점

이 절의 근거는 아래 경로를 직접 읽은 소스다. hosted DB 적용 여부는 로컬 migration 파일의 존재만으로 확인하지 않았다.

| 영역 | 현재 확인 | 구현 시 반드시 다룰 기존 경로 |
|---|---|---|
| 생성·방 통합 | 생성 Dialog, 초안, OAuth, 탭, Settings, 슬롯 state가 한 파일에 연결됨 | `src/features/when-we-meet/WhenWeMeet.tsx` |
| 생성 초안 | `draft.mjs` version 1, title/startDate/endDate/startTime/endTime/timezone만 저장. 24시간 TTL, OAuth completion 10분 TTL 및 consume-once | `draft.mjs`, `AuthReturn.tsx`, `creation-validation.mjs`, `TimeRangeFields.tsx`, `DateRangePicker.tsx` |
| 앱 데이터 타입 | 독립 `types.ts`는 없고 Room/Response/Meeting/CreateRoomInput은 api.ts에 정의 | `api.ts`, `domain.d.ts`, `normalize.d.mts`, `confirm-tab.d.mts` |
| 경계 normalization | raw snake_case→camelCase 한곳 변환. 슬롯은 `new Date(...).toISOString()` 사용 | `normalize.mjs` — 날짜는 기존 instant 변환을 절대 통과하지 않음 |
| 슬롯 domain | `makeSlots`는 room timezone의 30분 UTC instant 생성; DST 반복 시각도 별도 슬롯 | `domain.mjs`, `limits.mjs`, `room-schedule.mjs` |
| 최대 기간 | `MAX_RANGE_DAYS=28`, `MAX_RESPONSE_SLOTS=28*48` | `limits.mjs`, `range.mjs`, `schedule-view.mjs` |
| 읽기 | room/list select에 mode 없음, 응답 select에 slots만 있음; request-scoped RLS read | `src/lib/supabase/server.ts`, `RoomResponseLoader.tsx`, `query.ts` |
| 쓰기 | action save: baseline 필수→delta merge→updated_at CAS, 최대 4회 retry | `src/app/api/craft/when-we-meet/[roomId]/route.ts`, `availability-changes.mjs` |
| autosave/SSE | 슬롯 shape, name+slots+version; same-origin EventSource, 서버 약 1초 poll, 55 tick 후 재접속 | `autosave.mjs`, `autosave.d.mts`, `useAvailabilitySync.ts`, `[roomId]/events/route.ts` |
| 멤버 | `wwm_members` 기본 policy는 self-only. `wwm_room_people` RPC는 authorized room member 검증 후 membership LEFT JOIN responses | `PeoplePanel.tsx`, `[roomId]/people/route.ts`, `20260930000100_wwm_room_people.sql` |
| 확정 | request/record/panel 모두 timed start/end, slots 기반 proposalInstants | `ConfirmTab.tsx`, `ConfirmationPanel.tsx`, `confirm-tab.mjs`, `confirm-selection.mjs`, `RoomChrome.tsx` |
| Google | insert는 dateTime/timeZone, eventMatches는 Date.parse(dateTime). edit는 같은 event ID의 patch, resend는 sequence+ETag | `confirmation-foundation.mjs`, `confirmation-flow.mjs`, `calendar-google.mjs` |
| 서버 초대 | owner guard→attendee snapshot→validate→reserve RPC→Google→private finalize | `[roomId]/confirmation/route.ts`, `confirmation/update/route.ts`, `confirmation/resend/route.ts`, `confirmation/shared.ts`, `calendar-db.ts` |
| UI foundation | Calendar wrapper는 DayPicker props와 custom DayButton 지원 | `src/components/ui/calendar.tsx` (재사용; 광범위 shared primitive 수정 불필요) |
| 언어 | `WWM_LOCALES=['en','ko']`, missing key/placeholder throw, cookie/Accept-Language 사용 | `src/i18n/wwm.mjs`, `src/i18n/locales/wwm/{en,ko}.json`, feature `i18n/WwmI18nProvider.tsx` |

### SQL 조사에서 발견한 구현 차단점

1. `20260929000000_wwm.sql`: `wwm_responses.slots timestamptz[]`, 날짜/시각 검증 trigger, `wwm_slots_bounded <=672`, trigger 내부 `>672` 거절. 날짜를 UTC midnight/48개 슬롯으로 표현하면 의미와 DST 모두 잘못된다.
2. `20261001030000_wwm_four_week_range.sql`은 room span과 flat constraint를 28일/1344로 바꾸지만 **원래 `wwm_slots_bounded`와 `validate_slots()` 내부 672 상한은 이 파일에서 변경하지 않는다.** 저장된 hosted 정의는 미조회다. 기존 시간 모드 장기간 all-day 응답과 새 migration 호환성 검토가 필요하다. 날짜 작업에서 이 문제를 무심코 정상으로 가정하지 않는다.
3. `20260930000200_wwm_confirmation.sql` 및 `20261001000000_wwm_confirmation_revisions.sql`: confirmation과 revisions의 starts_at/ends_at은 NOT NULL timestamptz, claim은 최대 24시간과 local clock 검증. **25시간인 DST 종일을 이 timed validator에 우회 주입하면 거절된다.** 날짜 전용 branch와 저장 컬럼이 필요하다.
4. room_people와 confirmation_attendees의 `has_availability`는 현재 `cardinality(slots)>0`이다. 날짜 mode branch 없이 새 dates만 저장하면 모든 날짜 응답자가 미응답으로 보인다.
5. Settings schedule RPC는 기간 변경 후 slots를 시간대/시각으로 trim한다. 날짜 모드는 date 비교로 trim하고 버전을 갱신해야 한다. 확정 이벤트는 현재 Settings 일정 변경으로 수정되지 않는다; 이 계약을 유지하고 명시적으로 알려야 한다.
6. initial optional flags는 Google insert에 반영되지만 initial reserve route는 `p_optional`을 전달하지 않는다. 날짜 모드에서 필수/optional snapshot 및 hash가 DB에 일관되게 보존되는지 함께 점검해야 한다(기존 timed 회귀 포함).

## 3. 화면/탭 목적과 우선순위

| 화면 | 주 작업·핵심 정보 | 주 행동 | 보조 및 예외 |
|---|---|---|---|
| 목록 | 내가 접근 가능한 meeting의 제목, 기간, mode, 참가자 수, 확정 상태 | 기존 New meeting | mode badge는 작고 정적. 수가 미조회면 0을 만들지 않고 unavailable 유지 |
| 생성 | 제목 → 조율 방식 → 후보 기간 → timezone/이름 | Create | mode 2옵션, 기존 범위 picker, date mode 시간 필드 숨김. Cancel/Escape draft 보존 |
| 내 가능 날짜 | 월 calendar에서 내 가능한 날 편집, autosave 상태 | 날짜 toggle | 후보 범위 내 전체 선택/선택 비우기(내 응답만 변경), 오류 Retry |
| Everyone | saved 기준 날짜별 가능人数와 실제 member 대비 참여 상태 | 날짜 상세 열기 | 날짜 상세: 가능한 사람, 응답했지만 그 날 미선택, 미응답. 자기 응답 변경 없음 |
| Confirm | organizer가 하루 선택 → 수신자 검토 → 최종 종일 확인 | 별도 Send invitations | connection, excluded/optional, reconcile/edit/resend. member는 확정 결과만 읽음 |
| People | 실제 membership 이름/역할/응답 상태 | 읽기 | 날짜 응답으로 hasAvailability 계산. 응답 배열을 roster로 쓰지 않음 |
| Settings | 내 이름, owner 제목/후보 기간/timezone/삭제 | Save | mode는 읽기 전용. 기존 방 mode 변경은 이번 범위 밖. 기간 축소 영향 사전 검토 |

### 생성 Dialog 상세

- shadcn ToggleGroup(type single) 또는 두 라디오 semantic control 조합: `Time / 시간`, `Dates / 날짜`. 하나는 반드시 선택, default time; native select 사용 금지.
- date mode 설명 한 줄: `Choose possible dates. The final invitation is an all-day event.` / `가능한 날짜를 모으고, 확정된 하루를 종일 일정으로 초대해요.` 필요 이상의 카드/설명/반복 요약은 추가하지 않는다.
- 기존 DateRangePicker auto-commit 계약 유지: 첫 선택 stage, 유효한 두번째 선택 commit+close, 같은 날 허용, 이전 날 재시작, incomplete Escape/outside는 이전 값 보존. MAX_RANGE_DAYS=28 endpoint 제한 유지.
- 모드 전환 시 공통 필드와 time draft를 지우지 않는다. date 모드에서 숨겨진 time 값은 date request에 포함하지 않으며 다시 time으로 돌아오면 이전 시간값이 복원된다.
- draft version 2로 scheduleMode 추가; v1 유효 초안은 time으로 읽는다. storage parse 시 unknown mode 거절. 날짜 모드도 로그인 전 저장, 완료된 OAuth flow에서만 1회 reopen, 자동 create 금지.
- required label 4px dot, inline error 4px 아래, 첫 invalid field focus. invalid→different-invalid→valid, stale restored draft, 선택 timezone의 midnight rollover 검증을 포함한다.

### 월 캘린더 공통 구성

제안 새 컴포넌트 `DateAvailabilityCalendar.tsx`는 installed Calendar를 얇게 감싸며 선택/집계/확정을 policy prop으로 구분한다. 자체 달력/키보드/focus engine을 만들지 않는다.

- 내 선택: DayPicker `mode="multiple"`; Confirm: `mode="single"`, initially undefined, 자동 최적 날짜 선택 금지. Everyone: 선택은 inspection day이며 personal selection과 독립.
- 현재 month는 room.startDate에서 시작; 후보 범위에 속한 month만 탐색. 마지막 날/월경계/연도경계로 이동 가능. 오늘의 달을 무조건 초기 heading으로 쓰지 않는다.
- 인접 month outside cell은 후보 날짜이면 유효하지만 동일한 날짜를 두 캘린더에서 중복 toggle하지 않도록 outside-day 표시 정책을 테스트한다.
- cell에 일 숫자와 saved 가능 인원 수를 분리 표시. 숫자만으로 의미를 숨기지 않고 aria label에 `yyyy.mm.dd, N of M available` 및 선택 상태를 포함한다. 달력 dense count를 mount 때 전부 animate하지 않는다.
- Everyone에서 선택된 날의 상세는 calendar 아래(모바일), 옆(넓은 데스크톱) 고정 영역. hover 의존하지 않음. 로스터 미조회면 전체 denominator/미응답 목록 unknown으로 표시하고 retry; 응답 수를 총 참가자로 오인하지 않는다.
- 응답 없는 멤버와 저장된 빈 배열은 현행 hasAvailability 모델상 모두 '가능한 날짜 미등록'으로 표시한다. 별도 '아무 날도 불가 응답 제출' 의미는 이번 범위에 추가하지 않는다. 이 구분이 필요하면 별도 respondedAt 계약 승인 필요.
- 화면용 Date 객체 adapter는 calendar Y/M/D component로 생성·읽기한다. `new Date(iso).toISOString().slice(0,10)`로 local 선택을 변환하지 않는다. full date 표시 `yyyy.mm.dd`, month heading은 year가 있는 짧은 월 이름/현재 locale formatter를 사용한다.
- availability baseline 미수신 중 editing/save/settings 영향 계산 비활성화. date geometry skeleton, scoped error+retry. resolved metadata/같은 사용자 내용은 revalidation 중 유지.

### 반응형·접근성

- 375/390px: 월 하나, 7열 폭 확보, cell 최소 40px에 가깝게 설계(실제 container padding 포함 측정 필요), 상세 아래; 문서 가로 overflow 없음. 768/1024/1440에서는 실제 공간을 확인해 월 두 개 또는 월 하나+상세; 기존 시간표의 phones-only horizontal scroll 정책은 변경하지 않는다.
- modal footer는 Cancel/Create 한 행 가능하면 유지, body만 필요시 native scroll; room monthly calendar에는 자체 vertical scroller나 programmatic scroll jump 추가하지 않음.
- arrow/tab/Enter/Space, disabled date, Escape/focus return, touch tap와 native scroll, 빠른 반복 click 테스트. DayPicker 기본 동작을 보존하고 custom DayButton은 기존 button/aria/onClick 전달을 빠뜨리지 않는다.
- count 색 강도는 보조일 뿐, 수/선택 outline로 구분. light/dark portal contrast, focus, disabled, error 대비를 확인한다.
- no-Y opacity 전환, reduced-motion 정적 대안. 레이아웃 완료 screenshot만으로 transition acceptance 처리하지 않는다.

## 4. 제안 데이터·API 계약

아래는 **새 계약 제안**, 현재 구현된 응답이 아니다. DB snake_case→앱 camelCase 변환은 normalize.mjs 경계 한곳에서만 한다.

```ts
type ScheduleMode = 'time' | 'date';
type CalendarDate = string; // strict real YYYY-MM-DD; regex만으로 2026-02-30 허용 금지
// time mode는 기존 required startTime/endTime 유지
// date mode는 startTime/endTime을 앱 API에서 요구하거나 의미 있는 값처럼 표시하지 않음
// 공통: id/title/startDate/endDate/timezone/scheduleMode

type DateResponse = {
  userId: string; displayName: string;
  availableDates: CalendarDate[]; updatedAt?: string;
};
type DateSaveBody = {
  action: 'saveDates'; name: string; availableDates: CalendarDate[];
  base: {name: string; availableDates: CalendarDate[]};
};
type DateConfirmationBody = {
  scheduleMode: 'date'; title: string; date: CalendarDate;
  recipients: string[]; excluded: string[]; optional: string[];
  // update에만 baseRevision:number
};
type DateConfirmationRecord = {
  scheduleMode: 'date'; status: string; title: string;
  startDate: CalendarDate; endDateExclusive: CalendarDate;
  timezone: string; revision: number; googleEventUrl: string|null;
  // member에는 isRecipient, owner에만 review/edit 제공
};
```

- create mode absence만 time default, unknown mode 400. date 생성에는 title/name/range/timezone/mode를 전달하고 RPC도 재검증한다.
- saveDates는 real ISO date, unique, max28, room inclusive 범위, mode 일치를 검증한다. 미인증401, 비member403, invalid400, baseline 누락/경합409. updatedAt은 raw DB CAS 값으로 유지한다.
- delta는 baseline→desired 삭제/추가만 current에 적용하여 remote의 다른 날짜 편집을 보존한다. name merge는 현행 동일. save 중 remote, rename, 빈 배열, CAS 4회 소진을 테스트한다.
- date-specific typed snapshot/adapter 또는 set-delta 공통화로 autosave를 확장한다. 기존 time action save/slots transport는 유지한다. dates를 UTC slots처럼 취급하지 않는다.
- SSE typed payload에 mode/date 응답을 포함하고 wrong room/user/mode를 거절한다. 현행 SSE는 responses만 전달하므로 schedule metadata 변경은 version/revalidate signal로 별도 전달해야 한다.
- membership 정본은 authorized `/people` RPC다. 이름/날짜 저장/새 멤버 이후 roster를 invalidate하거나 authorized SSE 읽기에 포함한다. responses만으로 membership 갱신을 보장하지 않는다.
- aggregate는 membership 안의 saved availableDates만 센다. roster 없으면 denominator/미응답 unknown. 내 unsaved는 집계 제외.
- list/SSR/room/preview 모든 select에 mode를 추가한다. 익명 token preview는 최소 metadata만 공개하며 emails/responses는 비공개다.

## 5. 추천 SQL 계약 — 부모 승인 필요

**추천안:** 같은 `wwm_responses`에 `available_dates date[]`를 추가하고 기존 confirmation/revisions에 date interval을 추가한다. membership/name/CAS를 재사용한다. 별도 date response table은 가능하지만 join/name/version 이중화가 커 이번 첫 안으로 추천하지 않는다.

신규 제안 migration: `supabase/migrations/20261006000000_wwm_date_mode.sql`. 과거 migration을 소급 수정하지 않는다. 실제 DB 적용 이력/constraint/grant는 부모가 먼저 확인해야 한다.

- rooms: `schedule_mode text not null default 'time'`, time/date CHECK. mode immutable. 날짜방 time 컬럼 nullable+mode별 CHECK를 첫 안으로 추천한다(date 두 시간 null, time은 기존 제약). 00:00/24:00 compatibility sentinel 안도 가능하지만 부모가 결정하며 날짜 응답/Google 의미에 사용하지 않는다.
- responses: `available_dates date[] not null default '{}'`. date mode slots 빈 배열, time mode dates 빈 배열; 1-D/1-based, null 없음, unique, max28, 범위 검증. room 조회는 trigger/RPC에서 수행하며 양쪽 branch 모두 updated_at 갱신.
- 기존 RLS member read/own update를 유지하고 새 컬럼 grant를 명시한다. service-role bypass 금지. definer RPC search_path/auth.uid/is_google/is_member/owner 검증 유지. create/join은 정확한 mode의 빈 response 초기화.
- create/schedule은 mode-aware branch 또는 별도 date RPC. overload ambiguity 금지. date schedule shrink는 날짜 비교로 trim하여 removedDates 반환. 기간 확장으로 응답 자동 추가 금지.
- room_people/confirmation_attendees의 has_availability는 mode에 따라 dates/slots cardinality를 선택한다. membership LEFT JOIN과 이름 fallback 유지.
- confirmations와 revisions에 schedule_mode/start_date/end_date_exclusive 추가. timed starts_at/ends_at NOT NULL을 mode별 CHECK로 교체한다. date는 날짜 둘 required, `end_date_exclusive=start_date+1`, timed 둘 null. 기존 rows는 time backfill.
- initial/update reserve, private confirmation_claim, member status, owner_detail/open edit, private finalize update의 snapshot 복사를 전부 확장한다. 별도 date reserve RPC로 기존 timed 호출을 유지하는 방법을 우선 검토한다.
- member status는 emails/recipient snapshot 비공개. owner review만 email 이용. calendar private runtime 최소 권한과 finalize guard 유지.
- reserve transaction에서 날짜 범위를 재검증하며 schedule mutation과 room lock 또는 schedule version CAS로 직렬화한다. 범위가 바뀐 stale proposal Send 거절.
- Settings 기간 변경은 이미 확정된 Google event를 자동 변경하지 않는다. 범위 밖 확정일도 기록으로 표시하고 안내한다. 새 Edit 날짜만 현재 범위 안으로 제한. delete가 Google event를 cancel하지 않는 기존 계약 유지.

## 6. Google insert/edit/reconcile/resend 계약

Google 공식 resource에서 end는 exclusive이며, create guide는 종일에 start.date/end.date를 사용한다. 다음 예시는 계약 설명이며 실제 전송하지 않았다.

```json
{
  "summary": "Reviewed meeting title",
  "start": {"date": "2026-11-01"},
  "end": {"date": "2026-11-02"},
  "attendees": [{"email": "reviewed@example.com", "optional": true}],
  "guestsCanSeeOtherGuests": false,
  "guestsCanInviteOthers": false,
  "guestsCanModify": false
}
```

- date body에 dateTime/timeZone 혼용 금지. 다음 날은 civil calendar arithmetic으로 계산하며 zoned midnight+24h 사용 금지. DST의 23/25시간과 무관하다.
- validateConfirmation을 mode별로 분기한다. 날짜 branch는 real date/range/title/member UUID/recipient+excluded 완전 partition/optional subset/email uniqueness/revision 검증. timed duration<=24h 제약을 적용하지 않는다.
- fingerprint에 mode와 date interval을 포함하고 배열 canonical sort 유지. event ID는 기존 `confirmationEventId(roomId,1)`로 initial/edit/RSVP/resend 모두 동일하게 유지한다. revision마다 이벤트 생성 금지.
- buildCalendarInsert/buildCalendarPatch date branch 추가. edit는 동일 event ID를 patch하며 own attendee/RSVP 유지. mode 변경 금지로 timed↔date의 patch 잔존 필드 문제를 피한다.
- eventMatches의 date branch는 start.date/end.date를 exact compare하고 dateTime 부재/not cancelled/attendee email 집합 일치 확인. 현재 dateTime만 Date.parse하면 종일 event를 영구 reconciling으로 판단하므로 필수 수정이다.
- eventMatchesSnapshot의 title/optional 비교 유지. initial도 snapshot 비교에 통합해 제목/optional 불일치에서 confirmed하지 않는 것을 추천한다.
- reserve→get→insert once→get→match→finalize, 409 readback, timeout reconciling, definite release, edit reverted 유지. UI pending/reconciling 동안 proposal/recipients freeze, synchronous in-flight guard로 double submit 방지.
- resend는 기존 event의 sequence만 ETag 조건부 patch하고 새 이벤트를 만들지 않는다. 현행 resend에는 patch 후 추가 get이 없다. mock에서 날짜 불변을 검증하며 API 성공을 실제 메일 배달 증거로 주장하지 않는다. ambiguous 결과에 blind resend하지 않고 기존 rate-limit 유지.
- Calendar consent와 로그인은 별도 기존 flow 유지. owner credentials는 private 경로만 사용하고 tokens를 client/storage/log에 노출하지 않는다. 실제 OAuth scopes/refresh/private grants는 부모 검증 사항이다.

## 7. 정확한 파일 ownership 및 통합 책임

현재 lane의 쓰기 범위는 본 문서 하나다. 아래는 다음 담당 배정안이며 shared 파일이 많으므로 DATE-02→DATE-03 순서로 배정한다. 부모가 integration owner를 실제 배정 전에 지정한다.

### DATE-02 backend/domain 담당

feature prefix는 `src/features/when-we-meet/`다. 기존 수정 범위:
`api.ts`, `domain.mjs`, `domain.d.ts`, `normalize.mjs`, `normalize.d.mts`, `autosave.mjs`, `autosave.d.mts`, `availability-changes.mjs`, `useAvailabilitySync.ts`, `confirm-tab.mjs`, `confirm-tab.d.mts`, `confirmation-foundation.mjs`, `confirmation-flow.mjs`, `room-schedule.mjs`, `room-schedule.d.mts`; `src/lib/supabase/server.ts`.

서버 prefix는 `src/app/api/craft/when-we-meet/`다. 정확한 route 범위:
`route.ts`, `[roomId]/route.ts`, `[roomId]/events/route.ts`, `[roomId]/people/route.ts`, `[roomId]/invitation/route.ts`, `[roomId]/confirmation/route.ts`, `[roomId]/confirmation/shared.ts`, `[roomId]/confirmation/update/route.ts`, `[roomId]/confirmation/resend/route.ts`, `[roomId]/calendar/busy/route.ts`.
`calendar-db.ts`는 finalize 계약 변경이 필요한 경우만 수정.

신규 제안: feature `date-availability.mjs`, `date-availability.d.mts`, `date-contracts.ts`; 위 migration; `scripts/wwm-date-domain.test.mjs`, `scripts/wwm-date-api.test.mjs`, `scripts/wwm-date-sql.test.mjs`, `scripts/wwm-date-confirmation.test.mjs`.

### DATE-03 UI 및 room integration 담당

기존 feature 수정: `WhenWeMeet.tsx`, `draft.mjs`, `creation-validation.mjs`, `creation-validation.d.mts`, `ConfirmTab.tsx`, `ConfirmationPanel.tsx`, `RoomChrome.tsx`, `PeoplePanel.tsx`, `InvitationLanding.tsx`, `ServerSkeletons.tsx`, `RoomResponseLoader.tsx`, 필요한 `when-we-meet.css`, `creation-control.css`, `room-toolbar.css`, `confirmation-panel.css`; `src/i18n/locales/wwm/en.json`, `ko.json`; `src/stories/wwm/wwm.stories.tsx`.

신규 제안: feature `DateAvailabilityCalendar.tsx`, `DateConfirmationPanel.tsx`, `date-availability.css`; `scripts/wwm-date-draft.test.mjs`, `scripts/wwm-date-ui.test.mjs`.
기존 Calendar/Tabs/Popover/Dialog/ToggleGroup/Button 재사용. shared Calendar 변경은 이유와 전체 consumer 회귀를 부모에게 추가 승인받는다. DATE-02 파일 수정 필요 시 계약 차이를 부모에게 돌려보내며 UI만 만들고 room 미연결 상태를 done으로 보고하지 않는다.

### DATE-04 부모/독립 검수 담당

spec/quality/실행 테스트/실브라우저/허가된 DB roundtrip 검증. 모든 lane에서 analytics dirty 3파일 보호:
`scripts/analytics.test.mjs`, `src/components/GoogleAnalyticsTracker.tsx`, `src/utils/analytics.ts`.
AGENTS/config/별profile/server 시작·중지/commit/deploy/hosted migration/room 생성/실Calendar 초대는 허가 없이 수행하지 않는다.

## 8. 최소 ordered TDD 계획

각 단계는 실패 테스트 작성→RED 실제 확인→최소 구현→동일 테스트 GREEN이다. 아래는 예정 절차이며 통과 결과가 아니다.

1. Civil-date helper/test: real ISO, inclusive28/29reject, unique/sort, roster aggregate, next day, leap/month/year. `node --test scripts/wwm-date-domain.test.mjs` RED→helper 구현→GREEN.
2. 타입/normalize: absent mode time, unknown 거절, date를 instant 변환하지 않음, date open edit. normalize 테스트 RED→contract/normalizer→GREEN.
3. SQL: mode/arrays/constraints/RPC/grants structural test RED→migration→GREEN. 문자열 테스트는 DB 실행 증거 아님. 부모 승인 후 isolated DB에서 old/new rows/RLS/trigger/reserve/revisions 실제 검증.
4. saveDates/API CAS: injected fake client로 invalid/auth/member/mode/baseline/retry/range mutation race RED→reader/route→GREEN. HTTP/DB roundtrip은 별도.
5. autosave/SSE: date delta, 같은 계정 두 탭, 다른 계정, remote during in-flight, reconnect/identity change의 deterministic tests RED→adapter/payload→GREEN.
6. Google: `scripts/wwm-date-confirmation.test.mjs` RED→foundation/flow/routes/claims→GREEN. insert/edit/readback/resend와 기존 timed suite 함께 수행.
7. create draft: v2/v1호환/mode toggle/captured request/OAuth completed guard RED→draft/UI wiring→GREEN. cancelled/failed/replayed login과 ordinary load closed 유지.
8. monthly UI: real component fixture multiple/single/read-only/heading/disabled/roster/bulk/saved-unsaved RED→adapter→GREEN. Storybook 데이터는 synthetic 명시.
9. room integration: 모드 분기/skeleton/settings/list/preview/i18n 연결. mounted test로 day click auto-send 없음, separate review+Send, double-click/freeze/reconcile/optional/excluded/missing email/member privacy 검증.
10. 독립 회귀/visual acceptance: 부모가 아래 matrix 실행. 승인 부족하면 integration blocked로 기록하고 mock 완료로 기능 done 처리하지 않는다.

package.json에는 test script가 없고 직접 Node test runner를 사용한다. 구현 후 명령:

```sh
node --test scripts/wwm-date-*.test.mjs
node --test scripts/wwm-confirmation-foundation.test.mjs scripts/wwm-confirmation-flow.test.mjs scripts/wwm-confirmation-edit.test.mjs scripts/wwm-confirmation-revisions-sql.test.mjs
node --test scripts/wwm-i18n*.test.mjs scripts/wwm-ko-writing.test.mjs
./node_modules/.bin/tsc --noEmit
bun run lint
bun run build
```

전체 script를 먼저 목록화해 unit/source와 live Aside test를 분리한다. room/mail write를 포함한 browser script를 무조건 일괄 실행하지 않는다. build는 부모 resource admission 이후. 이번 설계 lane에서는 테스트/build를 실행하지 않았다.

### 명시적 acceptance matrix

- time: 기존 mode 없는 room/v1draft, 23:30→24:00, 기존 All day, timed drag/CalendarFill/confirm/edit/resend 유지.
- date: same-day, inclusive28/29, reverse restart, 월/연도 경계, Feb29, room timezone today 경계, historical display.
- DST: America/New_York 2026-03-08/2026-11-01, Asia/Seoul, 극단 UTC offset에서 날짜 불변 및 exclusive next day. 과거일은 isolated validator fixture. 종일에 timed 24h 제한 적용 금지.
- response: 빈/전체선택, name-only, 같은 계정 두 탭 별일 편집, 같은 날 delta 충돌, save 중 remote, shrink, 새 member, 비member403, identity clear.
- aggregate: zero/one/all saved, nonrespondents, missing roster unknown, 다른 사람 수정 불가, unsaved 집계 불혼입.
- confirmation: 날짜 미선택 Send 불가, proposal이 내 응답 불변, partition/optional/email 검증, owner only, double send 방지, timeout/409 readback, 잘못된 end.date/type/title/optional 거절, revision 충돌, 동일 event edit, resend 날짜 불변.
- i18n: en/ko key/placeholder/plural, a11y/error/loading 포함, user title 그대로 유지.
- UI: create/my/everyone/confirm/settings/list, light/dark, 375/390/768/1024/1440, short modal, keyboard/touch, focus, overflow, intermediate motion/reduced-motion. screenshot+rects를 route/state/viewport별 저장하고 부모 직접 이미지 검사. kill-ai-slop scan은 candidate triage로 취급하며 의도된4px/색/avatar 유지.
- 승인된 isolated DB에서 write→exact readback→reload, 다른 계정 SSE와 Google fake transport body/readback. 실제 Calendar/mail은 별도 room/recipient 명시 승인 전 실행 금지.

## 9. 결정/승인 gates와 위험

**DATE-02 시작 전 부모 결정:** additive same-table schema, nullable vs sentinel time columns, date reserve RPC 명칭과 compatibility deploy 순서, roster update/SSE 계약, room schedule lock/version. UI 담당 추측에 맡기지 않는다.

**hosted 변경 전:** 실제 constraints/triggers/RPC/grants/적용 이력 읽기, 672 잔존 문제 확인, dry-run/rollback, timed old data 호환, 최소 권한 runtime grant 검토 및 사용자 승인. schema 미적용 상태로 date 저장 UI 공개 금지. rolling deployment의 capability gate 고려.

**실사용 검증 전:** authenticated exact origin, approved fixture, room CRUD와 실제 Calendar recipient scope 명시 승인. auth storage 복사/recipient 추측 금지.

**release 전:** DATE-02/03/04 독립 acceptance. unit/SQL 문자열/Storybook/HTTP200을 hosted persistence/Google mail 배달로 과장하지 않는다.

남은 제품 결정: 빈 날짜 선택을 명시적 불참 응답으로 구분할지, 기간 축소로 확정일이 후보 밖에 있을 때의 copy. 기본안은 기존 의미(미등록/확정기록 유지)를 유지한다. 새 의미가 필요하면 respondedAt 등 계약을 부모 승인받는다.

## 10. Obsidian synchronization-review — 읽기 전용

읽은 정본:
- `/Users/junhyeok_home/Library/Mobile Documents/iCloud~md~obsidian/Documents/ai-vault/_CLAUDE.md`
- 같은 vault `Projects/blog-project/When We Meet execution plan.md`, 2026-10-06 dates 절과 DATE-01..04
- 같은 vault `Projects/blog-project/README.md`

현재 DATE-01 design, DATE-02/03/04 pending. 다중 가능일/최종 하루/명시 Send/실송신 별승인/dirty3 보호와 일치한다. 오래된 14일/2px/Reset·Cancel·Apply/English-only는 최신 코드·부모 계약보다 우선하지 않는다. README의 과거 owner/실행순서도 dated historical context로 취급한다.

부모 동기화 제안: DATE-01을 문서 작성 완료·부모 승인 대기로 기록하고 본파일 링크/schema gate/672 위험을 남긴다. DATE-02..04는 완료 처리하지 않는다. 이 lane에서 vault는 수정하지 않았다.

## 11. 출처와 조사 증거

- repo AGENTS.md와 local Next `node_modules/next/dist/docs/01-app/01-getting-started/15-route-handlers.md`를 읽었다. 현재 request-scoped user RLS/same-origin Route Handlers 확장, mutation error와 render error 분리, user간 캐시 공유 금지.
- Google Events: `https://developers.google.com/workspace/calendar/api/v3/reference/events` — 2026-10-06 HTTP 조회, end exclusive 및 all-day date 확인.
- Google Create: `https://developers.google.com/workspace/calendar/api/guides/create-events` — 같은 날 조회, dateTime vs all-day date와 attendees/sendUpdates 설명 확인.
- shadcn Calendar: `https://ui.shadcn.com/docs/components/calendar` — 같은 날 조회, 현재 `/docs/components/base/calendar` redirect 확인. 설치 wrapper를 무단 upgrade하지 않고 DayPicker props adapter를 사용한다.
- web_extract backend는 URL extract 미지원 오류를 반환했다. urllib HTTP 조회로 공식 페이지를 읽었다. 로그인/secret/env는 읽지 않았다.
- 시작 git status는 analytics3 dirty뿐이었다. 종료에는 본 설계 문서만 추가되었으며 기존 dirty3은 그대로다.

**완료 의미:** 설계 문서만 작성한 상태다. 기능 구현/hosted schema/실화면/메일 검증은 다음 담당과 부모의 승인·검수가 필요하다.
