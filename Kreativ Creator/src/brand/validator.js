import { colors, forbiddenColors } from './tokens.js';

const allowedHexSet = new Set(
  Object.values(colors).map(c => c.toUpperCase())
);

// Also allow rgba/opacity variants commonly used
const allowedPatterns = [
  /^rgba\(16,\s*29,\s*47/, // navy with opacity
  /^rgba\(255,\s*255,\s*255/, // white with opacity
  /^rgba\(160,\s*190,\s*140/, // sage-ish overlay
  /^rgba\(115,\s*208,\s*231/, // teal overlay
  /^transparent$/,
];

export function validateColors(containerEl) {
  const issues = [];
  const allEls = containerEl.querySelectorAll('*');

  for (const el of allEls) {
    const style = getComputedStyle(el);
    const propsToCheck = ['color', 'backgroundColor', 'borderColor'];

    for (const prop of propsToCheck) {
      const val = style[prop];
      if (!val || val === 'rgba(0, 0, 0, 0)' || val === 'transparent') continue;

      const hex = rgbToHex(val);
      if (hex && forbiddenColors.includes(hex.toLowerCase())) {
        issues.push({
          level: 'error',
          message: `Sort (#000) fundet i ${prop} — brug Navy #101D2F i stedet`,
        });
      }
    }
  }

  return issues;
}

export function validateFonts(containerEl) {
  const issues = [];
  const allEls = containerEl.querySelectorAll('*');

  for (const el of allEls) {
    const family = getComputedStyle(el).fontFamily;
    if (!family) continue;

    const allowed = ['DM Sans', 'ITC Avant Garde Gothic Pro', 'sans-serif'];
    const families = family.split(',').map(f => f.trim().replace(/['"]/g, ''));
    const hasAllowed = families.some(f => allowed.includes(f));

    if (!hasAllowed && el.textContent.trim()) {
      issues.push({
        level: 'warning',
        message: `Ukendt font "${families[0]}" — brug DM Sans eller ITC Avant Garde`,
      });
      break; // Only report once
    }
  }

  return issues;
}

export function validateAll(containerEl) {
  return [
    ...validateColors(containerEl),
    ...validateFonts(containerEl),
  ];
}

function rgbToHex(rgb) {
  const match = rgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (!match) return null;
  const [, r, g, b] = match;
  return '#' + [r, g, b].map(x => parseInt(x).toString(16).padStart(2, '0')).join('').toUpperCase();
}
