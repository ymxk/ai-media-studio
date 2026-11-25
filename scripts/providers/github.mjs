/* ==========================================================================
   Free Provider 1: GitHub Public Search API (Trending AI & Open-Source Intel)
   ========================================================================== */

const TOPIC_MAP = [
  { kw: ["agent", "mcp", "claude", "codex", "workflow"], topic: "Agent" },
  { kw: ["llm", "model", "vllm", "inference", "qwen", "deepseek", "gemini"], topic: "AI 模型" },
  { kw: ["video", "comfyui", "diffusion", "sora"], topic: "视频生成" },
  { kw: ["cli", "terminal", "rust", "tool", "editor"], topic: "效率工具" }
];

function inferTopics(repo) {
  const text = `${repo.name} ${repo.description || ""} ${(repo.topics || []).join(" ")}`.toLowerCase();
  const matched = [];
  for (const rule of TOPIC_MAP) {
    if (rule.kw.some((k) => text.includes(k))) matched.push(rule.topic);
  }
  return matched.length ? matched.slice(0, 2) : ["开源工具"];
}

export async function fetchGitHubIntel({ limit = 10, timeoutMs = 8000 } = {}) {
  const since = new Date(Date.now() - 7 * 86400 * 1000).toISOString().slice(0, 10);
  const url = `https://api.github.com/search/repositories?q=created:>${since}+stars:>50&sort=stars&order=desc&per_page=${limit}`;

  const headers = {
    Accept: "application/vnd.github+json",
    "User-Agent": "xbangdan-free-sync/1.0"
  };
  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  const res = await fetch(url, { headers, signal: AbortSignal.timeout(timeoutMs) });
  if (!res.ok) throw new Error(`GitHub API HTTP ${res.status}`);
  const data = await res.json();

  const items = (data.items || []).map((repo, idx) => {
    const pub = new Date(repo.created_at);
    const mm = String(pub.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(pub.getUTCDate()).padStart(2, "0");
    const hh = String(pub.getUTCHours()).padStart(2, "0");
    const mi = String(pub.getUTCMinutes()).padStart(2, "0");
    return {
      id: `gh-${repo.id}`,
      group: idx < 6 ? "今天" : "昨天",
      type: "开源",
      typeClass: "opensource",
      topics: inferTopics(repo),
      title: `${repo.full_name}（★ ${repo.stargazers_count.toLocaleString()}）`,
      desc: repo.description || "GitHub 近期高星开源项目，点击直达仓库查看源码与文档。",
      author: repo.owner?.login || "GitHub",
      pubTime: `${mm}-${dd} ${hh}:${mi}`,
      listed: `${mm}-${dd}`,
      votes: Math.min(999, Math.max(12, Math.round(repo.stargazers_count / 25))),
      url: repo.html_url,
      source: "GitHub API"
    };
  });

  return { provider: "github", ok: true, count: items.length, items };
}
