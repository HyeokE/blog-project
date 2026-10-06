'use client';
import { Calendar } from '@/components/ui/calendar';
import { enUS, ko } from 'react-day-picker/locale';
import type { DateRoomSchedule } from './date-contracts';
import { toLocalDate, fromLocalDate } from './date-calendar.mjs';
import { useWwmCopy } from './i18n/WwmI18nProvider';
export function DateAvailabilityCalendar({
  room,
  selected,
  onChange,
  disabled = false,
  inspection,
  onInspect,
}: {
  room: DateRoomSchedule;
  selected: string[];
  onChange: (dates: string[]) => void;
  disabled?: boolean;
  inspection?: string;
  onInspect?: (date: string) => void;
}) {
  const { locale } = useWwmCopy();
  const within = (date: Date) => {
    const value = fromLocalDate(date);
    return value >= room.startDate && value <= room.endDate;
  };
  const common = {
    className: 'wwm-date-calendar',
    locale: locale === 'ko' ? ko : enUS,
    defaultMonth: toLocalDate(room.startDate),
    startMonth: toLocalDate(room.startDate),
    endMonth: toLocalDate(room.endDate),
    showOutsideDays: false,
    fixedWeeks: true,
    disabled: (date: Date) => disabled || !within(date),
    labels: { labelDayButton: (date: Date) => fromLocalDate(date).replaceAll('-', '.') },
    formatters: {
      formatCaption: (date: Date) =>
        date.toLocaleDateString(locale === 'ko' ? 'ko-KR' : 'en-US', {
          month: 'short',
          year: 'numeric',
        }),
    },
  };
  if (onInspect) {
    return (
      <Calendar
        {...common}
        mode="single"
        selected={inspection ? toLocalDate(inspection) : undefined}
        onSelect={(date) => {
          if (date && within(date)) {
            onInspect(fromLocalDate(date));
          }
        }}
      />
    );
  }
  return (
    <Calendar
      {...common}
      mode="multiple"
      selected={selected.map(toLocalDate)}
      onSelect={(dates) => {
        if (!disabled && (dates || []).every(within)) {
          onChange((dates || []).map(fromLocalDate).sort());
        }
      }}
    />
  );
}
