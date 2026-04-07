#!/usr/bin/env node
/**
 * Builds MiniSearch index and final data files for the frontend.
 * Reads enriched.json (or raw-dblp.json as fallback) and outputs:
 *   - data/papers.json     (full paper dataset)
 *   - data/search-index.json (serialized MiniSearch index)
 *   - data/stats.json      (aggregate statistics)
 */

import { readFileSync, writeFileSync, existsSync } from "fs";
import MiniSearch from "minisearch";
import { VENUES } from "./config.js";

function main() {
  // Load papers — prefer enriched, fall back to raw DBLP
  let inputFile = "data/enriched.json";
  if (!existsSync(inputFile)) {
    inputFile = "data/raw-dblp.json";
    if (!existsSync(inputFile)) {
      console.error("No data files found. Run fetch-dblp.js first.");
      process.exit(1);
    }
    console.log(
      "Note: Using raw DBLP data (no abstracts). Run enrich-abstracts.js for full data.\n",
    );
  }

  const papers = JSON.parse(readFileSync(inputFile, "utf-8"));
  console.log(`Building search index from ${papers.length} papers...`);

  // Prepare papers for indexing: add a joined author names field
  const indexablePapers = papers.map((p) => ({
    id: p.id,
    title: p.title,
    abstract: p.abstract || "",
    authorNames: p.authors.map((a) => a.name).join(" "),
    venue: p.venue,
    year: p.year,
    isWorkshop: p.isWorkshop,
  }));

  // Build MiniSearch index
  const miniSearch = new MiniSearch({
    fields: ["title", "abstract", "authorNames"],
    storeFields: ["title", "venue", "year", "isWorkshop"],
    searchOptions: {
      boost: { title: 2, authorNames: 0.5 },
      fuzzy: 0.2,
      prefix: true,
    },
  });

  miniSearch.addAll(indexablePapers);
  console.log(`Index built: ${miniSearch.documentCount} documents indexed.`);

  // Serialize the index
  const searchIndex = JSON.stringify(miniSearch);
  writeFileSync("data/search-index.json", searchIndex);
  console.log(
    `Search index: ${(Buffer.byteLength(searchIndex) / 1024 / 1024).toFixed(1)} MB`,
  );

  // Build papers.json (frontend dataset — no need to duplicate indexed fields)
  const frontendPapers = papers.map((p) => ({
    id: p.id,
    title: p.title,
    authors: p.authors,
    year: p.year,
    venue: p.venue,
    rawVenue: p.rawVenue,
    doi: p.doi,
    ee: p.ee,
    url: p.url,
    pages: p.pages,
    abstract: p.abstract || null,
    citationCount: p.citationCount ?? null,
    tldr: p.tldr || null,
    pdfUrl: p.pdfUrl || null,
    isWorkshop: p.isWorkshop,
  }));

  writeFileSync("data/papers.json", JSON.stringify(frontendPapers));
  console.log(
    `Papers data: ${(Buffer.byteLength(JSON.stringify(frontendPapers)) / 1024 / 1024).toFixed(1)} MB`,
  );

  // Build stats
  const venueKeys = VENUES.map((v) => v.key);
  const stats = {
    totalPapers: papers.length,
    mainTrackPapers: papers.filter((p) => !p.isWorkshop).length,
    workshopPapers: papers.filter((p) => p.isWorkshop).length,
    papersWithAbstract: papers.filter((p) => p.abstract).length,
    yearRange: {
      min: Math.min(...papers.map((p) => p.year).filter((y) => y > 0)),
      max: Math.max(...papers.map((p) => p.year)),
    },
    perVenue: {},
    lastUpdated: new Date().toISOString().split("T")[0],
  };

  for (const key of venueKeys) {
    const venuePapers = papers.filter((p) => p.venue === key);
    stats.perVenue[key] = {
      total: venuePapers.length,
      mainTrack: venuePapers.filter((p) => !p.isWorkshop).length,
      workshop: venuePapers.filter((p) => p.isWorkshop).length,
    };
  }

  writeFileSync("data/stats.json", JSON.stringify(stats, null, 2));
  console.log("\nStats:", JSON.stringify(stats, null, 2));
  console.log(
    "\nDone! Files written: data/papers.json, data/search-index.json, data/stats.json",
  );
}

main();
