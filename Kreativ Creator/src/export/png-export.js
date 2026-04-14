import html2canvas from 'html2canvas';
import { getWhiteLogoUrl } from '../brand/logo-utils.js';

async function prepareForExport(adElement) {
  // Wait for fonts
  await document.fonts.ready;

  // Wait for all images to load
  const images = adElement.querySelectorAll('img');
  await Promise.all([...images].map(img =>
    img.complete ? Promise.resolve() : new Promise(resolve => {
      img.onload = resolve;
      img.onerror = resolve;
    })
  ));

  // Swap white logo src: replace /assets/logo-white.png with true white data URL
  // (html2canvas doesn't support CSS filters, and the "white" logo file has teal text)
  const whiteDataUrl = await getWhiteLogoUrl();
  const swapped = [];

  for (const img of images) {
    const src = img.getAttribute('src') || '';
    if (src.includes('logo-white') || src.includes('logo-alt')) {
      swapped.push({ img, originalSrc: src });
      img.src = whiteDataUrl;
    }
  }

  // Wait for swapped images to load
  await Promise.all(swapped.map(({ img }) =>
    img.complete ? Promise.resolve() : new Promise(resolve => {
      img.onload = resolve;
      img.onerror = resolve;
    })
  ));

  return swapped;
}

function restoreAfterExport(swapped) {
  for (const { img, originalSrc } of swapped) {
    img.src = originalSrc;
  }
}

async function renderToCanvas(adElement) {
  return html2canvas(adElement, {
    scale: 2,
    useCORS: true,
    backgroundColor: null,
    logging: false,
    width: adElement.offsetWidth,
    height: adElement.offsetHeight,
  });
}

export async function exportPNG(adElement, filename = 'kreativ.png') {
  const swapped = await prepareForExport(adElement);

  try {
    const canvas = await renderToCanvas(adElement);

    const link = document.createElement('a');
    link.download = filename;
    link.href = canvas.toDataURL('image/png');
    link.click();

    return canvas;
  } finally {
    restoreAfterExport(swapped);
  }
}

export async function exportPNGBlob(adElement) {
  const swapped = await prepareForExport(adElement);

  try {
    const canvas = await renderToCanvas(adElement);
    return new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
  } finally {
    restoreAfterExport(swapped);
  }
}
