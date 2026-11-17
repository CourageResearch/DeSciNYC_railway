import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const index = JSON.parse(await readFile("data/transcripts/index.json", "utf8"));

test("each recorded talk has a concise overview and three distinct takeaways", async () => {
  const summaries = JSON.parse(await readFile("data/talks/summaries.json", "utf8"));
  const { MARKO_TALK } = await import("../lib/marko-talk.ts");
  assert.deepEqual(Object.keys(summaries).sort(), [...index.map((item) => item.key), MARKO_TALK.videoId].sort());
  for (const [key, overview] of Object.entries(summaries)) {
    assert.ok(overview.summary.trim().length > 0, key);
    assert.ok(overview.summary.split(/\s+/).length <= 65, key);
    assert.equal(overview.takeaways.length, 3, key);
    assert.equal(new Set(overview.takeaways).size, 3, key);
    for (const takeaway of overview.takeaways) {
      assert.ok(takeaway.trim().length > 0, key);
      assert.ok(takeaway.split(/\s+/).length <= 45, key);
    }
  }
});

test("transcripts have unique routes and exclude breakfast recordings", () => {
  assert.ok(index.length > 0);
  for (const field of ["key", "slug", "pagePath", "downloadPath"]) {
    assert.equal(new Set(index.map((item) => item[field])).size, index.length, field);
  }
  for (const item of index) {
    assert.match(item.key, /^[A-Za-z0-9_-]+$/);
    assert.match(item.slug, /^[a-z0-9-]+$/);
    assert.ok(item.title && item.speaker);
    assert.ok(!/breakfast/i.test(item.title));
    assert.ok(!["cGPjTMsFQOs", "ZvplAOaPCrA"].includes(item.videoId));
    assert.equal(item.pagePath, item.key === "crispr" ? "/biological-futures" : `/transcripts/${item.slug}`);
  }
});

test("every transcript has ordered, nonempty paragraphs and complete text downloads", async () => {
  for (const item of index) {
    const { paragraphs } = JSON.parse(await readFile(`data/transcripts/${item.key}.json`, "utf8"));
    const download = await readFile(`public${item.downloadPath}`, "utf8");
    const captions = await readFile(`public${item.captionsPath}`, "utf8");
    assert.equal(paragraphs.length, item.paragraphCount, item.key);
    assert.ok(paragraphs.length > 0, item.key);
    assert.ok(download.includes(item.title), item.key);
    assert.match(captions, /^WEBVTT\r?\n\r?\n/, item.key);
    let previous = -1;
    let words = 0;
    for (const paragraph of paragraphs) {
      assert.ok(Number.isFinite(paragraph.start) && paragraph.start >= 0 && paragraph.start >= previous, item.key);
      assert.ok(Number.isFinite(paragraph.end) && paragraph.end > paragraph.start, item.key);
      assert.ok(paragraph.text.trim().length > 0, item.key);
      assert.ok(download.includes(paragraph.text), item.key);
      words += paragraph.text.split(/\s+/).length;
      previous = paragraph.start;
    }
    assert.equal(words, item.wordCount, item.key);
  }
});
