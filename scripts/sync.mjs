#!/usr/bin/env node
/* ==========================================================================
   X榜单 Zero-Cost Hourly Sync Runner (GitHub Actions / Local CLI)
   Pulls free compliant sources -> applies 08:00 CST rules -> writes JSON
   ========================================================================== */

import fs from "node:fs/promises";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

import { getStatDateCST, formatCSTTime } from "./analytics.mjs";
import { fetchGitHubIntel } from "./providers/github.mjs";
import { fetchHackerNewsTopics } from "./providers/hackernews.mjs";
import { fetchBlueskyGlobal } from "./providers/bluesky.mjs";
import { fetchConfiguredXAccounts } from "./providers/x-provider.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DATA_DIR = path.join(ROOT, "data");
const DAILY_DIR = path.join(DATA_DIR, "daily");

async function loadBaselineData() {
  const code = await fs.readFile(path.join(ROOT, "data.js"), "utf8");
  const sandbox = { window: {} };
  vm.runInNewContext(code, sandbox);
  return structuredClone(sandbox.window.XB_DATA);
}

async function run() {
  const now = new Date();
  const statDate = getStatDateCST(now);
  const updatedAt = formatCSTTime(now);
  const base = await loadBaselineData();

  const [ghRes, hnRes, bskyRes, xRes] = await Promise.allSettled([
    fetchGitHubIntel({ limit: 8 }),
    fetchHackerNewsTopics({ limit: 6 }),
    fetchBlueskyGlobal({ limit: 8 }),
    fetchConfiguredXAccounts()
  ]);

  const status = {
    statDate,
    syncedAtISO: now.toISOString(),
    updatedAtCST: updatedAt,
    mode: "free-tier",
    providers: {}
  };

  // 1. Merge GitHub real-time open-source intel
  if (ghRes.status === "fulfilled" && ghRes.value.items.length) {
    status.providers.github = { ok: true, count: ghRes.value.count };
    const existingIds = new Set(ghRes.value.items.map((i) => i.id));
    base.intelItems = [
      ...ghRes.value.items,
      ...base.intelItems.filter((i) => !existingIds.has(i.id))
    ].slice(0, 24);
  } else {
    status.providers.github = { ok: false, error: ghRes.reason?.message || "empty" };
  }

  // 2. Merge Hacker News real-time trending topics
  if (hnRes.status === "fulfilled" && hnRes.value.topics.length) {
    status.providers.hackernews = { ok: true, count: hnRes.value.count };
    base.topics = [
      ...hnRes.value.topics.slice(0, 4),
      ...base.topics.slice(0, 4)
    ].map((t, idx) => ({ ...t, rank: idx + 1 }));
  } else {
    status.providers.hackernews = { ok: false, error: hnRes.reason?.message || "empty" };
  }

  // 3. Merge Bluesky real-time global posts
  if (bskyRes.status === "fulfilled" && bskyRes.value.tweets.length) {
    status.providers.bluesky = { ok: true, count: bskyRes.value.count };
    base.globalTweets = [
      ...bskyRes.value.tweets.slice(0, 5),
      ...base.globalTweets.slice(0, 6)
    ].map((t, idx) => ({ ...t, rank: idx + 1 }));
  } else {
    status.providers.bluesky = { ok: false, error: bskyRes.reason?.message || "empty" };
  }

  // 4. Optional XDataProvider adapter
  if (xRes.status === "fulfilled" && xRes.value.ok && xRes.value.accounts?.length) {
    status.providers.xAdapter = { ok: true, count: xRes.value.accounts.length };
    base.accounts = xRes.value.accounts;
  } else {
    status.providers.xAdapter = {
      ok: false,
      skipped: true,
      note: xRes.value?.reason || xRes.reason?.message || "skipped"
    };
  }

  // Update metadata & active sources banner
  const activeSources = Object.entries(status.providers)
    .filter(([, v]) => v.ok)
    .map(([k]) => k.toUpperCase());

  base.meta.date = statDate;
  base.meta.updatedAt = updatedAt;
  base.meta.liveSources = activeSources;
  base.meta.syncMode = activeSources.length ? "live-free-tier" : "static-baseline";

  await fs.mkdir(DAILY_DIR, { recursive: true });
  await fs.writeFile(path.join(DATA_DIR, "latest.json"), JSON.stringify(base, null, 2), "utf8");
  await fs.writeFile(path.join(DAILY_DIR, `${statDate}.json`), JSON.stringify(base, null, 2), "utf8");
  await fs.writeFile(path.join(DATA_DIR, "sync-status.json"), JSON.stringify(status, null, 2), "utf8");

  console.log(`[xbangdan-sync] Done statDate=${statDate} updatedAt=${updatedAt} activeSources=${activeSources.join(",") || "none(fallback)"}`);
}

run().catch((err) => {
  console.error("[xbangdan-sync] Fatal error:", err);
  process.exit(1);
});
