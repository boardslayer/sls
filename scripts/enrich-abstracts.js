#!/usr/bin/env node
/**
 * Enriches DBLP paper data with abstracts, citation counts, and TLDRs
 * from Semantic Scholar. Caches responses to avoid redundant API calls.
 * Outputs data/enriched.json.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { createHash } from 'crypto';
import { S2_API_BASE, S2_FIELDS, S2_RATE_LIMIT, S2_CACHE_DIR } from './config.js';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const DELAY_MS = Math.ceil(1000 / S2_RATE_LIMIT);
const MAX_RETRIES = 3;

function cacheKey(doi) {
  return createHash('md5').update(doi).digest('hex') + '.json';
}

function readCache(doi) {
  const path = `${S2_CACHE_DIR}/${cacheKey(doi)}`;
  if (existsSync(path)) {
    try {
      return JSON.parse(readFileSync(path, 'utf-8'));
    } catch {
      return null;
    }
  }
  return null;
}

function writeCache(doi, data) {
  const path = `${S2_CACHE_DIR}/${cacheKey(doi)}`;
  writeFileSync(path, JSON.stringify(data));
}

async function fetchS2(doi, retries = 0) {
  const url = `${S2_API_BASE}/DOI:${doi}?fields=${S2_FIELDS}`;
  try {
    const resp = await fetch(url);
    if (resp.status === 404) return null; // Paper not in S2
    if (resp.status === 429) {
      // Rate limited — exponential backoff
      const wait = Math.min(60000, (2 ** retries) * 2000);
      console.log(`    Rate limited, waiting ${wait / 1000}s...`);
      await sleep(wait);
      if (retries < MAX_RETRIES) return fetchS2(doi, retries + 1);
      return null;
    }
    if (!resp.ok) {
      if (retries < MAX_RETRIES) {
        await sleep(2000);
        return fetchS2(doi, retries + 1);
      }
      return null;
    }
    return await resp.json();
  } catch (err) {
    if (retries < MAX_RETRIES) {
      await sleep(2000);
      return fetchS2(doi, retries + 1);
    }
    return null;
  }
}

async function main() {
  if (!existsSync('data/raw-dblp.json')) {
    console.error('data/raw-dblp.json not found. Run fetch-dblp.js first.');
    process.exit(1);
  }

  const papers = JSON.parse(readFileSync('data/raw-dblp.json', 'utf-8'));
  mkdirSync(S2_CACHE_DIR, { recursive: true });

  const withDoi = papers.filter((p) => p.doi);
  console.log(`SLS: Enriching ${withDoi.length} papers with Semantic Scholar data...`);
  console.log(`(${papers.length - withDoi.length} papers have no DOI and will be skipped)\n`);

  let enriched = 0;
  let cached = 0;
  let notFound = 0;
  let errors = 0;

  for (let i = 0; i < papers.length; i++) {
    const paper = papers[i];
    if (!paper.doi) continue;

    // Check cache first
    const cachedData = readCache(paper.doi);
    if (cachedData !== null) {
      if (cachedData.abstract) paper.abstract = cachedData.abstract;
      if (cachedData.citationCount != null) paper.citationCount = cachedData.citationCount;
      if (cachedData.tldr?.text) paper.tldr = cachedData.tldr.text;
      if (cachedData.openAccessPdf?.url) paper.pdfUrl = cachedData.openAccessPdf.url;
      cached++;
      continue;
    }

    // Fetch from S2
    const data = await fetchS2(paper.doi);
    if (data === null) {
      writeCache(paper.doi, {}); // Cache the miss to avoid re-fetching
      notFound++;
    } else {
      writeCache(paper.doi, data);
      if (data.abstract) paper.abstract = data.abstract;
      if (data.citationCount != null) paper.citationCount = data.citationCount;
      if (data.tldr?.text) paper.tldr = data.tldr.text;
      if (data.openAccessPdf?.url) paper.pdfUrl = data.openAccessPdf.url;
      enriched++;
    }

    // Progress logging every 100 papers
    const processed = enriched + notFound + errors;
    if (processed % 100 === 0) {
      const pct = ((processed / withDoi.length) * 100).toFixed(1);
      console.log(`  [${pct}%] ${processed}/${withDoi.length} — ${enriched} enriched, ${cached} cached, ${notFound} not found`);
    }

    await sleep(DELAY_MS);
  }

  writeFileSync('data/enriched.json', JSON.stringify(papers, null, 2));

  const withAbstract = papers.filter((p) => p.abstract).length;
  console.log(`\nDone! ${enriched} newly enriched, ${cached} from cache, ${notFound} not found.`);
  console.log(`${withAbstract}/${papers.length} papers now have abstracts.`);
  console.log('Output: data/enriched.json');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
