// Daily Byte generator — CI-only script, never shipped to the site.
// Picks a current article from a reputable feed, has Claude adapt it into
// 5 reading-level summaries + 3 impact questions, and writes a static JSON
// file the (vanilla-JS, no-backend) learn/daily-byte page reads at runtime.

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Parser from "rss-parser";
import { JSDOM } from "jsdom";
import { Readability } from "@mozilla/readability";
import Anthropic from "@anthropic-ai/sdk";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SITE_ROOT = path.resolve(__dirname, "../..");
const DATA_DIR = path.join(SITE_ROOT, "tech-news/data");
const FEEDS = JSON.parse(await fs.readFile(path.join(__dirname, "feeds.json"), "utf8"));
const CATEGORIES = ["cybersecurity", "ai", "general-tech"];
const FRESH_WINDOW_HOURS = 72;
const USER_AGENT = "Mozilla/5.0 (compatible; MrQCyberDailyByte/1.0; +https://mrqcyber.com)";
const MODEL = "claude-sonnet-5";

const LEVELS = [
  { label: "Grade 3-4", approx_lexile: 400, min: 150, max: 220 },
  { label: "Grade 5-6", approx_lexile: 700, min: 220, max: 320 },
  { label: "Grade 7-8", approx_lexile: 1000, min: 320, max: 420 },
  { label: "Grade 9-10", approx_lexile: 1300, min: 420, max: 520 },
  { label: "Grade 11+", approx_lexile: 1600, min: 520, max: 650 },
];

function todayInEastern() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const get = (t) => parts.find((p) => p.type === t).value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}

function dayOfYear(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const start = Date.UTC(y, 0, 1);
  const now = Date.UTC(y, m - 1, d);
  return Math.floor((now - start) / 86400000);
}

async function loadExisting() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const files = (await fs.readdir(DATA_DIR)).filter(
    (f) => f.endsWith(".json") && f !== "index.json"
  );
  const usedUrls = new Set();
  const entries = [];
  for (const f of files) {
    const doc = JSON.parse(await fs.readFile(path.join(DATA_DIR, f), "utf8"));
    usedUrls.add(doc.source.url);
    entries.push({ date: doc.date, category: doc.category, headline: doc.headline });
  }
  return { usedUrls, entries, existingDates: new Set(entries.map((e) => e.date)) };
}

async function fetchCandidates(category, usedUrls, { requireFresh }) {
  const parser = new Parser({ headers: { "User-Agent": USER_AGENT } });
  const cutoff = Date.now() - FRESH_WINDOW_HOURS * 3600 * 1000;
  const items = [];
  for (const feed of FEEDS[category]) {
    try {
      const parsed = await parser.parseURL(feed.url);
      for (const item of parsed.items || []) {
        const link = item.link;
        const pubDate = item.pubDate || item.isoDate;
        if (!link || usedUrls.has(link)) continue;
        const ts = pubDate ? Date.parse(pubDate) : NaN;
        if (Number.isNaN(ts)) continue;
        // The live daily run only wants genuinely current news. A manual
        // backfill for an older date can't satisfy that (feeds have moved
        // on), so it just takes the most recent unused item instead.
        if (requireFresh && ts < cutoff) continue;
        items.push({ title: item.title, link, pubDate: ts, sourceName: feed.name });
      }
    } catch (err) {
      console.warn(`[warn] feed failed: ${feed.name} (${feed.url}): ${err.message}`);
    }
  }
  items.sort((a, b) => b.pubDate - a.pubDate);
  return items;
}

async function extractArticleText(url) {
  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) throw new Error(`fetch failed: ${res.status}`);
  const html = await res.text();
  const dom = new JSDOM(html, { url });
  const article = new Readability(dom.window.document).parse();
  if (!article || !article.textContent || article.textContent.trim().length < 400) {
    throw new Error("readability extraction too short/empty");
  }
  return article.textContent.trim().slice(0, 20000);
}

const anthropic = new Anthropic();

async function adaptArticle({ title, sourceName, text }) {
  const levelSpec = LEVELS.map(
    (l) => `- "${l.label}": ${l.min}-${l.max} words`
  ).join("\n");

  const prompt = `You are adapting a technology/cybersecurity news article for a K-12 public school reading tool. Students will pick a reading level and read your adaptation, not the original article.

Article title: ${title}
Article source: ${sourceName}
Article text:
"""
${text}
"""

Write a JSON object (and ONLY the JSON object — no markdown fences, no commentary) with this exact shape:
{
  "suitable_for_school": boolean,
  "headline": string,
  "levels": [ { "label": string, "summary": string }, ... exactly 5, one per band below, in this order ... ],
  "questions": [ string, string, string ]
}

Rules:
- "suitable_for_school": true only if the article has no graphic violence, explicit content, profanity, or other content inappropriate for a public school classroom. If false, you may leave "levels" and "questions" as empty arrays.
- Each level's "summary" must be an ORIGINAL explanation in your own words — do not copy sentences from the source. Explain what happened, why it matters, and its real-world impact. Longer bands should add genuine nuance and detail, not just padding.
- Reading bands and target lengths (approximate, aim within range):
${levelSpec}
- Grade 3-4: very short sentences, common everyday words, gently explain any term a 3rd/4th grader wouldn't know.
- Grade 11+: may use more technical vocabulary, but every term should still be clearly explained in context.
- "questions": exactly 3 open-ended discussion questions in plain, accessible language (understandable to a middle schooler) that ask the reader to think about how this story could affect their own life, their school/community, or the wider world. Avoid simple fact-recall questions.`;

  const msg = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 4000,
    messages: [{ role: "user", content: prompt }],
  });

  const raw = msg.content.map((b) => (b.type === "text" ? b.text : "")).join("");
  const jsonText = raw.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  const parsed = JSON.parse(jsonText);

  if (
    !parsed.suitable_for_school ||
    !Array.isArray(parsed.levels) ||
    parsed.levels.length !== 5 ||
    !Array.isArray(parsed.questions) ||
    parsed.questions.length !== 3
  ) {
    return null;
  }
  return parsed;
}

function withReadingStats(levels) {
  return levels.map((level, i) => {
    const spec = LEVELS[i];
    const wordCount = level.summary.trim().split(/\s+/).filter(Boolean).length;
    return {
      label: spec.label,
      approx_lexile: spec.approx_lexile,
      summary: level.summary.trim(),
      word_count: wordCount,
      reading_time_min: Math.max(1, Math.round(wordCount / 200)),
    };
  });
}

async function writeIndex(entries) {
  const sorted = [...entries].sort((a, b) => (a.date < b.date ? 1 : -1));
  await fs.writeFile(
    path.join(DATA_DIR, "index.json"),
    JSON.stringify(sorted, null, 2) + "\n"
  );
}

async function main() {
  // DAILY_BYTE_DATE lets us backfill a specific past date (e.g. for testing
  // or catching up missed days) instead of always targeting "today".
  const isBackfill = !!process.env.DAILY_BYTE_DATE;
  const date = process.env.DAILY_BYTE_DATE || todayInEastern();
  const { usedUrls, entries, existingDates } = await loadExisting();

  if (existingDates.has(date)) {
    console.log(`[skip] ${date} already has a Daily Byte entry.`);
    return;
  }

  const startIdx = dayOfYear(date) % CATEGORIES.length;
  const rotation = [0, 1, 2].map((i) => CATEGORIES[(startIdx + i) % CATEGORIES.length]);

  for (const category of rotation) {
    console.log(`[try] category=${category}`);
    const candidates = await fetchCandidates(category, usedUrls, { requireFresh: !isBackfill });
    console.log(`[info] ${candidates.length} unused candidate(s) in ${category}`);

    for (const candidate of candidates.slice(0, 8)) {
      try {
        console.log(`[attempt] ${candidate.title} (${candidate.link})`);
        const text = await extractArticleText(candidate.link);
        const adapted = await adaptArticle({
          title: candidate.title,
          sourceName: candidate.sourceName,
          text,
        });
        if (!adapted) {
          console.log(`[skip] not suitable / malformed response, trying next candidate`);
          continue;
        }

        const doc = {
          date,
          category,
          source: { name: candidate.sourceName, url: candidate.link },
          headline: adapted.headline || candidate.title,
          levels: withReadingStats(adapted.levels),
          questions: adapted.questions,
        };

        await fs.writeFile(
          path.join(DATA_DIR, `${date}.json`),
          JSON.stringify(doc, null, 2) + "\n"
        );
        entries.push({ date, category, headline: doc.headline });
        await writeIndex(entries);
        console.log(`[done] wrote ${date}.json (${category}): ${doc.headline}`);
        return;
      } catch (err) {
        console.warn(`[warn] candidate failed: ${err.message}`);
      }
    }
  }

  console.log(`[skip] no suitable article found across all categories for ${date}.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
