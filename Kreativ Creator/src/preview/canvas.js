import { getById } from '../templates/registry.js';
import { validateAll } from '../brand/validator.js';
import { getWhiteLogoUrl } from '../brand/logo-utils.js';

let currentFormat = 'feed';

export function setFormat(format) {
  currentFormat = format;
}

export function getFormat() {
  return currentFormat;
}

export function renderPreview(container, data) {
  const templateId = data._templateId;
  if (!templateId) {
    container.innerHTML = '<div class="preview-empty">V\u00e6lg en template til venstre</div>';
    return;
  }

  const tpl = getById(templateId);
  if (!tpl) return;

  const html = tpl.render(data, currentFormat);
  container.innerHTML = html;

  // Swap white logos to true white version for consistent preview
  swapWhiteLogos(container);

  // Run brand validation after render
  requestAnimationFrame(() => {
    const adEl = container.querySelector('.ad');
    if (adEl) {
      const issues = validateAll(adEl);
      renderValidation(issues);
    }
  });
}

async function swapWhiteLogos(container) {
  try {
    const whiteUrl = await getWhiteLogoUrl();
    const imgs = container.querySelectorAll('img');
    for (const img of imgs) {
      const src = img.getAttribute('src') || '';
      if (src.includes('logo-white') || src.includes('logo-alt')) {
        img.src = whiteUrl;
      }
    }
  } catch (e) {
    // Fallback: do nothing, white+teal logo still looks acceptable
  }
}

function renderValidation(issues) {
  const panel = document.getElementById('brand-validation');
  if (!panel) return;

  if (issues.length === 0) {
    panel.innerHTML = '<div class="validation-ok">Brand-tjek OK</div>';
    return;
  }

  panel.innerHTML = issues.map(issue => `
    <div class="validation-item validation-${issue.level}">
      <span class="validation-icon">${issue.level === 'error' ? '!' : 'i'}</span>
      <span>${issue.message}</span>
    </div>
  `).join('');
}

export function getPreviewElement(container) {
  return container.querySelector('.ad');
}
