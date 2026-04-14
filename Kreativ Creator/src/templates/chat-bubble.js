// Template 4: Chat-samtale — UGC-stil, ser ud som en rigtig beskedtråd
export const meta = {
  id: 'chat-bubble',
  name: 'Chat-samtale',
  category: 'Scroll-stopper',
  thumbnail: 'CHAT',
  fields: [
    {
      key: 'messages',
      label: 'Beskeder',
      type: 'items',
      default: [
        { text: 'Hvad betaler du for strøm?', sender: 'left' },
        { text: 'Ingen anelse ærligt talt 😅', sender: 'right' },
        { text: 'Tjek Altid Energi. Jeg sparede 731 kr. på et år', sender: 'left' },
        { text: 'Vent, er det rigtigt??', sender: 'right' },
        { text: 'Ja, og ingen skjulte gebyrer. Skiftede på 2 min', sender: 'left' },
      ],
    },
    { key: 'cta', label: 'CTA', type: 'text', default: 'Se hvad du kan spare' },
  ],
};

export function render(data, format) {
  const isStory = format === 'story';
  const messages = data.messages || meta.fields.find(f => f.key === 'messages').default;

  const bubbles = messages.map(msg => {
    const isRight = msg.sender === 'right';
    return `
      <div style="display:flex;justify-content:${isRight ? 'flex-end' : 'flex-start'};margin-bottom:8px;">
        <div style="
          max-width:75%;
          padding:${isStory ? '14px 18px' : '12px 16px'};
          border-radius:18px;
          ${isRight
            ? 'background:#73D0E7;color:#fff;border-bottom-right-radius:4px;'
            : 'background:#fff;color:#101D2F;border-bottom-left-radius:4px;box-shadow:0 1px 4px rgba(0,0,0,0.06);'}
          font-size:${isStory ? '17px' : '15px'};
          font-weight:500;
          line-height:1.4;
        ">${msg.text}</div>
      </div>
    `;
  }).join('');

  return `
    <div class="ad format-${format}" style="background:linear-gradient(180deg, #E6EBF3 0%, #F2F5F9 100%);">
      <div class="logo"><img src="/assets/logo-color.png" alt="Altid Energi"></div>

      <!-- Chat header -->
      <div style="padding:${isStory ? '80px 28px 16px' : '70px 28px 12px'};border-bottom:1px solid rgba(16,29,47,0.06);">
        <div style="display:flex;align-items:center;gap:10px;">
          <div style="width:36px;height:36px;background:#033B8C;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;font-size:14px;font-weight:700;">AE</div>
          <div>
            <div style="font-size:14px;font-weight:700;color:#101D2F;">Altid Energi</div>
            <div style="font-size:11px;color:rgba(16,29,47,0.4);">Online nu</div>
          </div>
        </div>
      </div>

      <!-- Messages -->
      <div style="flex:1;padding:${isStory ? '20px 28px' : '16px 28px'};display:flex;flex-direction:column;justify-content:center;">
        ${bubbles}
      </div>

      <!-- CTA bottom -->
      ${data.cta ? `<div style="padding:16px 28px;text-align:center;">
        <div style="display:inline-block;background:#033B8C;color:#fff;padding:14px 32px;border-radius:99px;font-size:16px;font-weight:600;">${data.cta}</div>
      </div>` : ''}
    </div>
  `;
}
