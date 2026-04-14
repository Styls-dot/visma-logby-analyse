import { approvedTaenkPhrases } from './tokens.js';

const forbiddenPattern = /Forbrugerr\u00e5det\s+T\u00e6nk/gi;
const okPatterns = [
  /forbrugerorganisation/i,
  /forbrugerr\u00e5d(?!\s+T\u00e6nk)/i, // "forbrugerråd" without "Tænk" after
  /forbrugertest/i,
];

export function checkTaenkRules(text) {
  const issues = [];

  if (forbiddenPattern.test(text)) {
    issues.push({
      level: 'error',
      message: '"Forbrugerr\u00e5det T\u00e6nk" m\u00e5 ikke bruges direkte i egne reklamer. Brug i stedet:',
      suggestions: approvedTaenkPhrases,
    });
  }

  return issues;
}

export function checkAllFields(fieldsData) {
  const issues = [];
  for (const [key, value] of Object.entries(fieldsData)) {
    if (typeof value === 'string') {
      const fieldIssues = checkTaenkRules(value);
      for (const issue of fieldIssues) {
        issues.push({ ...issue, field: key });
      }
    }
  }
  return issues;
}
