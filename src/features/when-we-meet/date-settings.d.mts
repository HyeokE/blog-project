export type DateSettingsDraft = {
  title: string;
  name: string;
  startDate: string;
  endDate: string;
  timezone: string;
};
export type DateSettingsErrors = Partial<
  Record<'title' | 'name' | 'dates' | 'timezone', 'invalid' | 'past'>
>;
export function validateDateSettings(
  draft: DateSettingsDraft,
  context?: { room?: { startDate: string }; baselineName?: string; now?: Date },
): DateSettingsErrors;
