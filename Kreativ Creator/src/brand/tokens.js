// Altid Energi Brand Tokens — single source of truth

export const colors = {
  blue: '#033B8C',
  teal: '#73D0E7',
  yellow: '#FFD15C',
  navy: '#101D2F',
  white: '#FFFFFF',

  // Tints
  'yellow-75': '#FFE8AD',
  'yellow-50': '#FFF1CE',
  'yellow-25': '#FFF6DE',
  'teal-75': '#B9E7F3',
  'teal-50': '#D5F1F8',
  'teal-25': '#E3F6FA',
  'blue-75': '#CDD8E8',
  'blue-50': '#E6EBF3',
  'blue-25': '#F2F5F9',

  // Background palette
  sage: '#C8D5BE',
  offwhite: '#F3F1EC',
  'teal-light': '#D3E5E8',
};

export const backgrounds = [
  { id: 'sage', label: 'Sage', hex: '#C8D5BE', textColor: 'navy' },
  { id: 'navy', label: 'Navy', hex: '#101D2F', textColor: 'white' },
  { id: 'offwhite', label: 'Offwhite', hex: '#F3F1EC', textColor: 'navy' },
  { id: 'teal-light', label: 'Teal Light', hex: '#D3E5E8', textColor: 'navy' },
  { id: 'white', label: 'Hvid', hex: '#FFFFFF', textColor: 'navy' },
  { id: 'blue', label: 'Blue', hex: '#033B8C', textColor: 'white' },
];

export const forbiddenColors = ['#000000', '#000', 'black'];

export const fonts = {
  headline: "'ITC Avant Garde Gothic Pro', 'DM Sans', sans-serif",
  body: "'DM Sans', sans-serif",
};

export const logo = {
  colorSrc: '/assets/logo-color.png',
  whiteSrc: '/assets/logo-white.png',
  position: 'top-right',
  inset: 28,
  height: 48,
};

export const cta = {
  background: '#73D0E7',
  color: '#FFFFFF',
  borderRadius: '99px',
  fontWeight: 600,
};

// Godkendte Taenk-formuleringer
export const approvedTaenkPhrases = [
  'Testet til tops af Danmarks største forbrugerorganisation.',
  'Topplacering i Danmarks største forbrugertest af elselskaber.',
  'Altid Energi har fået topplacering i anerkendt test af danske elselskaber.',
  'Altid Energi kvalitetsstemplet: Et af de bedste elselskaber i Danmark.',
  'Altid Energi opnår topplacering i stor forbrugertest af alle elselskaber i Danmark.',
];

// Copy banks til A/B varianter
export const copyBanks = {
  headlines: [
    '#1 i klar kommunikation',
    'Top 3 i fire ud af fem kategorier',
    'Stærk placering. For 2. år i træk.',
    'Blandt de mest anbefalede elselskaber i Danmark.',
    'Danmarks eneste gebyrfri elselskab.',
    'Vi har intet at skjule.',
    '0 kr. i skjulte gebyrer.',
    'Strøm til indkøbspris.',
  ],
  ctas: [
    'Skift på 2 min.',
    'Tjek din elregning',
    'Se din besparelse',
    'Bliv kunde på 2 min.',
    'Beregn din pris',
  ],
  eyebrows: [
    'Uafhængig forbrugertest 2026',
    'Danmarks største forbrugerråd 2026',
    'Kundetilfredshed 2026',
    'Forbrugertest 2026',
  ],
  sources: [
    '52 elselskaber testet · 4.978 forbrugere',
    'Kåret af 4.978 forbrugere blandt 52 elselskaber',
    'Baseret på 4.978 forbrugeres vurdering',
    'Danmarks største forbrugertest 2026',
  ],
};

export const formats = {
  feed: { width: 540, height: 540, label: 'Feed 1080×1080', exportScale: 2 },
  story: { width: 540, height: 960, label: 'Story 1080×1920', exportScale: 2 },
};
