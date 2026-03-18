/* SLS — Utility functions */

/**
 * Debounce a function call.
 * @param {Function} fn
 * @param {number} ms - delay in milliseconds
 * @returns {Function}
 */
function debounce(fn, ms) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), ms);
  };
}

/**
 * Truncate text to a max length, appending "..." if needed.
 */
function truncate(text, maxLen) {
  if (!text || text.length <= maxLen) return text;
  return text.slice(0, maxLen).trimEnd() + '...';
}

/**
 * Format author list for display. Shows up to `max` authors, then "+ N more".
 */
function formatAuthors(authors, max = 5) {
  if (!authors || authors.length === 0) return '';
  const names = authors.map((a) => a.name);
  if (names.length <= max) return names.join(', ');
  return names.slice(0, max).join(', ') + ` + ${names.length - max} more`;
}

/**
 * Escape HTML to prevent XSS.
 */
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/**
 * Venue display names (short labels used in chips).
 */
const VENUE_NAMES = {
  CCS: 'CCS',
  NDSS: 'NDSS',
  USENIX: 'USENIX Security',
  SP: 'IEEE S&P',
  CRYPTO: 'CRYPTO',
  EUROCRYPT: 'EUROCRYPT',
};

/**
 * All venue keys.
 */
const ALL_VENUES = ['CCS', 'NDSS', 'USENIX', 'SP', 'CRYPTO', 'EUROCRYPT'];
