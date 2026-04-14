import * as centeredStatement from './centered-statement.js';
import * as scoreboard from './scoreboard.js';
import * as strikethrough from './strikethrough.js';
import * as splitLayout from './split-layout.js';
import * as problemSolution from './problem-solution.js';
import * as photoOverlay from './photo-overlay.js';
import * as founderQuote from './founder-quote.js';
import * as savingsScroller from './savings-scroller.js';
import * as consistency from './consistency.js';
// New templates
import * as billComparison from './bill-comparison.js';
import * as questionHook from './question-hook.js';
import * as testimonialCard from './testimonial-card.js';
import * as chatBubble from './chat-bubble.js';
import * as dataVisual from './data-visual.js';
import * as factCard from './fact-card.js';
import * as newsHeadline from './news-headline.js';
import * as gradientBold from './gradient-bold.js';
import * as checklist from './checklist.js';
import * as socialProofCounter from './social-proof-counter.js';

const templates = [
  centeredStatement,
  scoreboard,
  strikethrough,
  splitLayout,
  problemSolution,
  photoOverlay,
  founderQuote,
  savingsScroller,
  consistency,
  // New templates
  billComparison,
  questionHook,
  testimonialCard,
  chatBubble,
  dataVisual,
  factCard,
  newsHeadline,
  gradientBold,
  checklist,
  socialProofCounter,
];

export function getAll() {
  return templates.map(t => t.meta);
}

export function getById(id) {
  return templates.find(t => t.meta.id === id);
}

export function getByCategory(cat) {
  return templates.filter(t => t.meta.category === cat);
}

export function getCategories() {
  return [...new Set(templates.map(t => t.meta.category))];
}
