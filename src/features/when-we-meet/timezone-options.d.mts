export function deviceTimezone(intl?: typeof Intl): string;
export function timezoneOptions(intl?: typeof Intl): string[];
export function isValidTimezone(value: unknown): boolean;
export function searchTimezones(query: string, options?: string[]): string[];
export function timezoneOffset(zone: string, referenceDate?: string): string;
