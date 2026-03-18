# SLS: Security Literature Search

> Search across 15,000+ papers from top security & cryptography conferences.

---

_The application has been developed with almost 100% AI (Claude Opus) code and was inspired by [3gpp.guru](3gpp.guru)._

---

SLS is a fast, fully static search engine for academic papers published at the world's top-tier security and cryptography venues. All data is pre-fetched from [DBLP](https://dblp.org) and optionally enriched with abstracts from [Semantic Scholar](https://www.semanticscholar.org). Search happens entirely client-side — no server, no API calls at query time.

**Repository**: [github.com/boardslayer/SLS](https://github.com/boardslayer/SLS)

---

## Conferences Indexed

| Venue | Full Name | Papers | Years |
|-------|-----------|--------|-------|
| **CCS** | ACM Conference on Computer and Communications Security | ~3,984 | 1993–2025 |
| **NDSS** | Network and Distributed System Security Symposium | ~1,564 | 1994–2025 |
| **USENIX Security** | USENIX Security Symposium | ~3,505 | 1992–2025 |
| **IEEE S&P** | IEEE Symposium on Security and Privacy | ~1,417 | 1981–2025 |
| **CRYPTO** | Annual International Cryptology Conference | ~2,527 | 1981–2025 |
| **EUROCRYPT** | Int'l Conf. on Theory & Application of Cryptographic Techniques | ~2,207 | 1982–2025 |

Workshop papers co-located with these conferences (e.g., WPES, CCSW) are included and tagged separately so you can filter them in or out.

---

## Features

- **Instant full-text search** across 15,000+ paper titles, authors, and abstracts (when enriched)
- **Venue filter chips** — click to include/exclude specific conferences
- **Year range filter** — narrow results to a specific time period
- **Workshop toggle** — show or hide co-located workshop papers
- **Sort options** — relevance, newest first, oldest first, most cited
- **Shareable URLs** — search state is encoded in URL parameters
- **Dark mode** — automatic (follows system preference) + manual toggle
- **Responsive** — works on desktop and mobile
- **Zero dependencies at runtime** — vanilla HTML/CSS/JS, no framework
- **Lazy-loaded results** — IntersectionObserver-based infinite scroll for smooth performance

---

## Architecture

```
SLS/
├── scripts/                    # Data pipeline (Node.js, runs at build time)
│   ├── config.js               # Venue definitions, API settings
│   ├── fetch-dblp.js           # Fetch papers from DBLP API
│   ├── enrich-abstracts.js     # Enrich with Semantic Scholar abstracts
│   └── build-index.js          # Build MiniSearch index + output files
├── data/                       # Generated data files
│   ├── papers.json             # Full paper dataset (committed)
│   ├── search-index.json       # Serialized MiniSearch index (committed)
│   └── stats.json              # Aggregate statistics (committed)
├── index.html                  # Single-page application
├── css/
│   └── style.css               # All styles (custom properties, responsive)
├── js/
│   ├── minisearch.min.js       # MiniSearch library (local copy)
│   ├── utils.js                # Helpers (debounce, escapeHtml, formatAuthors)
│   ├── filters.js              # Filter state management + URL sync
│   ├── search.js               # MiniSearch wrapper (search, suggest, browse)
│   └── app.js                  # Main app logic, rendering, event binding
├── assets/
│   └── favicon.svg
├── .github/
│   └── workflows/
│       └── deploy.yml          # GitHub Actions: build + deploy to Pages
└── package.json                # Node.js scripts for the data pipeline
```

### How it works

1. **Build time**: Node.js scripts fetch all paper metadata from the DBLP API, optionally enrich papers with abstracts from Semantic Scholar, and build a serialized [MiniSearch](https://lucaong.github.io/minisearch/) full-text index.

2. **Runtime**: The browser loads the pre-built search index (~5 MB) and paper data (~8 MB). All searching, filtering, and sorting happens client-side in the browser. No network requests are made after the initial page load.

3. **Deployment**: The site is fully static — just HTML, CSS, JS, and JSON files. It deploys to GitHub Pages via a GitHub Actions workflow that rebuilds the data weekly.

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 18+ (tested with 22)
- npm (comes with Node.js)

### Install

```bash
git clone https://github.com/boardslayer/SLS.git
cd SLS
npm install
```

### Build the data

```bash
# Full pipeline: fetch DBLP + enrich with Semantic Scholar + build index
npm run build-data

# Quick build (DBLP only, no abstracts — much faster)
npm run build-data-quick
```

The DBLP fetch takes ~2 minutes (paginating through ~15K papers across 6 venues).
The Semantic Scholar enrichment takes ~1 hour (rate-limited to 5 requests/second).

### Run locally

```bash
npx serve . -l 8000
# Open http://localhost:8000
```

Or use Python:

```bash
python3 -m http.server 8000
```

---

## Data Pipeline

### `npm run fetch-dblp`

Fetches all papers from the [DBLP API](https://dblp.org/faq/How+to+use+the+dblp+search+API.html) for each configured venue. For each venue, paginates through results (1,000 per request), normalizes the data, and tags workshop papers.

**Output**: `data/raw-dblp.json`

**What it does**:
- Paginates the DBLP search API with `h=1000&f=offset`
- Normalizes the author field (DBLP returns an object for single authors, an array for multiple)
- Decodes HTML entities in titles and author names (`&apos;` → `'`, etc.)
- Tags workshop papers based on DBLP key paths and venue markers
- Strips trailing periods that DBLP appends to titles
- Removes disambiguation numbers from author names (e.g., "Ji Guan 0001" → "Ji Guan")

### `npm run enrich`

Enriches papers with data from the [Semantic Scholar Academic Graph API](https://api.semanticscholar.org/api-docs/):
- **Abstract**: full paper abstract
- **Citation count**: total citations
- **TLDR**: AI-generated one-sentence summary
- **PDF URL**: open access PDF link (when available)

**Output**: `data/enriched.json`

**Caching**: Responses are cached in `data/s2-cache/` (one file per DOI). Re-runs skip already-fetched papers. Cache misses (papers not in Semantic Scholar) are also cached to avoid re-fetching.

**Rate limiting**: 5 requests/second with exponential backoff on HTTP 429.

### `npm run build-index`

Builds the MiniSearch full-text search index and final data files.

**Outputs**:
- `data/papers.json` — full paper dataset for the frontend
- `data/search-index.json` — serialized MiniSearch index (deserialized instantly in the browser)
- `data/stats.json` — aggregate statistics (total papers, per-venue counts, year range)

**Search configuration**:
- Indexed fields: `title`, `abstract`, `authorNames`
- Boost weights: title 2×, abstract 1×, authorNames 0.5×
- Fuzzy matching: 0.2 edit distance
- Prefix search: enabled

---

## Adding a New Conference

Adding a new venue takes 3 steps:

### 1. Find the DBLP venue query

Go to [dblp.org](https://dblp.org) and search for the conference. The venue query is the short name used in DBLP's faceted search. You can test it with:

```
https://dblp.org/search/publ/api?q=venue:ASIACRYPT:&format=json&h=0
```

Check the `@total` field in the response to see how many papers exist.

### 2. Add the venue to `scripts/config.js`

```js
export const VENUES = [
  // ... existing venues ...
  {
    key: 'ASIACRYPT',           // Unique key (used in filters, URL params, CSS)
    name: 'ASIACRYPT',          // Display name on venue chip
    fullName: 'International Conference on the Theory and Application of Cryptology and Information Security',
    color: '#ec4899',           // Hex color for the venue badge/chip
    dblpQuery: 'venue:ASIACRYPT:',  // DBLP search query
  },
];
```

### 3. Add the venue chip to `index.html`

In the `#venueChips` div, add:

```html
<button class="venue-chip active" data-venue="ASIACRYPT" style="--chip-color: #ec4899">ASIACRYPT</button>
```

### 4. Add the CSS color variable to `css/style.css`

In the `:root` block:

```css
--color-ASIACRYPT: #ec4899;
```

### 5. Update `js/utils.js`

Add the venue to the lookup objects:

```js
const VENUE_NAMES = {
  // ... existing ...
  ASIACRYPT: 'ASIACRYPT',
};

const ALL_VENUES = ['CCS', 'NDSS', 'USENIX', 'SP', 'CRYPTO', 'EUROCRYPT', 'ASIACRYPT'];
```

### 6. Rebuild

```bash
npm run build-data-quick   # or npm run build-data for full enrichment
```

Commit and push — the CI will rebuild and deploy automatically.

---

## Deployment

### GitHub Pages (recommended)

1. Push this repo to GitHub
2. Go to **Settings → Pages → Source** and select **GitHub Actions**
3. The included workflow (`.github/workflows/deploy.yml`) will:
   - Run on every push to `main`
   - Run weekly (Monday 3:17 AM UTC) to refresh data
   - Be manually triggerable from the Actions tab

### Custom domain

Add a `CNAME` file to the repo root with your domain:

```
securestar.yourdomain.com
```

Then configure DNS as described in the [GitHub Pages custom domain docs](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site).

### Other static hosts

Since SLS is fully static, it works on any static host:

- **Netlify**: drag and drop the repo root, or connect via Git
- **Vercel**: import the repo, no build command needed
- **Cloudflare Pages**: connect repo, publish directory = `/`
- **Any web server**: just serve the files (`index.html`, `css/`, `js/`, `data/`, `assets/`)

---

## Refreshing Data

Papers are added to DBLP when conferences happen (typically once per year per venue). The GitHub Actions cron job refreshes data weekly, which is more than enough.

### Automatic (CI)

The GitHub Actions workflow runs every Monday at 3:17 AM UTC. It fetches the latest papers from DBLP and rebuilds the search index.

### Manual (CI)

Go to the **Actions** tab → **Build & Deploy** workflow → **Run workflow**.

### Manual (local)

```bash
npm run build-data-quick   # Fetch DBLP + build index (~2 min)
npm run build-data         # Full pipeline with Semantic Scholar (~1 hour)
```

Then commit and push the updated `data/` files.

---

## Data Sources & Licensing

- **Paper metadata** (titles, authors, year, venue, DOI): [DBLP](https://dblp.org) — released under [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) (public domain)
- **Abstracts, citation counts, TLDRs**: [Semantic Scholar Academic Graph API](https://www.semanticscholar.org/product/api) — subject to Semantic Scholar's [terms of service](https://www.semanticscholar.org/product/api/license)
- **MiniSearch**: [MIT License](https://github.com/lucaong/minisearch/blob/main/LICENSE)

---

## npm Scripts Reference

| Script | Command | Description |
|--------|---------|-------------|
| `fetch-dblp` | `node scripts/fetch-dblp.js` | Fetch all papers from DBLP API |
| `enrich` | `node scripts/enrich-abstracts.js` | Enrich papers with Semantic Scholar data |
| `build-index` | `node scripts/build-index.js` | Build MiniSearch index + output files |
| `build-data` | fetch + enrich + build | Full pipeline |
| `build-data-quick` | fetch + build (no enrich) | Fast pipeline without abstracts |
| `serve` | `npx serve . -l 8000` | Start local dev server |

---

## Troubleshooting

### "Failed to load data" error in browser

The data files haven't been built yet. Run:

```bash
npm run build-data-quick
```

### Semantic Scholar enrichment is slow

It's rate-limited to 5 requests/second to stay within API limits. For ~15K papers, this takes about an hour. Use `build-data-quick` for development and run full enrichment before deploying.

### DBLP API returns errors

DBLP occasionally rate-limits aggressive requests. The fetch script includes a 1.5-second delay between pages and retries on failure. If issues persist, increase `DBLP_DELAY_MS` in `scripts/config.js`.

### Search results seem incomplete

MiniSearch uses fuzzy matching with 0.2 edit distance. For very short queries (1-2 characters), results may be limited. Try more specific terms. If you've added abstracts via enrichment, search quality improves significantly since it matches against both titles and abstract text.

---

## Future Enhancements

- [ ] Author pages — click an author to see all their papers across venues
- [ ] BibTeX export — one-click download for citation managers
- [ ] Paper PDF links — direct links to open-access PDFs (Semantic Scholar `openAccessPdf`)
- [ ] Topic tags — filter by field of study using Semantic Scholar `fieldsOfStudy`
- [ ] Conference timeline — visual chart of papers per venue per year
- [ ] Zotero integration — meta tags compatible with the Zotero Connector
- [ ] Citation graph — explore paper connections using Semantic Scholar reference data
