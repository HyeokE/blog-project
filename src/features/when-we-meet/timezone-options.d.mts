export function deviceTimezone(intl?: typeof Intl, locale?: string): string;
export function timezoneOptions(intl?: typeof Intl): string[];
export function isValidTimezone(value: unknown): boolean;
export function searchTimezones(query: string, options?: string[]): string[];
export function timezoneOffset(zone: string, referenceDate?: string): string;
export function revealScrollDelta(option:{top:number;height:number},viewport:{top:number;height:number},mode?:'center'|'nearest'):number;
