import { copyBanks } from '../brand/tokens.js';
import { getById } from '../templates/registry.js';

export function generateVariants(data, count = 3) {
  const templateId = data._templateId;
  const tpl = getById(templateId);
  if (!tpl) return [data];

  const textFields = tpl.meta.fields.filter(f => f.type === 'text' || f.type === 'textarea');
  const variants = [{ ...data, _variantLabel: 'A' }];

  // Pick the most impactful field to vary (headline > payoff > number)
  const headlineField = textFields.find(f =>
    f.key === 'headline' || f.key === 'payoff' || f.key === 'solution'
  ) || textFields.find(f => f.key === 'number') || textFields[0];

  if (!headlineField) return variants;

  // Get variant options from copy bank
  const options = getRelevantOptions(headlineField.key, data[headlineField.key]);

  for (let i = 0; i < Math.min(count, options.length); i++) {
    const variant = { ...data };
    variant[headlineField.key] = options[i];
    variant._variantLabel = String.fromCharCode(66 + i); // B, C, D
    variants.push(variant);
  }

  return variants;
}

function getRelevantOptions(fieldKey, currentValue) {
  // Return headlines that differ from current
  const allOptions = [
    ...copyBanks.headlines,
  ];

  return allOptions.filter(opt =>
    opt.toLowerCase() !== (currentValue || '').toLowerCase().replace(/\n/g, ' ')
  ).slice(0, 4);
}

export function generateCTAVariants(data) {
  return copyBanks.ctas.map((cta, i) => ({
    ...data,
    cta: cta,
    _variantLabel: `CTA-${String.fromCharCode(65 + i)}`,
  }));
}

export function generateEyebrowVariants(data) {
  if (!data.eyebrow) return [data];
  return copyBanks.eyebrows.map((eb, i) => ({
    ...data,
    eyebrow: eb,
    _variantLabel: `EB-${String.fromCharCode(65 + i)}`,
  }));
}
