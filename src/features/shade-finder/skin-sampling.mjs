const toHex = rgb => `#${rgb.map(value => value.toString(16).padStart(2, '0')).join('')}`;
const toLinear = channel => {
  const value = channel / 255;
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
};
const fromLinear = value => Math.round(255 * (value <= 0.0031308 ? value * 12.92 : 1.055 * value ** (1 / 2.4) - 0.055));
const validRgb = rgb => Array.isArray(rgb) && rgb.length === 3 && Array.from(rgb).every(channel => Number.isInteger(channel) && channel >= 0 && channel <= 255);

export function averageSkinColors(colors) {
  if (!Array.isArray(colors) || colors.length !== 3 || !Array.from(colors).every(validRgb)) {
    throw new RangeError('Exactly three valid RGB colours are required');
  }
  const rgb = [0, 1, 2].map(index => fromLinear(colors.reduce((sum, color) => sum + toLinear(color[index]), 0) / 3));
  return { hex: toHex(rgb), rgb };
}

export function sampleSkinPatch({ data, width, height }, x, y, radius = 8) {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1 ||
    !data || data.length !== width * height * 4 ||
    !Number.isFinite(x) || !Number.isFinite(y) || !Number.isInteger(radius) || radius < 0 || radius > 100) {
    throw new RangeError('Invalid image or sampling coordinates');
  }
  const centerX = Math.min(width - 1, Math.max(0, Math.round(x)));
  const centerY = Math.min(height - 1, Math.max(0, Math.round(y)));
  const channels = [[], [], []];
  let area = 0;
  let clippedSamples = 0;
  for (let row = Math.max(0, centerY - radius); row <= Math.min(height - 1, centerY + radius); row++) {
    for (let col = Math.max(0, centerX - radius); col <= Math.min(width - 1, centerX + radius); col++) {
      area++;
      const offset = (row * width + col) * 4;
      if (data[offset + 3] < 250) continue;
      if (data[offset] >= 250 || data[offset + 1] >= 250 || data[offset + 2] >= 250) clippedSamples++;
      channels.forEach((channel, index) => channel.push(data[offset + index]));
    }
  }
  if (channels[0].length < Math.ceil(area / 2)) return null;
  const rgb = channels.map(channel => {
    channel.sort((a, b) => a - b);
    const middle = Math.floor(channel.length / 2);
    return channel.length % 2 ? channel[middle] : Math.round((channel[middle - 1] + channel[middle]) / 2);
  });
  return { hex: toHex(rgb), rgb, sampleCount: channels[0].length, clippedFraction: clippedSamples / channels[0].length };
}


export function createWhiteBalance(reference) {
  if (!reference || !validRgb(reference.rgb) || reference.hex !== toHex(reference.rgb) ||
    !Number.isSafeInteger(reference.sampleCount) || reference.sampleCount < 1 ||
    !Number.isFinite(reference.clippedFraction) || reference.clippedFraction < 0 || reference.clippedFraction > 1) {
    throw new RangeError('Invalid white reference');
  }
  // Heuristic quality gates reject unreliable reference patches, not exposure or skin-tone measurements.
  if (reference.clippedFraction >= 0.05) return { ok: false, reason: 'clipped' };
  const linear = reference.rgb.map(toLinear);
  const luminance = 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
  if (luminance < 0.08) return { ok: false, reason: 'dark' };
  // Neutralize the reference at its measured luminance; do not force paper to pure white.
  const gains = linear.map(channel => luminance / channel);
  if (gains.some(gain => !Number.isFinite(gain) || gain < 0.5 || gain > 2)) return { ok: false, reason: 'cast' };
  return { ok: true, gains };
}

export function applyWhiteBalance(rgb, balance) {
  if (!validRgb(rgb) || balance?.ok !== true || !Array.isArray(balance.gains) || balance.gains.length !== 3 ||
    balance.gains.some(gain => !Number.isFinite(gain) || gain < 0.5 || gain > 2)) {
    throw new RangeError('Invalid colour or white balance');
  }
  const corrected = rgb.map((channel, index) => toLinear(channel) * balance.gains[index]);
  const clipped = corrected.some(channel => channel < 0 || channel > 1);
  const balancedRgb = corrected.map(channel => fromLinear(Math.min(1, Math.max(0, channel))));
  return { hex: toHex(balancedRgb), rgb: balancedRgb, clipped };
}
