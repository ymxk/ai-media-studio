/* ==========================================================================
   X榜单 Frontend Real-Time Data Client (Zero-Cost JSON + SWR Fallback)
   ========================================================================== */

(function () {
  const DEFAULT_DATA_URL = "./data/latest.json";

  const api = {
    sourceUrl: (window.XB_CONFIG && window.XB_CONFIG.DATA_URL) || DEFAULT_DATA_URL,
    lastSyncMeta: null,

    /**
     * Fetch latest synchronized dataset with graceful fallback to window.XB_DATA.
     * Supports cache-busting when user clicks manual refresh.
     */
    async loadLatest({ force = false } = {}) {
      const url = force ? `${this.sourceUrl}?t=${Date.now()}` : this.sourceUrl;
      try {
        const res = await fetch(url, { cache: force ? "no-store" : "default" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (json && json.meta && json.champions) {
          this.lastSyncMeta = {
            mode: json.meta.syncMode || "live-free-tier",
            updatedAt: json.meta.updatedAt,
            sources: json.meta.liveSources || []
          };
          return { ok: true, data: json, meta: this.lastSyncMeta };
        }
        throw new Error("Invalid snapshot schema");
      } catch (err) {
        return {
          ok: false,
          error: err.message,
          data: window.XB_DATA,
          meta: { mode: "offline-fallback", updatedAt: window.XB_DATA?.meta?.updatedAt, sources: [] }
        };
      }
    }
  };

  window.XBApi = api;
})();
