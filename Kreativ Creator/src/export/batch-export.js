import JSZip from 'jszip';
import { exportPNGBlob } from './png-export.js';
import { getById } from '../templates/registry.js';
import { formats } from '../brand/tokens.js';

export async function batchExport(dataList, formatKeys = ['feed', 'story']) {
  const zip = new JSZip();
  const tempContainer = document.createElement('div');
  tempContainer.style.cssText = 'position:fixed;left:-9999px;top:0;';
  document.body.appendChild(tempContainer);

  const date = new Date().toISOString().slice(0, 10);
  let count = 0;

  for (const data of dataList) {
    const tpl = getById(data._templateId);
    if (!tpl) continue;

    for (const fmt of formatKeys) {
      const html = tpl.render(data, fmt);
      tempContainer.innerHTML = html;
      const adEl = tempContainer.querySelector('.ad');
      if (!adEl) continue;

      // Wait a tick for rendering
      await new Promise(r => requestAnimationFrame(r));
      await new Promise(r => setTimeout(r, 100));

      const blob = await exportPNGBlob(adEl);
      const variantLabel = data._variantLabel || 'original';
      const filename = `${tpl.meta.id}_${fmt}_${variantLabel}_${date}.png`;
      zip.file(filename, blob);
      count++;
    }
  }

  document.body.removeChild(tempContainer);

  if (count === 0) return;

  const content = await zip.generateAsync({ type: 'blob' });
  const link = document.createElement('a');
  link.download = `altid-energi-kreativer_${date}.zip`;
  link.href = URL.createObjectURL(content);
  link.click();
  URL.revokeObjectURL(link.href);

  return count;
}
