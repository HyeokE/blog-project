import { halfHourOptions } from './picker.mjs';

/** Canonical HH:mm wall-clock choices; an end-time lower bound is exclusive. */
export function validTimeOptions({ minTime, min, max } = {}) {
  return [...halfHourOptions(),...(minTime?['24:00']:[])].filter(time => (!minTime || time > minTime) && (!min || time >= min) && (!max || time <= max));
}

export function initialTimeFocus(options, value) {
  return options.includes(value) ? value : options[0] ?? '';
}
