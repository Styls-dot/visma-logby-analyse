// Generate a true all-white version of the logo at runtime
// html2canvas doesn't support CSS filters, so we pre-render a white logo

let whiteLogoUrl = null;

export async function getWhiteLogoUrl() {
  if (whiteLogoUrl) return whiteLogoUrl;

  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.src = '/assets/logo-color.png';

  await new Promise((resolve, reject) => {
    img.onload = resolve;
    img.onerror = reject;
  });

  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext('2d');

  // Draw original image
  ctx.drawImage(img, 0, 0);

  // Get pixel data and make everything white (preserve alpha)
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] > 0) {
      data[i] = 255;     // R
      data[i + 1] = 255; // G
      data[i + 2] = 255; // B
      // Keep alpha as-is
    }
  }
  ctx.putImageData(imageData, 0, 0);

  whiteLogoUrl = canvas.toDataURL('image/png');
  return whiteLogoUrl;
}

// Pre-generate on load
export function initLogos() {
  getWhiteLogoUrl().catch(() => {});
}
