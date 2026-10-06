'use client';
import {useWwmCopy} from './i18n/WwmI18nProvider';
import { Skeleton } from '@/components/ui/skeleton';
export function DateRoomSkeleton() {
  const {t}=useWwmCopy();
  return (
    <div className="wwm-date-skeleton" role="status" aria-label={t('dateRoom.loading')}>
      <Skeleton className="wwm-date-skeleton-caption" />
      <div>
        {Array.from({ length: 42 }, (_, i) => (
          <Skeleton key={i} />
        ))}
      </div>
    </div>
  );
}
