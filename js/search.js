/* SLS — Search engine wrapper around MiniSearch */

const SearchEngine = {
  _index: null,
  _papers: null, // Map<id, paper>
  _papersArray: null, // Array of all papers for browse mode
  _stats: null,
  _ready: false,

  /** Load search index and papers data. Returns a promise. */
  async init() {
    const t0 = performance.now();

    const [indexResp, papersResp, statsResp] = await Promise.all([
      fetch('data/search-index.json'),
      fetch('data/papers.json'),
      fetch('data/stats.json'),
    ]);

    if (!indexResp.ok || !papersResp.ok) {
      throw new Error('Failed to load data files. Run npm run build-data first.');
    }

    const [indexJson, papersJson] = await Promise.all([
      indexResp.text(),
      papersResp.json(),
    ]);

    // Deserialize MiniSearch index
    this._index = MiniSearch.loadJSON(indexJson, {
      fields: ['title', 'abstract', 'authorNames'],
      storeFields: ['title', 'venue', 'year', 'isWorkshop'],
    });

    // Build paper lookup map
    this._papers = new Map();
    this._papersArray = papersJson;
    for (const p of papersJson) {
      this._papers.set(p.id, p);
    }

    // Load stats
    if (statsResp.ok) {
      this._stats = await statsResp.json();
    }

    this._ready = true;
    const elapsed = (performance.now() - t0).toFixed(0);
    console.log(`SLS: Loaded ${this._papers.size} papers in ${elapsed}ms`);

    return this._stats;
  },

  /** Check if engine is ready. */
  isReady() {
    return this._ready;
  },

  /** Get stats object. */
  getStats() {
    return this._stats;
  },

  /** Get a paper by ID. */
  getPaper(id) {
    return this._papers.get(id);
  },

  /**
   * Search with query and filters.
   * Returns array of paper objects (full data).
   */
  search(query, filters) {
    if (!this._ready) return [];

    // Empty query → browse mode
    if (!query || query.trim() === '') {
      return this._browse(filters);
    }

    const filterFn = this._makeFilter(filters);
    const results = this._index.search(query, {
      fuzzy: 0.2,
      prefix: true,
      boost: { title: 2, authorNames: 0.5 },
      filter: filterFn,
    });

    // Map results to full paper objects
    return results.map((r) => this._papers.get(r.id)).filter(Boolean);
  },

  /**
   * Get auto-suggestions for a partial query.
   * Returns array of { suggestion, score }.
   */
  suggest(query) {
    if (!this._ready || !query || query.length < 2) return [];

    return this._index.autoSuggest(query, {
      fuzzy: 0.2,
      prefix: true,
    }).slice(0, 8);
  },

  /**
   * Browse mode: return all papers matching filters (no query).
   * Default sort: newest first.
   */
  _browse(filters) {
    let papers = this._papersArray;

    if (filters.venues && filters.venues.size < ALL_VENUES.length) {
      papers = papers.filter((p) => filters.venues.has(p.venue));
    }

    if (!filters.includeWorkshops) {
      papers = papers.filter((p) => !p.isWorkshop);
    }

    if (filters.yearMin) {
      papers = papers.filter((p) => p.year >= filters.yearMin);
    }

    if (filters.yearMax) {
      papers = papers.filter((p) => p.year <= filters.yearMax);
    }

    // Default sort for browse: newest first
    return this._sortResults([...papers], filters.sort === 'relevance' ? 'year-desc' : filters.sort);
  },

  /**
   * Sort results by the given sort key.
   * Note: MiniSearch results are already sorted by relevance, so we only re-sort for other modes.
   */
  sortResults(papers, sortKey) {
    return this._sortResults(papers, sortKey);
  },

  _sortResults(papers, sortKey) {
    switch (sortKey) {
      case 'year-desc':
        return papers.sort((a, b) => b.year - a.year);
      case 'year-asc':
        return papers.sort((a, b) => a.year - b.year);
      case 'citations':
        return papers.sort((a, b) => (b.citationCount || 0) - (a.citationCount || 0));
      default: // 'relevance' — keep MiniSearch order
        return papers;
    }
  },

  /** Build a MiniSearch filter function from FilterState. */
  _makeFilter(filters) {
    return (result) => {
      if (filters.venues && filters.venues.size < ALL_VENUES.length) {
        if (!filters.venues.has(result.venue)) return false;
      }
      if (!filters.includeWorkshops && result.isWorkshop) return false;
      if (filters.yearMin && result.year < filters.yearMin) return false;
      if (filters.yearMax && result.year > filters.yearMax) return false;
      return true;
    };
  },
};
