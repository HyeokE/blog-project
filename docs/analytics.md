# Google Analytics

기존 측정 ID **G-07RYXQL1X0**를 사용합니다. 루트 레이아웃의
`GoogleAnalyticsTracker`가 모든 테마와 하위 페이지에서 스크립트를 한 번 로드합니다.
SDK 다운로드 전 이벤트도 설정 뒤에 큐에 보관합니다.

| 이벤트 | 수집 시점 |
| --- | --- |
| `page_load` | 최초 렌더링 및 pathname이 바뀐 클라이언트 이동·뒤로/앞으로 가기 |
| `ui_click` | 링크, 버튼, 입력 요소, ARIA 컨트롤, 명시적으로 표시한 클릭 영역 |
| `ui_input` | 텍스트 필드에 포커스한 뒤 처음 편집할 때 한 번 |
| `search_results` | 검색어 편집이 400ms 멈췄거나 결과 선택 직전: 검색어 길이·결과 수·결과 유무 |
| `gallery_view` | 전체화면 뷰어에서 실제 표시된 사진 변경 (공개 이미지 경로로 식별) |
| `ui_change` | select, checkbox, radio 등 값 변경 |
| `form_submit` | 제출 이벤트 발생 시점 (서버 처리 성공을 뜻하지 않음) |
| `ui_expand` | details 펼치기/접기 |
| `content_scroll` | 페이지 및 표시한 내부 영역의 25/50/75/90% 도달, 페이지·영역별 한 번 |
| `wwm_outcome` | When We Meet 서버 호출의 결과(성공/실패). 아래 "When We Meet 결과 이벤트" 참고 |
| `wwm_funnel` | When We Meet 단계 도달과 부가 신호 (이탈 분석용) |
| `wwm_exit` | When We Meet 흐름이 끝난 방식과 마지막 도달 단계 |
| `ui_interaction` | 검색 단축키, 검색 결과 키보드 선택, Escape/외부 클릭 닫기, 갤러리 스와이프, 글 목록 탐색 |

측정 ID, 모든 이벤트 이름, 동작 이름과 타입은 `src/constants/analytics.ts`에서 관리합니다.
`trackEvent`와 `trackInteraction`은 상수에 등록한 이름만 받습니다.

공통 파라미터: `page_path`, `page_location`, `design_theme`, `color_mode`,
`page_name`, `app_device_type`, `device_platform`, `browser_language`, `viewport_width`,
`viewport_height`, `network_type`, `online`.
요소 이벤트에는 `element_name`, `element_type`, 링크에는 `link_url`, `link_type`가 포함됩니다.
제스처·단축키는 `action`, `method`, 필요 시 `content_id`로 구분합니다.
`ui_click`과 `ui_interaction`은 원시 클릭과 의미 있는 동작을 각각 나타내므로 합산해 클릭 수로 쓰지 않습니다.

## 기기와 접속 환경

공통 환경 정보는 모든 커스텀 이벤트에 포함됩니다. 상세 정보는 페이지 진입 시 아래 이벤트로
나누어 기록하고, 화면 크기·온라인 상태·연결·사용자 환경 설정이 바뀌면 변경된 스냅샷만 다시 보냅니다.
GA4의 이벤트당 25개 파라미터 제한을 지키도록 분리했습니다.

| 이벤트 | 추가 정보 |
| --- | --- |
| `environment_browser` | 브라우저 이름·버전·브랜드, 언어 목록, 시간대·UTC 차이, 쿠키 지원, 보안 연결, PWA 표시 모드, 애니메이션 축소·색상 설정 |
| `environment_device` | 화면·가용 화면 크기, 픽셀 비율·색 깊이, 터치 포인트, 화면 방향, 포인터 유형, 논리 CPU 수·대략적인 메모리(지원 시) |
| `environment_network` | 연결 종류·유효 연결 등급, 추정 대역폭·RTT·데이터 절약 모드(지원 시), 문서 진입 방식·표시 상태·정리한 유입 URL |

`app_device_type`은 브라우저 정보로 추정한 desktop/mobile/tablet 분류입니다.
브라우저가 제공하지 않는 값은 생략하거나 `unknown`/`unavailable`로 기록합니다.
언어·시간대는 실제 위치를 뜻하지 않습니다. GA가 기본 제공하는 OS·기기·브라우저·지역 정보는
기존 GA 설정에 따라 계속 수집되며, 지역별 수집 제한 설정을 변경하지 않습니다.
정확한 위치, 원문 IP, 쿠키 값, 검색어, 파일명, 배터리, 기기 지문 식별자는 별도로 수집하지 않습니다.
장치 권한이나 고엔트로피 Client Hints를 요청하지 않습니다.

[GA4 수집 제한](https://support.google.com/analytics/answer/9267744?hl=en)과
[기술 세부정보 보고서](https://support.google.com/analytics/answer/12980150)를 참고하세요.

## 페이지 조회

GA의 기본 `page_view` 자동 수집을 유지합니다. 앱에서 `page_view`를 추가로 보내지 않습니다.
모든 경로 이동을 코드에서 보장하는 이벤트는 **`page_load`**이며 GA 관리 설정과 독립적으로 전송합니다.
쿼리나 해시만 변경한 경우는 새 페이지 로딩으로 세지 않습니다.

기본 페이지 보고서에서도 SPA 이동을 보려면 GA 관리 → 데이터 스트림 → 향상된 측정 →
페이지 조회 → 브라우저 방문 기록 기반 페이지 변경이 켜져 있어야 합니다.
이 저장소의 변경은 GA 관리 설정을 변경하지 않습니다.
[Google의 SPA 측정 가이드](https://developers.google.com/analytics/devguides/collection/ga4/single-page-applications)를 참고하세요.

## When We Meet 결과 이벤트

`ui_click`과 `form_submit`은 눌렀다는 사실만 알려 주므로, 실제 성공 여부는 `wwm_outcome`으로 따로 봅니다.
`src/features/when-we-meet/api.ts`의 `outcome()` 한 곳에서 서버 호출 결과를 기록합니다.

| 파라미터 | 값 |
| --- | --- |
| `operation` | `ANALYTICS_WWM_OPERATIONS`의 동작 이름: `create_room`, `join_room`, `save_response`, `calendar_busy`, `confirm_send`, `confirm_update`, `confirm_resend`, `rename_room`, `update_schedule`, `delete_room`, `invitation_preview`, `calendar_connect_start`, `sign_in_start`, `load_meetings`/`load_room`/`load_confirmation`(실패만) |
| `result` | `ok` 또는 `error` (캘린더 동의 복귀는 `success`/`error`/`info`) |
| `http_status`, `reconnect` | 실패일 때만. 네트워크 오류는 상태 0 |
| `duration_ms` | 요청 시작부터 응답까지 |
| `slot_count`, `removed_slots` | 저장·캘린더 미리보기·일정 변경에서만 개수로 기록 |

`calendar_connect_return`은 Google 캘린더 동의 후 방으로 돌아왔을 때 결과 톤만 기록합니다.
방 ID, 이름, 제목, 이메일, 시간 목록은 보내지 않습니다. 새 서버 호출을 `api.ts`에 추가하면
`outcome()`으로 감싸야 하며, `scripts/wwm-outcome-analytics.test.mjs`가 이를 검사합니다.

## When We Meet 이탈 분석

`src/features/when-we-meet/funnel.ts`가 흐름(flow)별로 단계를 기록합니다. 단계 순서는
`ANALYTICS_WWM_FUNNELS`(`src/constants/analytics.ts`)가 정하고, `step_index`는 그 순서의 위치입니다.

| flow | 단계 (순서대로) | 의미 |
| --- | --- | --- |
| `onboarding` | `guest_view` → `sign_in_click` → `list_view` | 비로그인 첫 화면 → 로그인 시도 → 로그인한 목록 |
| `create` | `dialog_open` → `first_input` → `title_filled` → `dates_filled` → `name_filled` → `submit` → `created` → `invite_copied` | 모임 만들기 |
| `invite` | `landing_view` → `sign_in_click` → `signed_in` → `join_submit` → `joined` | 초대받은 사람의 합류 |
| `room` | `room_view` → `first_select` → `first_saved` | 방에서 시간 고르고 저장 |
| `confirm` | `tab_view` → `time_selected` → `review_open` → `sent` | 주최자의 확정·발송 |

`wwm_funnel`: `flow`, `step`, `step_index`, `elapsed_ms`(흐름 시작 후), 단계별 부가 값(`signed_in`, `link_state`, `role`, `people` 등).
같은 흐름에서 같은 단계는 한 번만 기록합니다. 오류·탭 전환 같은 부가 신호는 `step_index = -1`, `signal = true`로
기록하며 단계를 진행시키지 않습니다: `validation_error`(+`field`), `submit_failed`, `join_failed`, `save_failed`,
`went_offline`, `tab_view`(+`tab`), `invite_copy`, `settings_open`, `calendar_fill_applied`(+`slot_count`),
`review_back`, `login_prompt`.

`wwm_exit`: 흐름이 끝난 방식. `reason`은 `dialog_close`(만들기 창을 닫음), `sign_in_prompt`/`handoff`(로그인으로 이동),
`open_meeting`/`dismiss`(만든 뒤), `tab_leave`, `navigate`(다른 화면으로 이동), `page_hide`(탭 숨김·닫기, 처음 한 번만)입니다.
`completed`는 마지막 단계에 도달했는지, `last_step`/`last_step_index`/`steps_reached`/`steps_total`은 어디까지 갔는지,
`elapsed_ms`는 머문 시간입니다. 만들기는 입력 상태(`title_filled`, `dates_filled`, `name_filled`, `error_count`), 방은
선택·저장 칸 수, 저장 안 된 변경 여부, 저장 상태, 본 탭 수, 역할, 참여 인원, 확정 여부가 함께 갑니다.
`handoff`와 `page_hide`는 `transport_type: beacon`으로 보내 페이지가 떠나는 순간에도 전달되게 합니다.

이탈 지점 보기: GA4 탐색 → 유입경로 탐색에서 `wwm_funnel`의 `step`을 단계로 놓거나, `wwm_exit`을
`completed = false`로 필터한 뒤 `last_step`별로 나눕니다. 맞춤 측정기준으로 `flow`, `step`, `last_step`,
`reason`, `completed`, `link_state`, `role`을 등록해야 보고서에 나타납니다(이 저장소는 GA 관리 설정을 바꾸지 않습니다).
방 ID, 이름, 제목, 이메일, 시간 목록은 보내지 않습니다. `scripts/wwm-funnel.test.mjs`가 단계 동작과 호출 누락을 검사합니다.

## 새 상호작용 추가

일반 링크·버튼과 동적으로 렌더링되는 Notion 링크는 자동 추적합니다.
아이콘 버튼에는 `aria-label`을 지정하세요. 비표준 클릭 영역은 다음처럼 표시합니다.

```tsx
<div data-analytics-label="gallery_open" data-analytics-id={image.id} onClick={openImage} />
```

- `data-analytics-section`: 공통 영역 이름
- `data-analytics-click-self="true"`: 배경 자체를 클릭할 때만 수집
- `data-analytics-ignore="true"`: 해당 요소와 하위 요소의 공통 추적 제외
- `data-analytics-scroll="article"`: 내부 스크롤 영역의 진행률 수집
- 클릭이 없는 동작은 `trackInteraction(ANALYTICS_ACTIONS.GALLERY_NAVIGATE, { method: 'swipe', direction: 'next' })` 사용

검색어·입력값·파일 업로드 입력의 파일명은 수집하지 않습니다. 갤러리의 공개 이미지 경로는 안정적인 콘텐츠 ID로 사용합니다. 커스텀 URL 파라미터는 쿼리/해시/인증 정보를 제거하고,
mailto/tel 링크는 프로토콜만 수집합니다. 사용자 입력을 `trackEvent`나 `trackInteraction`에 전달하지 마세요.
이는 커스텀 이벤트 규칙이며, GA 자체 향상된 측정 설정은 별도로 관리합니다.
무한 순환 글 목록은 물리적 스크롤 비율 대신 사용자가 탐색한 글을 기록합니다.

## 검증

### Web Vitals

루트의 `WebVitalsReporter`가 Next.js `useReportWebVitals`로 `CLS`, `FCP`, `INP`, `LCP`,
`TTFB`를 측정해 `web_vital` 이벤트로 보냅니다. 브라우저가 제공하면 `FID`도 기록합니다.
Vercel Speed Insights는 계속 동작합니다. 설치된 Vercel SDK의 `beforeSend`는 URL/route만
공개하므로, Vercel 서버의 수치를 복사하는 방식이 아닌 동일 표준 지표의 별도 수집입니다.
수집 시점과 표본에 따라 두 보고서의 수치는 다를 수 있습니다.

- `metric_name`, `metric_id`, `metric_rating`: 지표 종류, 측정 ID, 평가
- `metric_value`, `metric_delta`: 원래 측정값과 변화량. CLS는 점수, 나머지는 ms
- `metric_unit`: `score` 또는 `ms`
- `value`: GA 전송용 반올림 값. CLS만 1,000배하며 원래 값은 `metric_value`에 보존
- `metric_page_path`: 측정 대상 문서 경로. SPA 이동 후 보고돼도 최초 문서 경로 유지
- `measurement_source`: `next_web_vitals`

동일 측정 ID/값의 중복 콜백은 제거하고 갱신된 값은 다시 보냅니다. 측정 ID별 마지막 값을
사용해 분포를 계산하세요. GA Explore에서는 `web_vital`로 필터링하고 `metric_name`,
`metric_rating`, `metric_unit`, `metric_page_path`를 이벤트 범위 맞춤 측정기준으로,
`metric_value`를 맞춤 측정항목으로 등록하세요. 단위가 다른 지표를 합산하지 마세요.

참고: [Next.js Web Vitals](https://nextjs.org/docs/app/api-reference/functions/use-report-web-vitals),
[Vercel SDK 설정](https://vercel.com/docs/speed-insights/package).

`node --experimental-strip-types --test scripts/analytics.test.mjs`

브라우저에서 `window.dataLayer`의 `event` 항목과 Network의 `g/collect` 요청을 확인합니다.
`page_load`는 새로고침과 경로 이동마다 한 번이어야 하며, 중첩 SVG·stopPropagation이 있는 버튼도
`ui_click` 한 번이어야 합니다. GA 보고서에서 파라미터별 분석을 하려면 해당 파라미터를 이벤트 범위
맞춤 측정기준으로 등록하세요. 실제 GA 보고서 반영은 배포 후 별도 확인이 필요합니다.

페이지별 클릭 대상과 커버리지 검사는 [analytics-coverage.md](./analytics-coverage.md)에 정리했습니다.
