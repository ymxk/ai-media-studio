/* ==========================================================================
   X榜单 Analytics Engine — 08:00 CST Cutover & 7 Methodology Rules
   ========================================================================== */

/**
 * Rule ②: 每天早上 08:00 (Asia/Shanghai, UTC+8) 为切天边界。
 * 08:00 之前归属前一天，08:00 及之后归属当天。
 * @param {Date|string|number} input
 * @returns {string} YYYY-MM-DD
 */
export function getStatDateCST(input = new Date()) {
  const d = new Date(input);
  // Asia/Shanghai is UTC+8. Subtracting 8 hours from CST equals UTC+0!
  // Let's verify:
  //   CST 2026-11-25 07:59 => UTC 2026-11-24 23:59 => stat_date = 2026-11-24
  //   CST 2026-11-25 08:00 => UTC 2026-11-25 00:00 => stat_date = 2026-11-25
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Format Asia/Shanghai timestamp as "MM-DD HH:mm"
 */
export function formatCSTTime(input = new Date()) {
  const d = new Date(new Date(input).getTime() + 8 * 3600 * 1000);
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mi = String(d.getUTCMinutes()).padStart(2, "0");
  return `${mm}-${dd} ${hh}:${mi}`;
}

/**
 * Rule ④: 当日新增曝光 = 相邻快照非负差分
 */
export function computeViewsDelta(prevViews, currViews) {
  const prev = Number(prevViews) || 0;
  const curr = Number(currViews) || 0;
  return Math.max(0, curr - prev);
}

/**
 * Rule ③: 仅计本人原创和引用，不含纯转发和回复
 */
export function countOriginalPosts(tweets = []) {
  return tweets.filter((t) => !t.isRetweet && !t.isReply).length;
}

/**
 * Rule ⑦: 覆盖率低于阈值（默认 0.80）时返回 null，前端展示「无数据」而非 0
 */
export function applyCoverageGuard(value, coverageRatio, threshold = 0.8) {
  if (typeof coverageRatio !== "number" || coverageRatio < threshold) {
    return null;
  }
  return value;
}

/**
 * Rule ⑥: 新账号 48 小时观察期判定
 */
export function isAccountObserving(firstSeenAt, now = new Date()) {
  const elapsedMs = new Date(now).getTime() - new Date(firstSeenAt).getTime();
  return elapsedMs < 48 * 3600 * 1000;
}

/**
 * 海外榜爆款倍数：likes / followers，≥ 10 倍为低粉爆款
 */
export function computeBreakoutRatio(likes, followers) {
  const f = Math.max(1, Number(followers) || 1);
  const ratio = (Number(likes) || 0) / f;
  return ratio >= 10 ? Math.round(ratio) : Number(ratio.toFixed(2));
}

export function isLowFollowerBreakout(likes, followers) {
  return computeBreakoutRatio(likes, followers) >= 10;
}

/**
 * 黑马判定：默认 5000 粉以下
 */
export function isDarkHorse(followers, maxFollowers = 5000) {
  const f = Number(followers) || 0;
  return f > 0 && f < maxFollowers;
}
