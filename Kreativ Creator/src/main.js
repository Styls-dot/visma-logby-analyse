import './style.css';
import '../src/templates/base.css';
import { initSidebar, getCurrentData } from './editor/sidebar.js';
import { renderPreview, setFormat, getFormat, getPreviewElement } from './preview/canvas.js';
import { exportPNG } from './export/png-export.js';
import { initLogos } from './brand/logo-utils.js';
import { batchExport } from './export/batch-export.js';
import { initVariantPanel, updateVariants, getAllVariants } from './variants/variant-panel.js';
import { formats } from './brand/tokens.js';

// DOM refs
const sidebar = document.getElementById('sidebar');
const preview = document.getElementById('preview-canvas');
const variantContainer = document.getElementById('variant-panel');
const formatToggle = document.getElementById('format-toggle');
const exportBtn = document.getElementById('export-btn');
const batchBtn = document.getElementById('batch-btn');
const zoomSlider = document.getElementById('zoom-slider');
const zoomLabel = document.getElementById('zoom-label');
const dimensionLabel = document.getElementById('dimension-label');

// State
let currentZoom = 100;

// Init sidebar
initSidebar(sidebar, (data) => {
  renderPreview(preview, data);
  updateVariants(data, variantContainer);
  updateDimensionLabel();
});

// Init variant panel
initVariantPanel(variantContainer, (variantData) => {
  renderPreview(preview, variantData);
});

// Format toggle
formatToggle?.addEventListener('click', () => {
  const current = getFormat();
  const next = current === 'feed' ? 'story' : 'feed';
  setFormat(next);
  formatToggle.textContent = formats[next].label;
  formatToggle.dataset.format = next;
  renderPreview(preview, getCurrentData());
  updateDimensionLabel();
  updatePreviewZoom();
});

// Export single
exportBtn?.addEventListener('click', async () => {
  const adEl = getPreviewElement(preview);
  if (!adEl) return;

  const data = getCurrentData();
  const fmt = getFormat();
  const date = new Date().toISOString().slice(0, 10);
  const filename = `${data._templateId}_${fmt}_${date}.png`;

  exportBtn.textContent = 'Eksporterer...';
  exportBtn.disabled = true;

  try {
    await exportPNG(adEl, filename);
  } catch (e) {
    console.error('Export failed:', e);
  }

  exportBtn.textContent = 'Eksport\u00e9r PNG';
  exportBtn.disabled = false;
});

// Batch export
batchBtn?.addEventListener('click', async () => {
  const variants = getAllVariants();
  if (variants.length === 0) {
    const data = getCurrentData();
    if (!data._templateId) return;
    variants.push(data);
  }

  batchBtn.textContent = 'Eksporterer...';
  batchBtn.disabled = true;

  try {
    const count = await batchExport(variants.length > 0 ? variants : [getCurrentData()]);
    batchBtn.textContent = `${count} filer eksporteret!`;
    setTimeout(() => { batchBtn.textContent = 'Batch eksport (ZIP)'; }, 2000);
  } catch (e) {
    console.error('Batch export failed:', e);
    batchBtn.textContent = 'Batch eksport (ZIP)';
  }

  batchBtn.disabled = false;
});

// Zoom
zoomSlider?.addEventListener('input', () => {
  currentZoom = parseInt(zoomSlider.value);
  zoomLabel.textContent = `${currentZoom}%`;
  updatePreviewZoom();
});

function updatePreviewZoom() {
  const fmt = getFormat();
  const { width, height } = formats[fmt];
  const scale = currentZoom / 100;
  preview.style.transform = `scale(${scale})`;
  preview.style.transformOrigin = 'top center';
  preview.style.width = `${width}px`;
  preview.style.height = `${height}px`;

  const wrapper = document.getElementById('preview-wrapper');
  if (wrapper) {
    wrapper.style.width = `${width * scale}px`;
    wrapper.style.height = `${height * scale}px`;
  }
}

function updateDimensionLabel() {
  if (!dimensionLabel) return;
  const fmt = getFormat();
  const { width, height, exportScale } = formats[fmt];
  dimensionLabel.textContent = `${width * exportScale} \u00d7 ${height * exportScale}px`;
}

// Init
initLogos(); // Pre-generate white logo for export
updateDimensionLabel();
updatePreviewZoom();
