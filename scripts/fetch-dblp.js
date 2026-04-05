#!/usr/bin/env node
/**
 * Fetches all papers from DBLP for configured security conference venues.
 * Paginates through results (max 1000 per request), normalizes author fields,
 * and tags workshop papers. Outputs data/raw-dblp.json.
 */

import { writeFileSync, mkdirSync } from "fs";
import {
  VENUES,
  DBLP_API_BASE,
  DBLP_HITS_PER_PAGE,
  DBLP_DELAY_MS,
} from "./config.js";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Decode HTML entities that DBLP includes in titles/names
function decodeHtmlEntities(str) {
  if (!str) return str;
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)));
}

// Workshop indicators in DBLP key paths or venue names
const WORKSHOP_KEY_PATTERNS = ["-ws/", "workshop/"];
const WORKSHOP_VENUE_MARKER = "@";

function isWorkshop(paper) {
  const key = paper.key || "";
  const venue = paper.venue || "";
  if (venue.includes(WORKSHOP_VENUE_MARKER)) return true;
  for (const pat of WORKSHOP_KEY_PATTERNS) {
    if (key.includes(pat)) return true;
  }
  return false;
}

function normalizeAuthors(authorsField) {
  if (!authorsField || !authorsField.author) return [];
  const raw = authorsField.author;
  const arr = Array.isArray(raw) ? raw : [raw];
  return arr.map((a) => ({
    name: decodeHtmlEntities(
      (a.text || "").replace(/ \d{4}$/, "").replace(/ 000\d$/, ""),
    ),
    pid: a["@pid"] || null,
  }));
}

function normalizeVenue(dblpVenue, venueKey) {
  // DBLP sometimes returns "CCSW@CCS" etc. Map back to the parent venue key.
  // The venueKey from our config is the canonical one.
  return venueKey;
}

async function fetchVenue(venue) {
  const papers = [];
  let offset = 0;

  // First, get the total count
  const countUrl = `${DBLP_API_BASE}?q=${encodeURIComponent(venue.dblpQuery)}&format=json&h=0`;
  console.log(`  Counting ${venue.key}...`);
  const countResp = await fetch(countUrl);
  const countData = await countResp.json();
  const total = parseInt(countData.result.hits["@total"], 10);
  console.log(`  ${venue.key}: ${total} papers total`);

  while (offset < total) {
    const url = `${DBLP_API_BASE}?q=${encodeURIComponent(venue.dblpQuery)}&format=json&h=${DBLP_HITS_PER_PAGE}&f=${offset}`;
    console.log(
      `  Fetching ${venue.key} [${offset}..${offset + DBLP_HITS_PER_PAGE}]`,
    );

    const resp = await fetch(url);
    if (!resp.ok) {
      console.error(
        `  HTTP ${resp.status} for ${venue.key} at offset ${offset}, retrying...`,
      );
      await sleep(5000);
      continue;
    }

    const data = await resp.json();
    const hits = data.result.hits.hit;
    if (!hits || hits.length === 0) break;

    const hitArr = Array.isArray(hits) ? hits : [hits];
    for (const hit of hitArr) {
      const info = hit.info;
      papers.push({
        title: decodeHtmlEntities((info.title || "").replace(/\.$/, "")), // Remove trailing period, decode entities
        authors: normalizeAuthors(info.authors),
        year: parseInt(info.year, 10) || 0,
        venue: normalizeVenue(info.venue, venue.key),
        rawVenue: info.venue || "",
        doi: info.doi || null,
        ee: info.ee || null,
        url: info.url || null,
        pages: info.pages || null,
        key: info.key || null,
        type: info.type || null,
        isWorkshop: isWorkshop(info),
      });
    }

    offset += DBLP_HITS_PER_PAGE;
    if (offset < total) await sleep(DBLP_DELAY_MS);
  }

  return papers;
}

async function main() {
  console.log("SLS: Fetching papers from DBLP...\n");

  const allPapers = [];
  for (const venue of VENUES) {
    console.log(`\n[${venue.key}] ${venue.fullName}`);
    const papers = await fetchVenue(venue);
    allPapers.push(...papers);
    console.log(
      `  -> ${papers.length} papers (${papers.filter((p) => p.isWorkshop).length} workshop)`,
    );
  }

  // Assign sequential IDs
  allPapers.forEach((p, i) => {
    p.id = i + 1;
  });

  mkdirSync("data", { recursive: true });
  writeFileSync("data/raw-dblp.json", JSON.stringify(allPapers, null, 2));

  const mainTrack = allPapers.filter((p) => !p.isWorkshop).length;
  const workshop = allPapers.filter((p) => p.isWorkshop).length;
  console.log(
    `\nDone! ${allPapers.length} total papers (${mainTrack} main track, ${workshop} workshop)`,
  );
  console.log("Output: data/raw-dblp.json");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
