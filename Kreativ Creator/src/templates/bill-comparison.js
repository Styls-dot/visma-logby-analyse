// Template 1: Regnings-sammenligning — Before/After split med visuel energimåler
export const meta = {
  id: 'bill-comparison',
  name: 'Regnings-sammenligning',
  category: 'Konvertering',
  thumbnail: 'VS',
  fields: [
    { key: 'beforeLabel', label: 'Før-label', type: 'text', default: 'Dit nuværende elselskab' },
    { key: 'beforeAmount', label: 'Før-beløb', type: 'text', default: '347 kr.' },
    { key: 'afterLabel', label: 'Efter-label', type: 'text', default: 'Altid Energi' },
    { key: 'afterAmount', label: 'Efter-beløb', type: 'text', default: '286 kr.' },
    { key: 'savingsText', label: 'Besparelse', type: 'text', default: 'Spar 731 kr./år' },
    { key: 'footnote', label: 'Fodnote', type: 'text', default: 'Baseret på gennemsnitligt forbrug · 4.000 kWh/år' },
    { key: 'cta', label: 'CTA', type: 'text', default: 'Tjek din elregning' },
  ],
};

export function render(data, format) {
  const isStory = format === 'story';

  return `
    <div class="ad format-${format}" style="background:#F3F1EC;">
      <div class="logo"><img src="/assets/logo-color.png" alt="Altid Energi"></div>

      <div style="flex:1;display:flex;flex-direction:column;padding:${isStory ? '90px 36px 36px' : '70px 36px 28px'};">
        <!-- Before side -->
        <div style="flex:1;display:flex;flex-direction:column;justify-content:center;gap:${isStory ? '32px' : '20px'};">
          <!-- Before -->
          <div style="background:#fff;border-radius:16px;padding:${isStory ? '28px 24px' : '20px 24px'};position:relative;border-left:4px solid rgba(16,29,47,0.15);">
            <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:1.5px;color:rgba(16,29,47,0.35);margin-bottom:4px;">${data.beforeLabel}</div>
            <div style="font-size:${isStory ? '44px' : '36px'};font-weight:900;color:rgba(16,29,47,0.3);">${data.beforeAmount}</div>
            <div style="position:absolute;top:50%;right:20px;transform:translateY(-50%);font-size:20px;color:rgba(16,29,47,0.15);">/ md.</div>
          </div>

          <!-- Divider with arrow -->
          <div style="display:flex;align-items:center;gap:12px;padding:0 8px;">
            <div style="flex:1;height:2px;background:linear-gradient(to right, rgba(16,29,47,0.06), #73D0E7);border-radius:1px;"></div>
            <div style="width:36px;height:36px;background:#73D0E7;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;font-size:18px;font-weight:700;">↓</div>
            <div style="flex:1;height:2px;background:linear-gradient(to left, rgba(16,29,47,0.06), #73D0E7);border-radius:1px;"></div>
          </div>

          <!-- After -->
          <div style="background:#101D2F;border-radius:16px;padding:${isStory ? '28px 24px' : '20px 24px'};position:relative;border-left:4px solid #73D0E7;">
            <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:1.5px;color:rgba(255,255,255,0.4);margin-bottom:4px;">${data.afterLabel}</div>
            <div style="font-size:${isStory ? '44px' : '36px'};font-weight:900;color:#fff;">${data.afterAmount}</div>
            <div style="position:absolute;top:50%;right:20px;transform:translateY(-50%);font-size:20px;color:rgba(255,255,255,0.25);">/ md.</div>
          </div>
        </div>

        <!-- Savings badge -->
        <div style="margin-top:${isStory ? '32px' : '20px'};text-align:center;">
          <div style="display:inline-block;background:#FFD15C;color:#101D2F;padding:12px 28px;border-radius:99px;font-size:${isStory ? '20px' : '18px'};font-weight:800;">${data.savingsText}</div>
        </div>

        <!-- Footnote -->
        <div style="text-align:center;font-size:11px;color:rgba(16,29,47,0.3);margin-top:8px;">${data.footnote}</div>

        ${data.cta ? `<div style="margin-top:${isStory ? '24px' : '16px'};text-align:center;">
          <div style="display:inline-block;background:#73D0E7;color:#fff;padding:14px 32px;border-radius:99px;font-size:16px;font-weight:600;">${data.cta}</div>
        </div>` : ''}
      </div>
    </div>
  `;
}
