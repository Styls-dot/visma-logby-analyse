import { getById } from '../templates/registry.js';
import { generateVariants } from './ab-generator.js';

let selectedVariantIndex = 0;
let currentVariants = [];
let onSelect = () => {};

export function initVariantPanel(container, onSelectCallback) {
  onSelect = onSelectCallback;
  return container;
}

export function updateVariants(data, container) {
  currentVariants = generateVariants(data, 3);
  selectedVariantIndex = 0;
  renderPanel(container);
}

export function getSelectedVariant() {
  return currentVariants[selectedVariantIndex] || null;
}

export function getAllVariants() {
  return currentVariants;
}

function renderPanel(container) {
  if (currentVariants.length <= 1) {
    container.innerHTML = '';
    return;
  }

  container.innerHTML = `
    <div class="variant-strip">
      <div class="variant-strip-header">
        <span class="variant-strip-title">A/B Varianter</span>
        <span class="variant-strip-count">${currentVariants.length} varianter</span>
      </div>
      <div class="variant-thumbs">
        ${currentVariants.map((v, i) => {
          const tpl = getById(v._templateId);
          if (!tpl) return '';
          return `
            <button class="variant-thumb ${i === selectedVariantIndex ? 'active' : ''}" data-index="${i}">
              <div class="variant-mini-preview">${tpl.render(v, 'feed')}</div>
              <span class="variant-label">${v._variantLabel}</span>
            </button>
          `;
        }).join('')}
      </div>
    </div>
  `;

  container.querySelectorAll('.variant-thumb').forEach(btn => {
    btn.addEventListener('click', () => {
      selectedVariantIndex = parseInt(btn.dataset.index);
      container.querySelectorAll('.variant-thumb').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      onSelect(currentVariants[selectedVariantIndex]);
    });
  });
}
