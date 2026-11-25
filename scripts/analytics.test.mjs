import test from "node:test";
import assert from "node:assert/strict";
import {
  getStatDateCST,
  computeViewsDelta,
  countOriginalPosts,
  applyCoverageGuard,
  isAccountObserving,
  computeBreakoutRatio,
  isLowFollowerBreakout,
  isDarkHorse
} from "./analytics.mjs";

test("Rule ②: 08:00 Asia/Shanghai day-boundary cutover", () => {
  // 2026-11-25 07:59 CST == 2026-11-24 23:59 UTC -> belongs to 2026-11-24
  assert.equal(getStatDateCST("2026-11-24T23:59:59Z"), "2026-11-24");
  // 2026-11-25 08:00 CST == 2026-11-25 00:00 UTC -> belongs to 2026-11-25
  assert.equal(getStatDateCST("2026-11-25T00:00:00Z"), "2026-11-25");
});

test("Rule ③: countOriginalPosts excludes retweets and replies, keeps quotes", () => {
  const sample = [
    { isRetweet: false, isReply: false, isQuote: false },
    { isRetweet: false, isReply: false, isQuote: true },
    { isRetweet: true, isReply: false, isQuote: false },
    { isRetweet: false, isReply: true, isQuote: false }
  ];
  assert.equal(countOriginalPosts(sample), 2);
});

test("Rule ④: computeViewsDelta returns non-negative daily increment", () => {
  assert.equal(computeViewsDelta(1000, 3500), 2500);
  assert.equal(computeViewsDelta(5000, 4800), 0);
});

test("Rule ⑥: isAccountObserving enforces 48h observation window", () => {
  const now = new Date("2026-11-25T00:00:00Z");
  assert.equal(isAccountObserving("2026-11-24T00:00:00Z", now), true);
  assert.equal(isAccountObserving("2026-11-22T23:00:00Z", now), false);
});

test("Rule ⑦: applyCoverageGuard returns null when coverage < 0.80", () => {
  assert.equal(applyCoverageGuard(12345, 0.79), null);
  assert.equal(applyCoverageGuard(12345, 0.80), 12345);
});

test("Global breakout ratio & Dark Horse classification", () => {
  assert.equal(computeBreakoutRatio(10000, 100), 100);
  assert.equal(isLowFollowerBreakout(10000, 100), true);
  assert.equal(isLowFollowerBreakout(500, 1000), false);
  assert.equal(isDarkHorse(2845), true);
  assert.equal(isDarkHorse(12400), false);
});
