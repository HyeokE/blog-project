# When We Meet — Korean UX writing (Toss-style)

Applies to `src/i18n/locales/wwm/ko.json` and any Korean copy in Craft. English copy keeps its own voice; keys and placeholders must stay in sync (see `scripts/wwm-i18n.test.mjs`).

## Principles
1. **해요체, 짧게.** One idea per sentence. `~할 수 있어요`, not `~하실 수 있습니다`.
2. **Talk about what the user did or can do.** `모임을 만들었어요` (not `모임이 생성되었습니다`).
3. **Plain words over Sino-Korean jargon.** Prefer `고르기`, `정하기`, `보내기`; use `확정`, `선택`, `진행` only where nothing simpler fits.
4. **Buttons say the outcome.** `초대 보내기`, `3칸 불러오기`, `일정 확정` — avoid bare `확인`/`완료` unless it truly only closes something.
5. **Questions end with `~할까요?`.** Never `~하시겠습니까?`.
6. **Errors give cause + next step.** `인터넷 연결을 확인하고 다시 시도해주세요`. No `오류가 발생했습니다`.
7. **Positive framing first.** `~하면 돼요` before `~할 수 없어요`.
8. **Numbers first, one unit.** `5명 중 4명 돼요`, `3칸 불러오기`. A half-hour cell is always `칸`.
9. **Honorifics only for people.** `{name}님`; don't honour the system.
10. **No memo-style endings.** Status labels use 해요체 or a noun phrase (`입력했어요`, `아직 입력 전`), never `알려줌`/`없음`.
11. **No exclamation marks, emoji, or forced friendliness.**

## Vocabulary
| Concept | Use | Avoid |
|---|---|---|
| meeting | 모임 | 미팅, 방 |
| half-hour cell | 칸 | 슬롯, 30분 블록 |
| availability | 되는 시간 / 가능한 시간 | 가용성 |
| calendar import | Google 캘린더에서 빈 일정 불러오기 · {n}칸 불러오기 | 캘린더로 채우기 |
| room tabs | 내 일정 · 전체 일정 · 참여자 · 일정 확정 | 내 시간, 모두의 시간 |
| organizer | 주최자 | 관리자, 방장 |
| confirm a time (tab) | 일정 확정 (status chip: 확정) | 시간 정하기, 컨펌 |
| invitation | 초대 | 인비테이션 |
| Google Calendar | Google 캘린더 | 구글 캘린더 |

## UX rules that go with the copy
- One filled primary button per view; on mobile it sits fixed at the bottom.
- One decision per step (e.g. confirm: pick a suggested time → review → send).
- Toasts report a finished result in one sentence; errors stay next to what failed.
