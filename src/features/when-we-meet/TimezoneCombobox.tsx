'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Check } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { FieldTrigger } from '@/components/ui/field-trigger';
import { isValidTimezone, revealScrollDelta, searchTimezones, timezoneOffset, timezoneOptions } from './timezone-options.mjs';
import './timezone-combobox.css';
import {ANALYTICS_ELEMENTS} from '@/constants/analytics';
import {useWwmCopy} from './i18n/WwmI18nProvider';

type Props = {
  value: string;
  onChange: (value: string) => void;
  id: string;
  required?: boolean;
  disabled?: boolean;
  referenceDate?: string;
  'aria-labelledby'?: string;
  'aria-describedby'?: string;
  error?: string;
};

/** Scrolls only the list viewport (never the page) so the active option is visible. */
function revealActive(list: HTMLElement | null, mode: 'center' | 'nearest') {
  const option = list?.querySelector<HTMLElement>('[data-slot="command-item"][data-selected="true"]');
  const viewport = option?.closest<HTMLElement>('[data-slot="command-list"]');
  if (!option || !viewport || !viewport.clientHeight) {return;}
  viewport.scrollTop += revealScrollDelta(option.getBoundingClientRect(), viewport.getBoundingClientRect(), mode);
  // Rows share one height: start the viewport on a row boundary so no half-cut row sits under the search field.
  const row = option.offsetHeight;
  if (mode === 'center' && row) {viewport.scrollTop = Math.round(viewport.scrollTop / row) * row;}
}

/** Searchable timezone field: Popover + Command, always below the trigger, opening on the selected zone. */
export function TimezoneCombobox({ value, onChange, id, required, disabled, referenceDate, error, ...aria }: Props) {
  const {t} = useWwmCopy();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState('');
  const resultsRef = useRef<HTMLDivElement>(null);
  const options = useMemo(() => timezoneOptions(), []);
  const results = useMemo(() => searchTimezones(query, options), [query, options]);
  const selected = isValidTimezone(value) ? value : '';

  // On open, wait for the popover to be positioned and sized, then center the selection.
  useEffect(() => {
    if (!open) {return;}
    let frame = requestAnimationFrame(() => { frame = requestAnimationFrame(() => revealActive(resultsRef.current, 'center')); });
    return () => cancelAnimationFrame(frame);
  }, [open]);

  function commit(zone: string) {
    if (!options.includes(zone)) {return;}
    onChange(zone);
    setOpen(false);
    setQuery('');
  }
  function changeOpen(next: boolean) {
    setOpen(next);
    if (next) {
      setQuery('');
      setActive(selected || options[0] || '');
    }
  }

  return <Popover open={open} onOpenChange={changeOpen} modal={false}>
    <PopoverTrigger asChild>
      <FieldTrigger id={id} data-analytics-label={ANALYTICS_ELEMENTS.TIMEZONE_PICKER} disabled={disabled} aria-required={required} aria-invalid={Boolean(error)} {...aria} className="wwm-tz-trigger" value={selected ? `${selected.replaceAll('_', ' ')} · ${timezoneOffset(selected, referenceDate)}` : ''} placeholder={t('picker.chooseTimezone')}/>
    </PopoverTrigger>
    <PopoverContent align="start" side="bottom" sideOffset={4} collisionPadding={16} avoidCollisions={typeof window !== 'undefined' && window.matchMedia('(max-width: 640px)').matches} className="wwm-tz-popover" onOpenAutoFocus={event => { if (window.matchMedia('(max-width: 640px)').matches) { event.preventDefault(); (event.currentTarget as HTMLElement | null)?.focus({ preventScroll: true }); } }} onEscapeKeyDown={event => { event.preventDefault(); event.stopPropagation(); setOpen(false); }}>
      <Command shouldFilter={false} value={active} onValueChange={setActive} label={t('picker.timezones')} loop={false}>
        <CommandInput data-analytics-label={ANALYTICS_ELEMENTS.TIMEZONE_SEARCH} aria-label={t('picker.searchTimezonesLabel')} value={query} onValueChange={next => { setQuery(next); const matches = searchTimezones(next, options); setActive(matches.includes(selected) ? selected : matches[0] || ''); }} placeholder={t('picker.searchTimezones')} />
        <CommandList ref={resultsRef} className="wwm-tz-scroll" aria-label={t('picker.timezones')}>
          <CommandEmpty>{t('picker.noTimezones')}</CommandEmpty>
          {results.map(zone => <CommandItem key={zone} value={zone} data-analytics-label={ANALYTICS_ELEMENTS.TIMEZONE_OPTION} data-checked={zone === selected} onSelect={() => commit(zone)}><span className="wwm-tz-name">{zone.replaceAll('_', ' ')}</span><small>{timezoneOffset(zone, referenceDate)}</small>{zone === selected ? <Check aria-hidden="true" /> : <span className="wwm-tz-check" aria-hidden="true" />}</CommandItem>)}
        </CommandList>
      </Command>
    </PopoverContent>
  </Popover>;
}
