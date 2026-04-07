/* SLS — Filter state management with URL sync */

const FilterState = {
  query: "",
  venues: new Set(ALL_VENUES),
  yearMin: null,
  yearMax: null,
  includeWorkshops: true,
  sort: "relevance",
  _listeners: [],

  /** Register a callback to fire when any filter changes. */
  onChange(fn) {
    this._listeners.push(fn);
  },

  /** Notify all listeners. */
  _notify() {
    for (const fn of this._listeners) fn();
  },

  /** Update a filter key and notify. */
  set(key, value) {
    this[key] = value;
    this._writeURL();
    this._notify();
  },

  /** Toggle a venue on/off. */
  toggleVenue(venue) {
    if (this.venues.has(venue)) {
      this.venues.delete(venue);
    } else {
      this.venues.add(venue);
    }
    this._writeURL();
    this._notify();
  },

  /** Read filter state from URL search params. */
  readFromURL() {
    const params = new URLSearchParams(window.location.search);

    if (params.has("q")) this.query = params.get("q");
    if (params.has("venues")) {
      const v = params
        .get("venues")
        .split(",")
        .filter((k) => ALL_VENUES.includes(k));
      if (v.length > 0) this.venues = new Set(v);
    }
    if (params.has("yearMin")) {
      const y = parseInt(params.get("yearMin"), 10);
      if (!isNaN(y)) this.yearMin = y;
    }
    if (params.has("yearMax")) {
      const y = parseInt(params.get("yearMax"), 10);
      if (!isNaN(y)) this.yearMax = y;
    }
    if (params.has("workshops")) {
      this.includeWorkshops = params.get("workshops") !== "0";
    }
    if (
      params.has("sort") &&
      ["relevance", "year-desc", "year-asc", "citations"].includes(
        params.get("sort"),
      )
    ) {
      this.sort = params.get("sort");
    }
  },

  /** Write current filter state to URL search params (without reload). */
  _writeURL() {
    const params = new URLSearchParams();

    if (this.query) params.set("q", this.query);
    // Only write venues if not all selected
    if (this.venues.size < ALL_VENUES.length) {
      params.set("venues", [...this.venues].join(","));
    }
    if (this.yearMin) params.set("yearMin", this.yearMin);
    if (this.yearMax) params.set("yearMax", this.yearMax);
    if (!this.includeWorkshops) params.set("workshops", "0");
    if (this.sort !== "relevance") params.set("sort", this.sort);

    const qs = params.toString();
    const url = qs
      ? `${window.location.pathname}?${qs}`
      : window.location.pathname;
    history.replaceState(null, "", url);
  },
};
