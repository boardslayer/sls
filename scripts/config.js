// Venue configuration for SLS (Security Literature Search)
// To add a new conference, add an entry here and update index.html filter chips

export const VENUES = [
  {
    key: 'CCS',
    name: 'CCS',
    fullName: 'ACM Conference on Computer and Communications Security',
    color: '#22c55e',
    dblpQuery: 'venue:CCS:',
  },
  {
    key: 'NDSS',
    name: 'NDSS',
    fullName: 'Network and Distributed System Security Symposium',
    color: '#3b82f6',
    dblpQuery: 'venue:NDSS:',
  },
  {
    key: 'USENIX',
    name: 'USENIX Security',
    fullName: 'USENIX Security Symposium',
    color: '#ef4444',
    dblpQuery: 'venue:USENIX Security:',
  },
  {
    key: 'SP',
    name: 'IEEE S&P',
    fullName: 'IEEE Symposium on Security and Privacy',
    color: '#a855f7',
    dblpQuery: 'venue:SP:',
  },
  {
    key: 'CRYPTO',
    name: 'CRYPTO',
    fullName: 'Annual International Cryptology Conference',
    color: '#f59e0b',
    dblpQuery: 'venue:CRYPTO:',
  },
  {
    key: 'EUROCRYPT',
    name: 'EUROCRYPT',
    fullName: 'International Conference on the Theory and Application of Cryptographic Techniques',
    color: '#06b6d4',
    dblpQuery: 'venue:EUROCRYPT:',
  },
];

// DBLP API settings
export const DBLP_API_BASE = 'https://dblp.org/search/publ/api';
export const DBLP_HITS_PER_PAGE = 1000;
export const DBLP_DELAY_MS = 1500; // Delay between API requests to be polite

// Semantic Scholar API settings
export const S2_API_BASE = 'https://api.semanticscholar.org/graph/v1/paper';
export const S2_FIELDS = 'abstract,citationCount,tldr,openAccessPdf';
export const S2_RATE_LIMIT = 5; // requests per second
export const S2_CACHE_DIR = 'data/s2-cache';
