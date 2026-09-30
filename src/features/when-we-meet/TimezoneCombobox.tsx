'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { isValidTimezone, revealScrollDelta, searchTimezones, timezoneOffset, timezoneOptions } from './timezone-options.mjs';
import './timezone-combobox.css';
import {ANALYTICS_ELEMENTS,ANALYTICS_SECTIONS} from '@/constants/analytics';

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
  const option = list?.querySelector<HTMLElement>('[data-active="true"]');
  const viewport = option?.closest<HTMLElement>('[data-slot="scroll-area-viewport"]');
  if (!option || !viewport || !viewport.clientHeight) {return;}
  viewport.scrollTop += revealScrollDelta(option.getBoundingClientRect(), viewport.getBoundingClientRect(), mode);
}

export function TimezoneCombobox({ value, onChange, id, required, disabled, referenceDate, error, ...aria }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const searchRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const generated = useId();
  const listId = `${id}-options-${generated}`;
  const options = useMemo(() => timezoneOptions(), []);
  const results = useMemo(() => searchTimezones(query, options), [query, options]);
  const selected = isValidTimezone(value) ? value : '';

  useEffect(() => {
    if (open) {searchRef.current?.focus();}
  }, [open]);
  // On open, wait for the popover to be positioned and sized, then center the selection.
  useEffect(() => {
    if (!open) {return;}
    let frame = requestAnimationFrame(() => { frame = requestAnimationFrame(() => revealActive(resultsRef.current, 'center')); });
    return () => cancelAnimationFrame(frame);
  }, [open]);
  useEffect(() => {
    if (open) {revealActive(resultsRef.current, 'nearest');}
  }, [active, results, open]);

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
      setActive(Math.max(0, options.indexOf(selected)));
    }
  }
  function handleKeys(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      setActive(current => Math.max(0, Math.min(results.length - 1, current + (event.key === 'ArrowDown' ? 1 : -1))));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      if (results[active]) {commit(results[active]);}
    } else if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      setOpen(false);
    }
  }

  return <Popover open={open} onOpenChange={changeOpen} modal={false}>
    <PopoverTrigger asChild>
      <Button id={id} type="button" variant="outline" data-analytics-label={ANALYTICS_ELEMENTS.TIMEZONE_PICKER} disabled={disabled} aria-required={required} aria-invalid={Boolean(error)} aria-haspopup="listbox" aria-expanded={open} aria-controls={open ? listId : undefined} {...aria} className="wwm-tz-trigger">
        <span>{selected ? `${selected.replaceAll('_', ' ')} · ${timezoneOffset(selected, referenceDate)}` : 'Choose a timezone'}</span><ChevronDown aria-hidden="true" />
      </Button>
    </PopoverTrigger>
    <PopoverContent align="start" sideOffset={4} collisionPadding={8} onOpenAutoFocus={event => { event.preventDefault(); searchRef.current?.focus(); }} className="wwm-tz-popover" onEscapeKeyDown={event => { event.preventDefault(); event.stopPropagation(); setOpen(false); }}>
      <div className="wwm-tz-search-row"><Input ref={searchRef} data-analytics-label={ANALYTICS_ELEMENTS.TIMEZONE_SEARCH} role="combobox" aria-label="Search timezones" aria-autocomplete="list" aria-expanded={open} aria-controls={listId} aria-activedescendant={results[active] ? `${listId}-${results[active].replaceAll('/', '-')}` : undefined} value={query} onChange={event => { const next = event.target.value; setQuery(next); setActive(Math.max(0, searchTimezones(next, options).indexOf(selected))); }} onKeyDown={handleKeys} placeholder="Search city or timezone" /></div>
      <ScrollArea className="wwm-tz-scroll"><div id={listId} role="listbox" aria-label="Timezones" ref={resultsRef}>
        {results.length ? results.map((zone, index) => <button key={zone} type="button" data-analytics-label={ANALYTICS_ELEMENTS.TIMEZONE_OPTION} id={`${listId}-${zone.replaceAll('/', '-')}`} role="option" aria-selected={zone === selected} data-active={index === active} className="wwm-tz-option" onMouseEnter={() => setActive(index)} onClick={() => commit(zone)}><span>{zone.replaceAll('_', ' ')}</span><small>{timezoneOffset(zone, referenceDate)}</small></button>) : <p className="wwm-tz-empty">No matching timezones.</p>}
      </div></ScrollArea>
    </PopoverContent>
  </Popover>;
}
