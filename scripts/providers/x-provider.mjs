/* ==========================================================================
   Free Provider 4: X Official oEmbed (Free, No API Key) + Pluggable Adapter
   ========================================================================== */

/**
 * Resolve a public X/Twitter post URL using X's official free oEmbed endpoint.
 * Zero API key required, 100% compliant.
 * @param {string} tweetUrl
 */
export async function resolveXOEmbed(tweetUrl, { timeoutMs = 8000 } = {}) {
  const endpoint = `https://publish.twitter.com/oembed?url=${encodeURIComponent(tweetUrl)}&omit_script=true`;
  const res = await fetch(endpoint, { signal: AbortSignal.timeout(timeoutMs) });
  if (!res.ok) throw new Error(`X oEmbed HTTP ${res.status}`);
  const data = await res.json();

  // Strip simple HTML tags from oEmbed blockquote for clean preview text
  const plainText = String(data.html || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return {
    authorName: data.author_name || "",
    authorUrl: data.author_url || "",
    handle: (data.author_url || "").split("/").pop() || "",
    text: plainText,
    url: data.url || tweetUrl,
    source: "X Official oEmbed"
  };
}

/**
 * Pluggable XDataProvider interface.
 * When upgrading later to X Official API v2 or a third-party provider,
 * set X_DATA_PROVIDER_URL and X_DATA_PROVIDER_KEY in environment variables.
 */
export async function fetchConfiguredXAccounts() {
  const baseUrl = process.env.X_DATA_PROVIDER_URL;
  const apiKey = process.env.X_DATA_PROVIDER_KEY;
  if (!baseUrl || !apiKey) {
    return { provider: "x-adapter", ok: false, skipped: true, reason: "未配置 X_DATA_PROVIDER_URL，保持免费零成本模式" };
  }

  const res = await fetch(`${baseUrl.replace(/\/$/, "")}/accounts`, {
    headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json" },
    signal: AbortSignal.timeout(10000)
  });
  if (!res.ok) throw new Error(`XDataProvider HTTP ${res.status}`);
  const payload = await res.json();
  return { provider: "x-adapter", ok: true, accounts: payload.accounts || [] };
}
