/* SLS (Security Literature Search) — Main application logic */

(function () {
  "use strict";

  // DOM elements
  const searchInput = document.getElementById("searchInput");
  const suggestionsEl = document.getElementById("suggestions");
  const statsLine = document.getElementById("statsLine");
  const resultsEl = document.getElementById("results");
  const loadingState = document.getElementById("loadingState");
  const lastUpdatedEl = document.getElementById("lastUpdated");
  const themeToggle = document.getElementById("themeToggle");
  const themeIcon = document.getElementById("themeIcon");
  const yearMinInput = document.getElementById("yearMin");
  const yearMaxInput = document.getElementById("yearMax");
  const workshopToggle = document.getElementById("workshopToggle");
  const sortSelect = document.getElementById("sortSelect");
  const venueChips = document.querySelectorAll(".venue-chip");

  // Pagination state for lazy loading
  let currentResults = [];
  let displayedCount = 0;
  const PAGE_SIZE = 50;
  let observer = null;

  // ── Theme ──────────────────────────────────────
  function initTheme() {
    const saved = localStorage.getItem("theme");
    if (saved) {
      document.documentElement.setAttribute("data-theme", saved);
    }
    updateThemeIcon();
  }

  function toggleTheme() {
    const current = document.documentElement.getAttribute("data-theme");
    let next;
    if (current === "dark") {
      next = "light";
    } else if (current === "light") {
      next = "dark";
    } else {
      // No explicit theme — check system preference and go opposite
      next = window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "light"
        : "dark";
    }
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("theme", next);
    updateThemeIcon();
  }

  function updateThemeIcon() {
    const theme = document.documentElement.getAttribute("data-theme");
    const isDark =
      theme === "dark" ||
      (!theme && window.matchMedia("(prefers-color-scheme: dark)").matches);
    themeIcon.textContent = isDark ? "\u2600" : "\u263E"; // ☀ or ☾
  }

  // ── Render Functions ───────────────────────────
  function renderPaperCard(paper) {
    const authors = escapeHtml(formatAuthors(paper.authors));
    const title = escapeHtml(paper.title);
    const link = paper.doi
      ? `https://doi.org/${paper.doi}`
      : paper.ee || paper.url || "#";

    const venueColor = `var(--color-${paper.venue})`;

    let badges = `<span class="venue-badge" style="--badge-color: ${venueColor}">${escapeHtml(VENUE_NAMES[paper.venue] || paper.venue)}</span>`;
    if (paper.isWorkshop) {
      badges += `<span class="workshop-badge">Workshop</span>`;
    }

    let meta = `<span class="year">${paper.year}</span>`;
    if (paper.citationCount != null && paper.citationCount > 0) {
      meta += `<span class="citation-badge" title="Citations">\u{1F4D6} ${paper.citationCount}</span>`;
    }

    let links = "";
    if (paper.doi) {
      links += `<a href="https://doi.org/${escapeHtml(paper.doi)}" target="_blank" rel="noopener">DOI</a>`;
    }
    if (paper.url) {
      links += `<a href="${escapeHtml(paper.url)}" target="_blank" rel="noopener">DBLP</a>`;
    }
    if (paper.pdfUrl) {
      links += `<a href="${escapeHtml(paper.pdfUrl)}" target="_blank" rel="noopener">PDF</a>`;
    }

    let expandSection = "";
    if (paper.abstract || paper.tldr) {
      expandSection = `
        <div class="paper-expand" onclick="this.nextElementSibling.classList.toggle('visible')">
          &#9662; Abstract
        </div>
        <div class="paper-abstract">
          ${paper.tldr ? `<p class="paper-tldr">TL;DR: ${escapeHtml(paper.tldr)}</p>` : ""}
          ${paper.abstract ? `<p>${escapeHtml(paper.abstract)}</p>` : ""}
        </div>`;
    }

    return `
      <div class="paper-card" style="--card-venue-color: ${venueColor}">
        <div class="paper-top">
          <div class="paper-badges">${badges}</div>
          <div class="paper-info">
            <div class="paper-title"><a href="${escapeHtml(link)}" target="_blank" rel="noopener">${title}</a></div>
            <div class="paper-authors">${authors}</div>
            <div class="paper-meta">
              ${meta}
              <div class="paper-links">${links}</div>
            </div>
          </div>
        </div>
        ${expandSection}
      </div>`;
  }

  function renderResults(papers) {
    currentResults = papers;
    displayedCount = 0;

    // Clean up old observer
    if (observer) observer.disconnect();

    if (papers.length === 0) {
      const query = FilterState.query;
      resultsEl.innerHTML = `
        <div class="empty-state">
          <h2>No papers found</h2>
          <p>${query ? `No results for "${escapeHtml(query)}". Try different keywords or adjust filters.` : "Adjust your filters to see papers."}</p>
        </div>`;
      return;
    }

    // Sort if not relevance (MiniSearch already sorted by relevance)
    if (FilterState.sort !== "relevance" || !FilterState.query) {
      SearchEngine.sortResults(
        papers,
        FilterState.sort === "relevance" ? "year-desc" : FilterState.sort,
      );
    }

    // Results header
    const headerHtml = `
      <div class="results-header">
        <span class="result-count">${papers.length.toLocaleString()} paper${papers.length !== 1 ? "s" : ""} found</span>
      </div>`;

    resultsEl.innerHTML =
      headerHtml +
      '<div id="papersList"></div><div id="sentinel" style="height:1px"></div>';
    loadMorePapers();

    // Set up IntersectionObserver for lazy loading
    const sentinel = document.getElementById("sentinel");
    if (sentinel && papers.length > PAGE_SIZE) {
      observer = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting) loadMorePapers();
        },
        { rootMargin: "200px" },
      );
      observer.observe(sentinel);
    }
  }

  function loadMorePapers() {
    const list = document.getElementById("papersList");
    if (!list || displayedCount >= currentResults.length) return;

    const end = Math.min(displayedCount + PAGE_SIZE, currentResults.length);
    let html = "";
    for (let i = displayedCount; i < end; i++) {
      html += renderPaperCard(currentResults[i]);
    }
    list.insertAdjacentHTML("beforeend", html);
    displayedCount = end;
  }

  function renderSuggestions(suggestions) {
    if (!suggestions || suggestions.length === 0) {
      suggestionsEl.classList.remove("active");
      suggestionsEl.innerHTML = "";
      return;
    }

    suggestionsEl.innerHTML = suggestions
      .map(
        (s, i) =>
          `<div class="suggestion-item" data-index="${i}">${escapeHtml(s.suggestion)}</div>`,
      )
      .join("");
    suggestionsEl.classList.add("active");
  }

  // ── Search Execution ──────────────────────────
  function executeSearch() {
    if (!SearchEngine.isReady()) return;
    const results = SearchEngine.search(FilterState.query, FilterState);
    renderResults(results);
  }

  const debouncedSuggest = debounce(function () {
    const q = searchInput.value.trim();
    if (q.length < 2) {
      renderSuggestions([]);
      return;
    }
    const suggestions = SearchEngine.suggest(q);
    renderSuggestions(suggestions);
  }, 150);

  // ── Event Bindings ────────────────────────────
  function bindEvents() {
    // Search input
    searchInput.addEventListener("input", function () {
      FilterState.query = this.value.trim();
      FilterState._writeURL();
      debouncedSuggest();
    });

    searchInput.addEventListener("keydown", function (e) {
      if (e.key === "Enter") {
        suggestionsEl.classList.remove("active");
        FilterState.set("query", this.value.trim());
        executeSearch();
      } else if (e.key === "Escape") {
        suggestionsEl.classList.remove("active");
      } else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        navigateSuggestions(e.key === "ArrowDown" ? 1 : -1);
      }
    });

    // Suggestion clicks
    suggestionsEl.addEventListener("click", function (e) {
      const item = e.target.closest(".suggestion-item");
      if (item) {
        searchInput.value = item.textContent;
        FilterState.set("query", item.textContent);
        suggestionsEl.classList.remove("active");
        executeSearch();
      }
    });

    // Close suggestions on outside click
    document.addEventListener("click", function (e) {
      if (!e.target.closest(".search-wrapper")) {
        suggestionsEl.classList.remove("active");
      }
    });

    // Venue chips
    venueChips.forEach((chip) => {
      chip.addEventListener("click", function () {
        const venue = this.dataset.venue;
        this.classList.toggle("active");
        FilterState.toggleVenue(venue);
      });
    });

    // Year inputs
    yearMinInput.addEventListener("change", function () {
      FilterState.set("yearMin", this.value ? parseInt(this.value, 10) : null);
    });
    yearMaxInput.addEventListener("change", function () {
      FilterState.set("yearMax", this.value ? parseInt(this.value, 10) : null);
    });

    // Workshop toggle
    workshopToggle.addEventListener("change", function () {
      FilterState.set("includeWorkshops", this.checked);
    });

    // Sort select
    sortSelect.addEventListener("change", function () {
      FilterState.set("sort", this.value);
    });

    // Theme toggle
    themeToggle.addEventListener("click", toggleTheme);

    // On filter change, re-execute search
    FilterState.onChange(executeSearch);
  }

  function navigateSuggestions(dir) {
    const items = suggestionsEl.querySelectorAll(".suggestion-item");
    if (items.length === 0) return;

    const active = suggestionsEl.querySelector(".suggestion-item.active");
    let idx = active
      ? parseInt(active.dataset.index, 10) + dir
      : dir === 1
        ? 0
        : items.length - 1;
    idx = Math.max(0, Math.min(items.length - 1, idx));

    items.forEach((el) => el.classList.remove("active"));
    items[idx].classList.add("active");
    searchInput.value = items[idx].textContent;
  }

  // ── Sync UI from FilterState ──────────────────
  function syncUIFromState() {
    searchInput.value = FilterState.query || "";

    venueChips.forEach((chip) => {
      const venue = chip.dataset.venue;
      chip.classList.toggle("active", FilterState.venues.has(venue));
    });

    if (FilterState.yearMin) yearMinInput.value = FilterState.yearMin;
    if (FilterState.yearMax) yearMaxInput.value = FilterState.yearMax;
    workshopToggle.checked = FilterState.includeWorkshops;
    sortSelect.value = FilterState.sort;
  }

  // ── Init ──────────────────────────────────────
  async function init() {
    initTheme();
    FilterState.readFromURL();
    syncUIFromState();
    bindEvents();

    try {
      const stats = await SearchEngine.init();

      // Update stats line
      if (stats) {
        statsLine.textContent = `Searching across ${stats.totalPapers.toLocaleString()} papers from 6 top-tier conferences (${stats.yearRange.min}\u2013${stats.yearRange.max})`;
        if (stats.lastUpdated) lastUpdatedEl.textContent = stats.lastUpdated;
        if (!FilterState.yearMin)
          yearMinInput.placeholder = stats.yearRange.min;
        if (!FilterState.yearMax)
          yearMaxInput.placeholder = stats.yearRange.max;
      }

      // Remove loading state
      if (loadingState) loadingState.remove();

      // Execute initial search (from URL params or empty)
      executeSearch();

      // Focus search input
      searchInput.focus();
    } catch (err) {
      console.error("Failed to initialize:", err);
      resultsEl.innerHTML = `
        <div class="empty-state">
          <h2>Failed to load data</h2>
          <p>Could not load the paper database. Make sure data files exist by running <code>npm run build-data</code>.</p>
          <p style="margin-top:0.5rem;font-size:0.85rem;color:var(--text-muted)">${escapeHtml(err.message)}</p>
        </div>`;
    }
  }

  // Boot
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
