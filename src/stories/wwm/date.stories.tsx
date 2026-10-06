import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useState, type ReactNode } from 'react';
import { expect, userEvent, waitFor } from 'storybook/test';
import DateWhenWeMeet from '@/features/when-we-meet/DateWhenWeMeet';
import WhenWeMeet from '@/features/when-we-meet/WhenWeMeet';
import type { DateRoomResponseResult } from '@/features/when-we-meet/DateRoomResponseLoader';
import { Button } from '@/components/ui/button';
import { Toaster } from '@/components/ui/sonner';
import { saveDraft } from '@/features/when-we-meet/draft.mjs';
import { MockAccountProvider, PERSON } from './mock-account';
import { within, storyCopy } from './locale-within';
import { dateState, resetDateMock, futureDateDraft, DATE_ROOM_ID } from './mock-date-api';
import { confirmationState, resetDateConfirmationMock } from './mock-date-confirmation-api';
import '@/features/when-we-meet/date-settings.css';
// The preview owns CSS, locale/theme, the timed reset and the application-network block.
// This file adds only data and real component entry points, never a copied date UI.
function reset(options: Parameters<typeof resetDateMock>[0] = {}) {
  resetDateMock(options);
  resetDateConfirmationMock();
}
const meta = {
  title: 'When We Meet/Date screens',
  component: DateWhenWeMeet,
  args: {
    initialRoom: { room: dateState.room, userId: dateState.userId },
    responsesPromise: Promise.resolve<DateRoomResponseResult>({ responses: dateState.responses }),
  },
  parameters: {
    nextjs: { appDirectory: true },
    docs: {
      description: {
        component:
          'Synthetic local transports; real date room, calendar, settings and confirmation components. No OAuth, Calendar or mail requests. Source tests do not establish browser acceptance. Room-title rename persists only in the synthetic date fixture through the approved shared mock branch.',
      },
    },
  },
  beforeEach: () => {
    reset();
  },
} satisfies Meta<typeof DateWhenWeMeet>;
export default meta;
type Story = StoryObj<typeof meta>;
type PlayContext = Parameters<NonNullable<Story['play']>>[0];
function Frame({ children }: { children: ReactNode }) {
  return (
    <MockAccountProvider value={{ user: PERSON, loading: false }}>
      <div className="light-wall light-page craft-chrome">{children}</div>
      <Toaster />
    </MockAccountProvider>
  );
}
function Room({ loading = false, error = false }: { loading?: boolean; error?: boolean }) {
  const [fixture] = useState(() => {
    const initialRoom = structuredClone({ room: dateState.room, userId: dateState.userId });
    let resolve!: (value: DateRoomResponseResult) => void;
    const responsesPromise = loading
      ? new Promise<DateRoomResponseResult>((r) => {
          resolve = r;
        })
      : Promise.resolve<DateRoomResponseResult>(
          error
            ? { error: 'Synthetic initial read failure' }
            : { responses: structuredClone(dateState.responses) },
        );
    return { initialRoom, responsesPromise, resolve };
  });
  return (
    <Frame>
      {loading && (
        <Button
          variant="outline"
          onClick={() => fixture.resolve({ responses: structuredClone(dateState.responses) })}
        >
          Resolve date availability fixture
        </Button>
      )}
      <DateWhenWeMeet
        initialRoom={fixture.initialRoom}
        responsesPromise={fixture.responsesPromise}
      />
    </Frame>
  );
}
const ready = async ({ canvasElement }: PlayContext) => {
  await waitFor(() =>
    expect(
      within(canvasElement).getByText(storyCopy().t('dateRoom.saved'), {
        selector: '[role="status"]',
      }),
    ).toBeVisible(),
  );
};
const tab = async (ctx: PlayContext, key: string) => {
  await ready(ctx);
  await userEvent.click(within(ctx.canvasElement).getByRole('tab', { name: storyCopy().t(key) }));
};
const openConfirm = async (ctx: PlayContext) => {
  await tab(ctx, 'dateRoom.confirmation');
  await waitFor(() =>
    expect(
      within(ctx.canvasElement).getByLabelText(storyCopy().t('dateConfirm.title')),
    ).toBeVisible(),
  );
};
const review = async (ctx: PlayContext) => {
  await openConfirm(ctx);
  const c = within(ctx.canvasElement);
  await userEvent.click(
    c.getByRole('button', { name: dateState.room.startDate.replaceAll('-', '.') }),
  );
  await expect(c.getByRole('button', { name: storyCopy().t('dateConfirm.review') })).toBeEnabled();
  await expect(
    c.queryByRole('button', { name: storyCopy().t('dateConfirm.send') }),
  ).not.toBeInTheDocument();
  await userEvent.click(c.getByRole('button', { name: storyCopy().t('dateConfirm.review') }));
  await expect(
    c.getByRole('heading', { name: storyCopy().t('dateConfirm.recipients') }),
  ).toBeVisible();
  await expect(c.getByRole('button', { name: storyCopy().t('dateConfirm.send') })).toBeEnabled();
  await expect(confirmationState.posts).toHaveLength(0);
};
const settings = async (ctx: PlayContext) => {
  await ready(ctx);
  await userEvent.click(
    within(ctx.canvasElement).getByRole('button', { name: storyCopy().t('room.options') }),
  );
  await userEvent.click(
    within(document.body).getByRole('menuitem', { name: storyCopy().t('common.settings') }),
  );
  await waitFor(() => expect(within(document.body).getByRole('dialog')).toBeVisible());
};
const edit = async (ctx: PlayContext) => {
  await ready(ctx);
  await userEvent.click(
    within(ctx.canvasElement).getByRole('button', {
      name: dateState.room.startDate.replaceAll('-', '.'),
    }),
  );
};
export const OwnerAvailability: Story = { render: () => <Room />, play: ready };
export const OwnerAvailabilityMobile: Story = {
  ...OwnerAvailability,
  globals: { viewport: { value: 'mobile', isRotated: false } },
};
export const OwnerAvailabilityDark: Story = { ...OwnerAvailability, globals: { theme: 'dark' } };
export const Everyone: Story = {
  ...OwnerAvailability,
  play: async (ctx) => {
    await tab(ctx, 'dateRoom.everyone');
    await waitFor(() => expect(within(ctx.canvasElement).getByText('Morgan Sample')).toBeVisible());
  },
};
export const People: Story = {
  ...OwnerAvailability,
  play: async (ctx) => {
    await tab(ctx, 'people.heading');
    await waitFor(() => expect(within(ctx.canvasElement).getByText('Taylor Sample')).toBeVisible());
  },
};
export const ConfirmOwner: Story = { ...OwnerAvailability, play: openConfirm };
export const ConfirmReview: Story = { ...OwnerAvailability, play: review };
export const ConfirmReviewMobile: Story = {
  ...ConfirmReview,
  globals: { viewport: { value: 'mobile', isRotated: false } },
};
export const ConfirmReviewDark: Story = { ...ConfirmReview, globals: { theme: 'dark' } };
export const ConfirmBackAndReview: Story = {
  ...OwnerAvailability,
  play: async (ctx) => {
    await review(ctx);
    const c = within(ctx.canvasElement);
    await userEvent.click(c.getByRole('button', { name: storyCopy().t('dateConfirm.back') }));
    await expect(
      c.queryByRole('button', { name: storyCopy().t('dateConfirm.send') }),
    ).not.toBeInTheDocument();
    await userEvent.click(c.getByRole('button', { name: storyCopy().t('dateConfirm.review') }));
    await expect(c.getByRole('button', { name: storyCopy().t('dateConfirm.send') })).toBeEnabled();
    await expect(confirmationState.posts).toHaveLength(0);
  },
};
export const ConfirmSend: Story = {
  ...OwnerAvailability,
  play: async (ctx) => {
    await review(ctx);
    await userEvent.click(
      within(ctx.canvasElement).getByRole('button', { name: storyCopy().t('dateConfirm.send') }),
    );
    await waitFor(() =>
      expect(
        within(ctx.canvasElement).getByRole('button', { name: storyCopy().t('dateConfirm.edit') }),
      ).toBeVisible(),
    );
    await expect(confirmationState.posts).toHaveLength(1);
  },
};
export const ConfirmSendFailed: Story = {
  ...OwnerAvailability,
  beforeEach: () => {
    reset();
    confirmationState.send = 'failure';
  },
  play: async (ctx) => {
    await review(ctx);
    await userEvent.click(
      within(ctx.canvasElement).getByRole('button', { name: storyCopy().t('dateConfirm.send') }),
    );
    await waitFor(() =>
      expect(
        within(ctx.canvasElement).getByText(storyCopy().t('dateConfirm.failed')),
      ).toBeVisible(),
    );
  },
};
export const ConfirmLoading: Story = {
  ...OwnerAvailability,
  beforeEach: () => {
    reset();
    confirmationState.load = 'pending';
  },
  play: async (ctx) => {
    await tab(ctx, 'dateRoom.confirmation');
    await expect(
      within(ctx.canvasElement).getByRole('button', { name: storyCopy().t('dateConfirm.reload') }),
    ).toBeVisible();
  },
};
export const ConfirmLoadError: Story = {
  ...OwnerAvailability,
  beforeEach: () => {
    reset();
    confirmationState.load = 'failure';
  },
  play: async (ctx) => {
    await tab(ctx, 'dateRoom.confirmation');
    await waitFor(() =>
      expect(
        within(ctx.canvasElement).getByText(storyCopy().t('dateConfirm.loadFailed')),
      ).toBeVisible(),
    );
  },
};
export const ConfirmLoadRetry: Story = {
  ...ConfirmLoadError,
  play: async (ctx) => {
    await ConfirmLoadError.play?.(ctx);
    confirmationState.load = 'success';
    await userEvent.click(
      within(ctx.canvasElement).getByRole('button', { name: storyCopy().t('dateConfirm.reload') }),
    );
    await waitFor(() =>
      expect(
        within(ctx.canvasElement).getByLabelText(storyCopy().t('dateConfirm.title')),
      ).toBeVisible(),
    );
  },
};
export const MemberAvailability: Story = {
  ...OwnerAvailability,
  beforeEach: () => {
    reset({ member: true });
  },
};
export const ConfirmMember: Story = {
  ...MemberAvailability,
  play: async (ctx) => {
    await tab(ctx, 'dateRoom.confirmation');
    await waitFor(() =>
      expect(
        within(ctx.canvasElement).getByText(storyCopy().t('dateConfirm.notConfirmed')),
      ).toBeVisible(),
    );
  },
};
export const SettingsOwner: Story = {
  ...OwnerAvailability,
  play: async (ctx) => {
    await settings(ctx);
    await expect(
      within(document.body).getByLabelText(storyCopy().t('dateSettings.meetingName')),
    ).toBeVisible();
  },
};
export const SettingsOwnerMobile: Story = {
  ...SettingsOwner,
  globals: { viewport: { value: 'mobile', isRotated: false } },
};
export const SettingsOwnerDark: Story = { ...SettingsOwner, globals: { theme: 'dark' } };
export const SettingsMember: Story = {
  ...MemberAvailability,
  play: async (ctx) => {
    await settings(ctx);
    const body = within(document.body);
    await expect(
      body.queryByLabelText(storyCopy().t('dateSettings.meetingName')),
    ).not.toBeInTheDocument();
    await expect(body.getByLabelText(storyCopy().t('dateSettings.yourName'))).toBeVisible();
  },
};
export const Share: Story = {
  ...OwnerAvailability,
  beforeEach: () => {
    reset();
    const descriptor = Object.getOwnPropertyDescriptor(navigator, 'clipboard');
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: () => Promise.reject(new Error('Synthetic clipboard refusal')) },
    });
    return () => {
      if (descriptor) {
        Object.defineProperty(navigator, 'clipboard', descriptor);
      } else {
        Reflect.deleteProperty(navigator, 'clipboard');
      }
    };
  },
  play: async (ctx) => {
    await ready(ctx);
    await userEvent.click(
      within(ctx.canvasElement).getByRole('button', { name: storyCopy().t('room.invite') }),
    );
    await waitFor(() => expect(within(document.body).getByRole('dialog')).toBeVisible());
    await expect(
      within(document.body).getByRole('textbox', { name: storyCopy().t('room.invitationLink') }),
    ).toHaveValue(
      `${window.location.origin}/craft/when-we-meet/${DATE_ROOM_ID}?invite=${dateState.room.inviteToken}`,
    );
  },
};
export const MonthBoundary28Days: Story = {
  ...OwnerAvailability,
  beforeEach: () => {
    reset({ longRange: true });
  },
};
export const ResponsesLoading: Story = { render: () => <Room loading /> };
export const ResponsesResolved: Story = {
  ...ResponsesLoading,
  play: async (ctx) => {
    await userEvent.click(
      within(ctx.canvasElement).getByRole('button', { name: 'Resolve date availability fixture' }),
    );
    await ready(ctx);
  },
};
export const ResponsesError: Story = {
  render: () => <Room error />,
  play: async (ctx) => {
    await waitFor(() =>
      expect(
        within(ctx.canvasElement).getByText(storyCopy().t('dateRoom.loadFailed')),
      ).toBeVisible(),
    );
  },
};
export const ResponsesRetry: Story = {
  ...ResponsesError,
  play: async (ctx) => {
    await ResponsesError.play?.(ctx);
    await userEvent.click(
      within(ctx.canvasElement).getByRole('button', { name: storyCopy().t('common.retry') }),
    );
    await ready(ctx);
  },
};
export const SavePending: Story = {
  ...OwnerAvailability,
  beforeEach: () => {
    reset();
    dateState.save = 'pending';
  },
  play: async (ctx) => {
    await edit(ctx);
    await waitFor(() =>
      expect(
        within(ctx.canvasElement).getByText(storyCopy().t('dateRoom.saving'), {
          selector: '[role="status"]',
        }),
      ).toBeVisible(),
    );
  },
};
export const SaveFailed: Story = {
  ...OwnerAvailability,
  beforeEach: () => {
    reset();
    dateState.save = 'failure';
  },
  play: async (ctx) => {
    await edit(ctx);
    await waitFor(
      () =>
        expect(
          within(ctx.canvasElement).getByText(storyCopy().t('dateRoom.saveFailed')),
        ).toBeVisible(),
      { timeout: 8000 },
    );
  },
};
export const SaveRetry: Story = {
  ...SaveFailed,
  play: async (ctx) => {
    await SaveFailed.play?.(ctx);
    dateState.save = 'success';
    await userEvent.click(
      within(ctx.canvasElement).getByRole('button', { name: storyCopy().t('common.retry') }),
    );
    await ready(ctx);
  },
};
function Creation() {
  return (
    <Frame>
      <WhenWeMeet meetingsSection={null} />
    </Frame>
  );
}
const createSeed = () => {
  reset();
  saveDraft(sessionStorage, futureDateDraft(new Date()));
};
export const CreateDate: Story = {
  render: () => <Creation />,
  beforeEach: createSeed,
  play: async ({ canvasElement }) => {
    await userEvent.click(
      within(canvasElement).getByRole('button', { name: storyCopy().t('list.newMeeting') }),
    );
    await waitFor(() =>
      expect(
        within(document.body).getByRole('radio', { name: storyCopy().t('common.dates') }),
      ).toHaveAttribute('aria-checked', 'true'),
    );
    await expect(document.getElementById('wwm-create-times')).not.toBeInTheDocument();
  },
};
export const CreateDateFailure: Story = {
  ...CreateDate,
  beforeEach: () => {
    createSeed();
    dateState.create = 'failure';
  },
  play: async (ctx) => {
    await CreateDate.play?.(ctx);
    await userEvent.click(
      within(document.body).getByRole('button', { name: storyCopy().t('create.submit') }),
    );
    await waitFor(() =>
      expect(within(document.body).getByText(storyCopy().t('errors.create'))).toBeVisible(),
    );
  },
};
