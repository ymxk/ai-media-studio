/* ==========================================================================
   X榜单 (xbangdan.com) Interactive Application Logic
   ========================================================================== */

(function () {
  let DATA = window.XB_DATA;

  /* ------------------------------------------------------------------------
     Persistent & UI State
     ------------------------------------------------------------------------ */
  const state = {
    route: "home",
    // Home
    homeTab: "today", // today | yesterday | 7d | records | history
    runnersExpanded: false,
    // Accounts
    accSort: "views",
    accTime: "今天",
    accCat: "全部",
    accRange: "全部",
    accDarkHorse: "全部",
    accOnlyStarred: false,
    accFrozenMode: false,
    // Posts
    postMode: "top", // top | rising
    postCat: "全部",
    postWindow: "24小时",
    // Global
    globalCat: "全部",
    globalSort: "likes",
    globalLang: "全部",
    globalOnlyBreakout: false,
    // Intel
    intelTopic: "全部",
    intelType: "全部",
    intelAuthor: "",
    // Daily
    dailyDateIdx: 0,
    // Persisted
    starred: new Set(JSON.parse(localStorage.getItem("xb_starred") || "[]")),
    votedIntel: new Set(JSON.parse(localStorage.getItem("xb_voted") || "[]")),
    user: JSON.parse(localStorage.getItem("xb_user") || "null"),
    feedbacks: JSON.parse(localStorage.getItem("xb_feedbacks") || JSON.stringify([
      { text: "希望能按 5000 粉以下筛选黑马博主，找对标号很方便！", time: "11-23", status: "已上线" },
      { text: "海外榜低粉爆款用颜色区分很直观，建议加一个展开原文。", time: "11-22", status: "已上线" }
    ]))
  };

  const DAILY_DATES = ["2026-11-25", "2026-11-24", "2026-11-23"];

  /* ------------------------------------------------------------------------
     Helpers
     ------------------------------------------------------------------------ */
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  function esc(str) {
    return String(str ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function fmtNum(n) {
    if (n === null || n === undefined || n === "--") return "--";
    if (typeof n === "string") return n;
    if (n >= 100000000) return (n / 100000000).toFixed(2) + "亿";
    if (n >= 10000) return (n / 10000).toFixed(1).replace(/\.0$/, "") + "万";
    return n.toLocaleString("zh-CN");
  }

  function initials(name) {
    const clean = String(name || "X").replace(/[^\u4e00-\u9fa5A-Za-z0-9]/g, "");
    return (clean[0] || "X").toUpperCase();
  }

  function colorFor(str) {
    const palette = ["#2563eb", "#0284c7", "#059669", "#d97706", "#dc2626", "#4f46e5", "#0d9488", "#ea580c", "#334155", "#db2777"];
    let h = 0;
    for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
    return palette[h % palette.length];
  }

  function saveStars() {
    localStorage.setItem("xb_starred", JSON.stringify(Array.from(state.starred)));
  }

  function showToast(msg) {
    const el = $("#toast");
    el.textContent = msg;
    el.classList.add("show");
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => el.classList.remove("show"), 2200);
  }

  function findAccount(handle) {
    return DATA.accounts.find((a) => a.handle.toLowerCase() === String(handle).toLowerCase());
  }

  /* ------------------------------------------------------------------------
     Modal Controller
     ------------------------------------------------------------------------ */
  function openModal(title, html, wide = false) {
    $("#modalTitle").textContent = title;
    $("#modalBody").innerHTML = html;
    $("#modalBox").classList.toggle("wide", wide);
    $("#modalBackdrop").classList.add("open");
    $("#modalBackdrop").setAttribute("aria-hidden", "false");
  }

  function closeModal() {
    $("#modalBackdrop").classList.remove("open");
    $("#modalBackdrop").setAttribute("aria-hidden", "true");
  }

  /* ------------------------------------------------------------------------
     Router
     ------------------------------------------------------------------------ */
  const VALID_ROUTES = ["home", "accounts", "posts", "global", "intel", "topics", "daily", "mcp"];

  function navigate(route, opts = {}) {
    if (!VALID_ROUTES.includes(route)) route = "home";
    state.route = route;
    if (opts.homeTab) state.homeTab = opts.homeTab;
    if (opts.accFrozenMode !== undefined) state.accFrozenMode = opts.accFrozenMode;
    if (opts.accDarkHorse !== undefined) state.accDarkHorse = opts.accDarkHorse;
    if (window.location.hash !== "#" + route) {
      history.pushState(null, "", "#" + route);
    }
    updateNavActive();
    render();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function updateNavActive() {
    $$(".nav-item, .mobile-nav-btn").forEach((el) => {
      el.classList.toggle("active", el.dataset.route === state.route);
    });
  }

  /* ------------------------------------------------------------------------
     View 1: HOME
     ------------------------------------------------------------------------ */
  function renderHome() {
    const m = DATA.meta;
    const isBoardTab = ["today", "yesterday", "7d"].includes(state.homeTab);
    const board = isBoardTab ? DATA.champions[state.homeTab] : null;

    return `
      <!-- Hero Card -->
      <section class="hero-card">
        <div class="hero-top">
          <div class="hero-title-wrap">
            <div class="hero-eyebrow">
              <span class="dot-live"></span>
              <span>已追踪 ${m.trackedAccounts.toLocaleString()} 个中文区活跃账号 · 页面更新于 ${m.updatedAt}</span>
            </div>
            <h1 class="hero-h1">X榜单，中文区博主的每日情报站</h1>
            <div class="hero-questions">
              <button class="quick-chip" data-jump="posts">昨天谁的推爆了？ <span class="chip-dest">推文榜 ›</span></button>
              <button class="quick-chip" data-jump="darkhorse">谁在闷声涨粉？ <span class="chip-dest">黑马榜 ›</span></button>
              <button class="quick-chip" data-jump="frozen">谁的号被封了？ <span class="chip-dest">冻结名单 ›</span></button>
              <button class="quick-chip" data-jump="global">海外昨天在聊什么？ <span class="chip-dest">海外榜 ›</span></button>
              <button class="quick-chip" data-jump="intel">今天有什么羊毛？ <span class="chip-dest">情报福利 ›</span></button>
            </div>
          </div>

          <div class="hero-stats">
            <div class="stat-box">
              <div class="stat-value num">${m.todayOriginalPosts.toLocaleString()}</div>
              <div class="stat-label">今日收录原创推文</div>
            </div>
            <div class="stat-box">
              <div class="stat-value num">${m.todayTotalViews}</div>
              <div class="stat-label">今日累计曝光</div>
            </div>
          </div>
        </div>

        <div class="hero-footer">
          <div class="hero-shortcuts">
            <span style="font-size:12px;color:var(--text-muted);font-weight:700;">今天先看：</span>
            <button class="shortcut-pill" data-jump="daily">📰 X 日报</button>
            <button class="shortcut-pill" data-jump="darkhorse">🐎 涨粉黑马</button>
            <button class="shortcut-pill" data-jump="frozen">🧊 冻结名单</button>
            <button class="shortcut-pill" data-jump="global">🌍 海外榜</button>
            <button class="shortcut-pill" data-jump="intel">⚡ 情报福利</button>
          </div>
          <button class="icon-btn" id="heroAddBtn">＋ 添加我的 / 对标账号</button>
        </div>
      </section>

      <!-- Champions Section -->
      <section>
        <div class="section-header">
          <div class="section-title-group">
            <h2 class="section-title">冠军榜</h2>
            <span class="section-sub">发帖 · 评论 · 涨粉 · 曝光</span>
          </div>

          <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
            <div class="segmented-tabs" role="tablist">
              <button class="seg-btn ${state.homeTab === "today" ? "active" : ""}" data-hometab="today">今日榜</button>
              <button class="seg-btn ${state.homeTab === "yesterday" ? "active" : ""}" data-hometab="yesterday">昨日榜</button>
              <button class="seg-btn ${state.homeTab === "7d" ? "active" : ""}" data-hometab="7d">7天榜</button>
              <button class="seg-btn ${state.homeTab === "records" ? "active" : ""}" data-hometab="records">纪录殿堂</button>
              <button class="seg-btn ${state.homeTab === "history" ? "active" : ""}" data-hometab="history">历史榜单</button>
            </div>
            ${isBoardTab ? `<button class="icon-btn" id="btnGenBoardImg">🖼️ 生成榜单图</button>` : ""}
          </div>
        </div>

        ${isBoardTab ? renderChampionsBoard(board) : ""}
        ${state.homeTab === "records" ? renderRecordsBoard() : ""}
        ${state.homeTab === "history" ? renderHistoryBoard() : ""}
      </section>
    `;
  }

  function renderChampionsBoard(board) {
    const cardsHtml = board.cards.map((c, idx) => `
      <article class="champion-card">
        <div class="champ-top">
          <span class="champ-dim"><span>${c.icon}</span> ${esc(c.dim)}</span>
          <span class="champ-streak ${c.isStreak ? "" : "new"}">${esc(c.badge)}</span>
        </div>

        <div class="champ-user" data-open-account="${esc(c.handle)}" data-fallback-name="${esc(c.name)}">
          <div class="avatar" style="background:${c.color}">${initials(c.name)}</div>
          <div class="user-meta">
            <div class="user-name">${esc(c.name)}</div>
            <div class="user-handle mono">@${esc(c.handle)}</div>
          </div>
        </div>

        <div class="champ-metric-main num">
          ${esc(c.mainVal)}<span class="champ-metric-unit">${esc(c.unit)}</span>
        </div>

        <div class="champ-submetrics">
          ${c.subs.map((s) => `
            <div class="sub-m">
              <span class="sub-m-val num">${esc(s.val)}</span>
              <span class="sub-m-lbl">${esc(s.lbl)}</span>
            </div>
          `).join("")}
        </div>

        <div class="champ-actions">
          <span style="font-size:11px;color:var(--text-muted);">${esc(board.label)}</span>
          <button class="mini-btn" data-share-champ="${idx}">生成分享卡</button>
        </div>
      </article>
    `).join("");

    const dims = [
      { key: "posts", label: "发帖榜 2–5 名", sort: "posts" },
      { key: "comments", label: "评论榜 2–5 名", sort: "comments" },
      { key: "followers", label: "涨粉榜 2–5 名", sort: "gain" },
      { key: "views", label: "曝光榜 2–5 名", sort: "views" }
    ];

    const runnersHtml = state.runnersExpanded ? `
      <div class="runners-grid">
        ${dims.map((d) => `
          <div class="runners-col">
            <div class="runners-col-head">
              <span>${d.label}</span>
              <button style="font-size:12px;color:var(--accent-blue);font-weight:600;" data-go-sort="${d.sort}">更多 ›</button>
            </div>
            <div class="runners-list">
              ${board.runners[d.key].map((r) => `
                <div class="runner-row" data-open-account="${esc(r.handle)}" data-fallback-name="${esc(r.name)}">
                  <div class="runner-left">
                    <span class="rank-num ${r.rank === 2 ? "top2" : r.rank === 3 ? "top3" : ""}">${r.rank}</span>
                    <div class="avatar avatar-xs" style="background:${colorFor(r.handle)}">${initials(r.name)}</div>
                    <span class="runner-name">${esc(r.name)}</span>
                  </div>
                  <span class="runner-val num">${esc(r.val)}</span>
                </div>
              `).join("")}
            </div>
          </div>
        `).join("")}
      </div>
    ` : "";

    return `
      <div class="champions-grid">${cardsHtml}</div>
      <div class="runners-toggle-wrap">
        <button class="runners-toggle-btn" id="btnToggleRunners">
          ${state.runnersExpanded ? "收起四榜第 2–5 名 ▴" : "查看四榜第 2–5 名（共 16 位）展开 ▾"}
        </button>
        ${runnersHtml}
      </div>
    `;
  }

  function renderRecordsBoard() {
    return `
      <div class="notice-bar">
        <span>🏛️</span>
        <span><strong>纪录殿堂</strong>：单日历史最高纪录 · 截至 2026-11-23（点击任意卡片可生成纪录分享卡）</span>
      </div>
      <div class="champions-grid">
        ${DATA.records.map((r, idx) => `
          <article class="champion-card record-card">
            <div class="champ-top">
              <span class="champ-dim">${r.icon} ${esc(r.dim)}</span>
              <span class="champ-streak">${esc(r.kept)}</span>
            </div>
            <div class="champ-user" data-open-account="${esc(r.handle)}" data-fallback-name="${esc(r.name)}">
              <div class="avatar" style="background:${r.color}">${initials(r.name)}</div>
              <div class="user-meta">
                <div class="user-name">${esc(r.name)}</div>
                <div class="user-handle mono">@${esc(r.handle)}</div>
              </div>
            </div>
            <div class="champ-metric-main num">${esc(r.val)}</div>
            <div class="champ-actions">
              <span style="font-size:12px;color:var(--text-secondary);">创造于 ${esc(r.date)}</span>
              <button class="mini-btn" data-share-record="${idx}">下载纪录卡</button>
            </div>
          </article>
        `).join("")}
      </div>
    `;
  }

  function renderHistoryBoard() {
    return `
      <div class="notice-bar">
        <span>📅</span>
        <span>每天四个维度的第一名 · 共收录 158 天历史数据（可上下滚动浏览，支持点击查看博主）</span>
      </div>
      <div class="history-list">
        ${DATA.history.map((h) => `
          <div class="history-row">
            <div class="history-date num">${esc(h.date)}<span class="history-year">${esc(h.year)}</span></div>
            ${renderHistoryCell("发帖", h.posts)}
            ${renderHistoryCell("评论", h.comments)}
            ${renderHistoryCell("涨粉", h.followers)}
            ${renderHistoryCell("曝光", h.views)}
          </div>
        `).join("")}
      </div>
    `;
  }

  function renderHistoryCell(label, cell) {
    const tag = cell.record
      ? `<span class="tag-record">破纪录</span>`
      : cell.first
      ? `<span class="tag-first">首次夺冠</span>`
      : "";
    return `
      <div class="history-cell" ${cell.handle ? `data-open-account="${esc(cell.handle)}" data-fallback-name="${esc(cell.user)}"` : ""}>
        <div class="history-cell-top"><span>${label}</span>${tag}</div>
        <div class="history-cell-val num">${esc(cell.val)}</div>
        <div class="history-cell-user">${esc(cell.user)}</div>
      </div>
    `;
  }

  /* ------------------------------------------------------------------------
     View 2: ACCOUNTS
     ------------------------------------------------------------------------ */
  function renderAccounts() {
    const sorts = [
      { k: "views", l: "推文曝光" },
      { k: "followers", l: "粉丝" },
      { k: "gain", l: "涨粉" },
      { k: "posts", l: "发帖" },
      { k: "comments", l: "评论" },
      { k: "avgViews7d", l: "帖均曝光" },
      { k: "peakPost", l: "最高单帖" }
    ];
    const times = ["今天", "昨日", "7天", "30天"];
    const cats = ["全部", "AI", "财经", "自媒体"];
    const ranges = ["全部", "1千以下", "1千-1万", "1万-10万", "10万-100万"];
    const darks = ["全部", "5000粉以下", "5000到1万粉"];

    const timeMultiplier = { "今天": 1, "昨日": 1.18, "7天": 6.4, "30天": 24.5 }[state.accTime] || 1;

    let list = DATA.accounts.slice();
    if (state.accCat !== "全部") list = list.filter((a) => a.cat === state.accCat);
    if (state.accRange === "1千以下") list = list.filter((a) => a.followers < 1000);
    if (state.accRange === "1千-1万") list = list.filter((a) => a.followers >= 1000 && a.followers < 10000);
    if (state.accRange === "1万-10万") list = list.filter((a) => a.followers >= 10000 && a.followers < 100000);
    if (state.accRange === "10万-100万") list = list.filter((a) => a.followers >= 100000);
    if (state.accDarkHorse === "5000粉以下") list = list.filter((a) => a.followers < 5000);
    if (state.accDarkHorse === "5000到1万粉") list = list.filter((a) => a.followers >= 5000 && a.followers <= 10000);
    if (state.accOnlyStarred) list = list.filter((a) => state.starred.has(a.handle));

    list.sort((a, b) => (b[state.accSort] || 0) - (a[state.accSort] || 0));

    return `
      <div class="section-header">
        <div class="section-title-group">
          <h1 class="section-title">${state.accFrozenMode ? "疑似冻结监测名单" : "账号榜"}</h1>
          <span class="section-sub">${state.accFrozenMode ? "自动监测近期失联或曾遭冻结的中文区账号" : "X 中文区账号多维数据排行"}</span>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          <button class="pill-btn ${state.accOnlyStarred && !state.accFrozenMode ? "active" : ""}" id="btnOnlyStarred">
            ★ 只看收藏 (${state.starred.size})
          </button>
          <button class="pill-btn warn ${state.accFrozenMode ? "active" : ""}" id="btnFrozenToggle">
            🧊 疑似冻结 (${DATA.frozenAccounts.length})
          </button>
        </div>
      </div>

      ${!state.accFrozenMode ? `
        <div class="filter-panel">
          <div class="filter-row">
            <span class="filter-label">排序</span>
            <div class="filter-pills">
              ${sorts.map((s) => `<button class="pill-btn ${state.accSort === s.k ? "active" : ""}" data-acc-sort="${s.k}">${s.l}</button>`).join("")}
            </div>
          </div>
          <div class="filter-row">
            <span class="filter-label">时间</span>
            <div class="filter-pills">
              ${times.map((t) => `<button class="pill-btn ${state.accTime === t ? "active" : ""}" data-acc-time="${t}">${t}</button>`).join("")}
            </div>
          </div>
          <div class="filter-row">
            <span class="filter-label">赛道</span>
            <div class="filter-pills">
              ${cats.map((c) => `<button class="pill-btn ${state.accCat === c ? "active" : ""}" data-acc-cat="${c}">${c}</button>`).join("")}
            </div>
          </div>
          <div class="filter-row">
            <span class="filter-label">粉丝</span>
            <div class="filter-pills">
              ${ranges.map((r) => `<button class="pill-btn ${state.accRange === r ? "active" : ""}" data-acc-range="${r}">${r}</button>`).join("")}
            </div>
          </div>
          <div class="filter-row">
            <span class="filter-label">黑马</span>
            <div class="filter-pills">
              ${darks.map((d) => `<button class="pill-btn ${state.accDarkHorse === d ? "active" : ""}" data-acc-dark="${d}">${d}</button>`).join("")}
            </div>
          </div>
        </div>

        <div class="notice-bar">
          <span>ℹ️</span>
          <span>提示：今日数据白天逐步更新，补齐后自动放开，先看昨日完整数据更准。点击任意账号可查看近 7 天走势与爆款推文。</span>
        </div>

        <div class="table-card">
          <div class="table-scroll">
            <table class="data-table">
              <thead>
                <tr>
                  <th style="width:48px;">#</th>
                  <th>账号</th>
                  <th>${state.accTime}推文曝光</th>
                  <th>粉丝 / ${state.accTime}涨粉</th>
                  <th>${state.accTime}发帖</th>
                  <th>${state.accTime}评论</th>
                  <th>7天帖均 / 最高单帖</th>
                  <th style="text-align:right;">操作</th>
                </tr>
              </thead>
              <tbody>
                ${list.length ? list.map((a, idx) => {
                  const viewsVal = Math.round(a.views * timeMultiplier);
                  const gainVal = Math.round(a.gain * timeMultiplier);
                  const postsVal = Math.round(a.posts * (state.accTime === "今天" || state.accTime === "昨日" ? 1 : timeMultiplier * 0.85));
                  const commentsVal = Math.round(a.comments * (state.accTime === "今天" || state.accTime === "昨日" ? 1 : timeMultiplier * 0.85));
                  const isStar = state.starred.has(a.handle);
                  return `
                    <tr>
                      <td class="num"><span class="rank-num ${idx === 0 ? "top1" : idx === 1 ? "top2" : idx === 2 ? "top3" : ""}">${idx + 1}</span></td>
                      <td>
                        <div class="cell-account" data-open-account="${esc(a.handle)}">
                          <div class="avatar avatar-sm" style="background:${a.color}">${initials(a.name)}</div>
                          <div>
                            <div class="cell-primary">${esc(a.name)} <span class="tag-cat">${esc(a.cat)}</span></div>
                            <div class="cell-sub mono">@${esc(a.handle)}</div>
                          </div>
                        </div>
                      </td>
                      <td class="num cell-primary">${fmtNum(viewsVal)}</td>
                      <td class="num">
                        <div class="cell-primary">${fmtNum(a.followers)}</div>
                        <div class="delta-pos">+${fmtNum(gainVal)}</div>
                      </td>
                      <td class="num">${postsVal}</td>
                      <td class="num">${commentsVal}</td>
                      <td class="num">
                        <div>${fmtNum(a.avgViews7d)}</div>
                        <div class="cell-sub">峰 ${fmtNum(a.peakPost)}</div>
                      </td>
                      <td style="text-align:right;white-space:nowrap;">
                        <button class="star-btn ${isStar ? "starred" : ""}" data-star="${esc(a.handle)}" title="${isStar ? "取消收藏" : "收藏账号"}">${isStar ? "★" : "☆"}</button>
                        <button class="mini-btn" data-open-account="${esc(a.handle)}">详情</button>
                      </td>
                    </tr>
                  `;
                }).join("") : `
                  <tr><td colspan="8" style="text-align:center;padding:42px;color:var(--text-muted);">
                    没有匹配的账号 — 换个筛选条件试试，或者 <button style="color:var(--accent-blue);font-weight:700;" id="emptyAddAcc">＋ 把它加进榜单</button>
                  </td></tr>
                `}
              </tbody>
            </table>
          </div>
        </div>
      ` : `
        <div class="table-card">
          <div class="table-scroll">
            <table class="data-table">
              <thead>
                <tr>
                  <th style="width:48px;">#</th>
                  <th>账号</th>
                  <th>冻结前粉丝</th>
                  <th>日均涨粉</th>
                  <th>日均发帖 / 评论</th>
                  <th>日均曝光</th>
                  <th>进名单日期</th>
                  <th>状态</th>
                </tr>
              </thead>
              <tbody>
                ${DATA.frozenAccounts.map((f) => `
                  <tr>
                    <td class="num">${f.rank}</td>
                    <td>
                      <div class="cell-account">
                        <div class="avatar avatar-sm" style="background:${colorFor(f.handle)}">${initials(f.name)}</div>
                        <div>
                          <div class="cell-primary">
                            ${esc(f.name)}
                            ${f.banCount > 1 ? `<span class="tag-frozen">封过 ${f.banCount} 次</span>` : ""}
                          </div>
                          <div class="cell-sub mono">@${esc(f.handle)}</div>
                        </div>
                      </div>
                    </td>
                    <td class="num cell-primary">${f.preFollowers.toLocaleString()}</td>
                    <td class="num delta-pos">${esc(f.dailyGain)}</td>
                    <td class="num">${esc(f.dailyPosts)} / ${f.dailyComments}</td>
                    <td class="num">${esc(f.dailyViews)}</td>
                    <td>
                      <div>${esc(f.listedDate)}</div>
                      <div class="cell-sub">${esc(f.lostDate)}</div>
                    </td>
                    <td>
                      <span class="${f.status.includes("已恢复") ? "tag-cat" : "tag-frozen"}">${esc(f.status)}</span>
                    </td>
                  </tr>
                `).join("")}
              </tbody>
            </table>
          </div>
        </div>
      `}
    `;
  }

  /* ------------------------------------------------------------------------
     View 3: POSTS
     ------------------------------------------------------------------------ */
  function renderPosts() {
    const cats = ["全部", "AI", "财经", "自媒体"];
    const windows = ["3小时内", "6小时内", "12小时内", "24小时"];
    const maxHours = { "3小时内": 3, "6小时内": 6, "12小时内": 12, "24小时": 24 }[state.postWindow];

    let list = DATA.posts.filter((p) => {
      if (state.postMode === "rising" && p.mode !== "rising") return false;
      if (state.postCat !== "全部" && p.cat !== state.postCat) return false;
      if (p.hoursAgo > maxHours) return false;
      return true;
    });

    if (state.postMode === "top") {
      list.sort((a, b) => b.views - a.views);
    }

    return `
      <div class="section-header">
        <div class="section-title-group">
          <h1 class="section-title">推文榜</h1>
          <span class="section-sub">X 中文区 24 小时爆款推文与增速黑马</span>
        </div>
        <div class="segmented-tabs">
          <button class="seg-btn ${state.postMode === "top" ? "active" : ""}" data-post-mode="top">🔥 曝光最高 (24h)</button>
          <button class="seg-btn ${state.postMode === "rising" ? "active" : ""}" data-post-mode="rising">⚡ 增速最快 (12h)</button>
        </div>
      </div>

      <!-- Hot Contributors -->
      <div class="contributor-strip">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;">
          <strong style="font-size:14px;">🏆 热门贡献榜（近 30 天每日曝光 Top 20 上榜次数）</strong>
          <span style="font-size:12px;color:var(--text-muted);">▲▼ 为较 7 天前名次变化</span>
        </div>
        <div class="contributor-list">
          ${DATA.postContributors.map((c) => `
            <div class="contrib-chip">
              <span class="contrib-rank">${c.rank <= 3 ? "TOP " + c.rank : "#" + c.rank}</span>
              <span style="font-weight:700;">${esc(c.name)}</span>
              <span class="contrib-count num">${esc(c.count)}</span>
              <span style="font-size:11px;color:${c.delta.startsWith("▲") ? "var(--accent-green)" : c.delta.startsWith("▼") ? "var(--accent-rose)" : "var(--text-muted)"};">${esc(c.delta)}</span>
            </div>
          `).join("")}
        </div>
      </div>

      <!-- Filters -->
      <div class="filter-panel">
        <div class="filter-row">
          <span class="filter-label">赛道</span>
          <div class="filter-pills">
            ${cats.map((c) => `<button class="pill-btn ${state.postCat === c ? "active" : ""}" data-post-cat="${c}">${c}</button>`).join("")}
          </div>
        </div>
        <div class="filter-row">
          <span class="filter-label">时间</span>
          <div class="filter-pills">
            ${windows.map((w) => `<button class="pill-btn ${state.postWindow === w ? "active" : ""}" data-post-win="${w}">${w}</button>`).join("")}
          </div>
        </div>
      </div>

      <div class="posts-grid">
        ${list.length ? list.map((p, idx) => `
          <article class="post-card">
            <div class="post-head">
              <div class="post-author" data-open-account="${esc(p.handle)}" data-fallback-name="${esc(p.author)}">
                <span class="rank-num ${idx < 3 ? "top" + (idx + 1) : ""}">${idx + 1}</span>
                <div class="avatar avatar-sm" style="background:${p.color}">${initials(p.author)}</div>
                <div class="user-meta">
                  <div class="user-name" style="font-size:14px;">${esc(p.author)} <span class="tag-cat">${esc(p.cat)}</span></div>
                  <div class="user-handle mono">@${esc(p.handle)} · ${p.hoursAgo} 小时前</div>
                </div>
              </div>
              <span class="badge-viral num">${state.postMode === "rising" ? p.speed : fmtNum(p.views) + " 曝光"}</span>
            </div>

            <p class="post-body">${esc(p.text)}</p>

            <div class="post-metrics">
              <div class="metric-group num">
                <span>❤️ ${fmtNum(p.likes)} 赞</span>
                <span>👁️ ${fmtNum(p.views)} 曝光</span>
                <span>⚡ ${esc(p.speed)}</span>
              </div>
              <a class="mini-btn" href="https://x.com/${esc(p.handle)}" target="_blank" rel="noopener">看原帖 ↗</a>
            </div>
          </article>
        `).join("") : `
          <div style="grid-column:1/-1;text-align:center;padding:48px;background:#fff;border-radius:16px;color:var(--text-muted);">
            当前筛选条件下暂无上榜推文，试着放宽时间窗口或切换赛道。
          </div>
        `}
      </div>
    `;
  }

  /* ------------------------------------------------------------------------
     View 4: GLOBAL
     ------------------------------------------------------------------------ */
  function renderGlobal() {
    const cats = ["全部", "AI", "币圈", "财经", "做号", "娱乐", "段子"];
    const langs = ["全部", "英文", "日语", "西语"];
    const sorts = [
      { k: "likes", l: "按点赞" },
      { k: "views", l: "按曝光" },
      { k: "ratio", l: "按倍数" },
      { k: "bookmarks", l: "按收藏" },
      { k: "retweets", l: "按转发" }
    ];

    let list = DATA.globalTweets.filter((t) => {
      if (state.globalCat !== "全部" && t.cat !== state.globalCat) return false;
      if (state.globalLang !== "全部" && t.lang !== state.globalLang) return false;
      if (state.globalOnlyBreakout && t.ratio < 10) return false;
      return true;
    });

    list.sort((a, b) => b[state.globalSort] - a[state.globalSort]);

    return `
      <div class="section-header">
        <div class="section-title-group">
          <h1 class="section-title">海外榜</h1>
          <span class="section-sub">全球最火推文 · 每天上午更新昨日（数据日期 11-24 UTC）</span>
        </div>
        <button class="pill-btn ${state.globalOnlyBreakout ? "active" : ""}" id="btnOnlyBreakout">
          ⚡ 只看低粉爆款 (≥10×)
        </button>
      </div>

      <div class="notice-bar" style="background:var(--accent-amber-soft);color:#92400e;border:1px solid rgba(245,158,11,0.28);">
        <span>💡</span>
        <span><strong>爆款倍数</strong> = 点赞 ÷ 粉丝数，≥ 10 倍以「浅黄底 + 左侧琥珀橙竖条 + 文字徽章」标出（红绿色盲友好）。点击「展开原文」可对照外语原帖。</span>
      </div>

      <div class="filter-panel">
        <div class="filter-row">
          <span class="filter-label">分类</span>
          <div class="filter-pills">
            ${cats.map((c) => `<button class="pill-btn ${state.globalCat === c ? "active" : ""}" data-g-cat="${c}">${c}</button>`).join("")}
          </div>
        </div>
        <div class="filter-row">
          <span class="filter-label">排序</span>
          <div class="filter-pills">
            ${sorts.map((s) => `<button class="pill-btn ${state.globalSort === s.k ? "active" : ""}" data-g-sort="${s.k}">${s.l}</button>`).join("")}
          </div>
        </div>
        <div class="filter-row">
          <span class="filter-label">语种</span>
          <div class="filter-pills">
            ${langs.map((l) => `<button class="pill-btn ${state.globalLang === l ? "active" : ""}" data-g-lang="${l}">${l}</button>`).join("")}
          </div>
        </div>
      </div>

      <div class="posts-grid">
        ${list.map((t, idx) => {
          const isBreakout = t.ratio >= 10;
          return `
            <article class="post-card ${isBreakout ? "breakout" : ""}">
              <div class="post-head">
                <div class="post-author">
                  <span class="rank-num ${idx < 3 ? "top" + (idx + 1) : ""}">${idx + 1}</span>
                  <div class="avatar avatar-sm" style="background:${t.color}">${initials(t.author)}</div>
                  <div class="user-meta">
                    <div class="user-name" style="font-size:14px;">${esc(t.author)}</div>
                    <div class="user-handle mono">@${esc(t.handle)} · ${esc(t.followers)}</div>
                  </div>
                </div>
                <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;justify-content:flex-end;">
                  ${isBreakout ? `<span class="badge-viral num">低粉爆款 ×${t.ratio}</span>` : `<span class="badge-lang num">×${t.ratio}</span>`}
                  <span class="badge-lang">${esc(t.lang)}</span>
                  <span class="badge-lang">${esc(t.media)}</span>
                </div>
              </div>

              <div class="post-body">
                <p>${esc(t.zh)}</p>
                <div class="post-original" id="orig-${t.rank}">${esc(t.orig)}</div>
              </div>

              <div class="post-metrics">
                <div class="metric-group num">
                  <span>❤️ ${fmtNum(t.likes)}</span>
                  <span>👁️ ${fmtNum(t.views)}</span>
                  <span>🔁 ${fmtNum(t.retweets)}</span>
                  <span>🔖 ${fmtNum(t.bookmarks)}</span>
                </div>
                <div style="display:flex;gap:6px;">
                  <button class="mini-btn" data-toggle-orig="orig-${t.rank}">展开原文</button>
                  <a class="mini-btn" href="https://x.com/${esc(t.handle)}" target="_blank" rel="noopener">原帖 ↗</a>
                </div>
              </div>
            </article>
          `;
        }).join("")}
      </div>
    `;
  }

  /* ------------------------------------------------------------------------
     View 5: INTEL (情报 · 福利)
     ------------------------------------------------------------------------ */
  function renderIntel() {
    const topics = ["全部", "效率工具", "AI 模型", "Agent", "API 额度", "云服务", "视频生成", "Claude Code", "开源工具", "ChatGPT"];
    const types = ["全部", "开源", "免费", "送额度", "折扣", "提醒", "限免"];

    let list = DATA.intelItems.filter((item) => {
      if (state.intelTopic !== "全部" && !item.topics.includes(state.intelTopic)) return false;
      if (state.intelType !== "全部" && item.type !== state.intelType) return false;
      if (state.intelAuthor && item.author !== state.intelAuthor) return false;
      return true;
    });

    const groups = ["今天", "昨天"];

    return `
      <div class="section-header">
        <div class="section-title-group">
          <h1 class="section-title">情报 · 福利</h1>
          <span class="section-sub">AI 从收录账号推文里筛出的开源、免费额度与折扣线索，请自行甄别</span>
        </div>
        <button class="icon-btn primary" id="btnSubmitIntel">＋ 投稿线索</button>
      </div>

      <div class="filter-panel">
        <div class="filter-row">
          <span class="filter-label">话题</span>
          <div class="filter-pills">
            ${topics.map((t) => `<button class="pill-btn ${state.intelTopic === t ? "active" : ""}" data-i-topic="${t}">${t}</button>`).join("")}
          </div>
        </div>
        <div class="filter-row">
          <span class="filter-label">类型</span>
          <div class="filter-pills">
            ${types.map((t) => `<button class="pill-btn ${state.intelType === t ? "active" : ""}" data-i-type="${t}">${t}</button>`).join("")}
          </div>
        </div>
        ${state.intelAuthor ? `
          <div class="filter-row">
            <span class="filter-label">来源</span>
            <div class="filter-pills">
              <button class="pill-btn active" id="btnClearIntelAuthor">${esc(state.intelAuthor)} ✕</button>
            </div>
          </div>
        ` : ""}
      </div>

      <div class="intel-layout">
        <div>
          ${groups.map((g) => {
            const items = list.filter((i) => i.group === g);
            if (!items.length) return "";
            return `
              <div class="intel-group-title">${g} · ${items.length} 条</div>
              ${items.map((it) => {
                const voted = state.votedIntel.has(it.id);
                return `
                  <article class="intel-card">
                    <div class="intel-tags">
                      <span class="intel-type ${it.typeClass}">${esc(it.type)}</span>
                      ${it.topics.map((tp) => `<span class="badge-lang">${esc(tp)}</span>`).join("")}
                    </div>
                    <h3 class="intel-title">${esc(it.title)}</h3>
                    <p class="intel-desc">${esc(it.desc)}</p>
                    <div class="intel-foot">
                      <span>来源：<strong>${esc(it.author)}</strong> · 发布 ${esc(it.pubTime)} · 上架 ${esc(it.listed)}</span>
                      <div style="display:flex;align-items:center;gap:8px;">
                        <button class="mini-btn" data-vote-intel="${it.id}" style="${voted ? "background:var(--bg-ink);color:#fff;" : ""}">
                          👍 <span class="num">${it.votes + (voted ? 1 : 0)}</span>
                        </button>
                        <button class="mini-btn" onclick="window.open('https://github.com','_blank')">去领取 ↗</button>
                      </div>
                    </div>
                  </article>
                `;
              }).join("")}
            `;
          }).join("") || `<div style="background:#fff;padding:42px;border-radius:14px;text-align:center;color:var(--text-muted);">当前筛选下暂无情报线索。</div>`}
        </div>

        <aside>
          <div class="sidebar-card">
            <h3 style="font-size:15px;font-weight:800;">情报速览</h3>
            <div class="sidebar-stats num">
              <div><div class="sidebar-stat-val">33</div><div class="sidebar-stat-lbl">今日上架</div></div>
              <div><div class="sidebar-stat-val">156</div><div class="sidebar-stat-lbl">本周上架</div></div>
              <div><div class="sidebar-stat-val">300</div><div class="sidebar-stat-lbl">累计线索</div></div>
            </div>
            <button class="btn-full" id="btnSubmitIntelSide">＋ 投稿一条线索</button>
          </div>

          <div class="sidebar-card">
            <h3 style="font-size:15px;font-weight:800;margin-bottom:10px;">🏅 情报贡献榜</h3>
            <p style="font-size:12px;color:var(--text-muted);margin-bottom:12px;">近 30 天上架条数，点击某位博主仅看 TA 的条目</p>
            <div class="runners-list">
              ${DATA.intelContributors.map((c) => `
                <div class="runner-row" data-filter-intel-author="${esc(c.name)}" style="${state.intelAuthor === c.name ? "background:var(--bg-subtle);" : ""}">
                  <div class="runner-left">
                    <span class="rank-num ${c.rank <= 3 ? "top" + c.rank : ""}">${c.rank}</span>
                    <span class="runner-name">${esc(c.name)}</span>
                  </div>
                  <span class="runner-val num">${esc(c.count)}</span>
                </div>
              `).join("")}
            </div>
          </div>
        </aside>
      </div>
    `;
  }

  /* ------------------------------------------------------------------------
     View 6: TOPICS (话题榜)
     ------------------------------------------------------------------------ */
  function renderTopics() {
    return `
      <div class="section-header">
        <div class="section-title-group">
          <h1 class="section-title">话题榜</h1>
          <span class="section-sub">过去 24 小时中文区讨论爆发最快的事件簇（按 24h 曝光排序）</span>
        </div>
      </div>

      <div class="topics-grid">
        ${DATA.topics.map((t) => `
          <article class="topic-card">
            <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
              <div style="display:flex;align-items:center;gap:8px;">
                <span class="rank-num ${t.rank <= 3 ? "top" + t.rank : ""}" style="font-size:15px;">#${t.rank}</span>
                <span class="badge-lang">${esc(t.cat)}</span>
              </div>
              <span class="topic-heat num">🔥 ${esc(t.burst)}</span>
            </div>
            <h2 style="font-size:17px;font-weight:800;line-height:1.35;">${esc(t.title)}</h2>
            <p style="font-size:13.5px;color:var(--text-secondary);line-height:1.6;">${esc(t.summary)}</p>
            <div class="post-metrics" style="margin-top:auto;">
              <div class="metric-group num">
                <span>👁️ <strong>${esc(t.views24h)}</strong> 24h 曝光</span>
                <span>👥 ${t.accountsCount} 个账号在聊</span>
                <span>📝 ${t.postsCount} 帖</span>
              </div>
              <button class="mini-btn" data-jump="posts">看相关推文 ›</button>
            </div>
          </article>
        `).join("")}
      </div>
    `;
  }

  /* ------------------------------------------------------------------------
     View 7: DAILY REPORT (X 日报)
     ------------------------------------------------------------------------ */
  function renderDaily() {
    const curDate = DAILY_DATES[state.dailyDateIdx];
    const ys = DATA.meta.yesterdaySummary;
    const yChamps = DATA.champions.yesterday;

    return `
      <div class="section-header">
        <div class="section-title-group">
          <h1 class="section-title">X 日报</h1>
          <span class="section-sub">每天 08:30 出刊 · 一页看完昨日中文区全部关键动态</span>
        </div>
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
          <button class="icon-btn" id="btnPrevDaily" ${state.dailyDateIdx >= DAILY_DATES.length - 1 ? "disabled style='opacity:0.45'" : ""}>‹ 上一期</button>
          <span class="icon-btn mono" style="cursor:default;font-weight:700;">${curDate}</span>
          <button class="icon-btn" id="btnNextDaily" ${state.dailyDateIdx <= 0 ? "disabled style='opacity:0.45'" : ""}>下一期 ›</button>
          <button class="icon-btn primary" id="btnGenDailyImg">🖼️ 生成日报长图</button>
        </div>
      </div>

      <article class="daily-paper">
        <div class="daily-masthead">
          <div>
            <div style="font-size:12px;font-weight:700;color:var(--text-muted);letter-spacing:0.08em;">𝕏 X榜单 · DAILY REPORT</div>
            <div class="daily-date-big num" style="margin-top:6px;">${curDate.slice(5).replace("-", ".")}</div>
          </div>
          <div style="text-align:right;">
            <div style="font-size:14px;font-weight:700;">${curDate} · 星期三</div>
            <div style="font-size:12px;color:var(--text-muted);">统计窗口 11/24 08:00 – 11/25 08:00</div>
          </div>
        </div>

        <p style="font-size:15px;line-height:1.7;color:var(--text-primary);">
          全站创作者昨日合计曝光 <strong class="num">${ys.totalViews}</strong>，发帖 <strong class="num">${ys.totalPosts.toLocaleString()}</strong> 条，净涨粉 <strong class="num">+${ys.netFollowers.toLocaleString()}</strong>。
          <strong>${esc(ys.topAccount.name)}</strong> 以单账号 <strong class="num">${ys.topAccount.views}</strong> 曝光拿下昨日曝光冠军并达成 <strong>${ys.topAccount.streak}</strong>；
          近 24 小时最爆单帖来自 <strong>${esc(ys.topPost.name)}</strong>，单帖曝光 <strong class="num">${ys.topPost.views}</strong>。
        </p>

        <div class="daily-summary-grid">
          <div class="stat-box"><div class="stat-value num">${ys.totalViews}</div><div class="stat-label">昨日全站曝光</div></div>
          <div class="stat-box"><div class="stat-value num">${ys.totalPosts.toLocaleString()}</div><div class="stat-label">昨日全站发帖</div></div>
          <div class="stat-box"><div class="stat-value num">${fmtNum(ys.totalComments)}</div><div class="stat-label">昨日全站评论</div></div>
          <div class="stat-box"><div class="stat-value num delta-pos">+${ys.netFollowers.toLocaleString()}</div><div class="stat-label">昨日全站涨粉</div></div>
        </div>

        <!-- 01 -->
        <div class="daily-section">
          <h2 style="font-size:17px;font-weight:800;margin-bottom:14px;"><span class="daily-sec-num">01</span> 昨日四冠军</h2>
          <div class="champions-grid">
            ${yChamps.cards.map((c) => `
              <div class="champion-card" style="box-shadow:none;background:var(--bg-page);">
                <div class="champ-dim">${c.icon} ${esc(c.dim)}</div>
                <div class="champ-user" data-open-account="${esc(c.handle)}" data-fallback-name="${esc(c.name)}">
                  <div class="avatar avatar-sm" style="background:${c.color}">${initials(c.name)}</div>
                  <div class="user-meta">
                    <div class="user-name" style="font-size:14px;">${esc(c.name)}</div>
                    <div class="user-handle mono">@${esc(c.handle)}</div>
                  </div>
                </div>
                <div class="champ-metric-main num" style="font-size:24px;">${esc(c.mainVal)}<span class="champ-metric-unit">${esc(c.unit)}</span></div>
              </div>
            `).join("")}
          </div>
        </div>

        <!-- 02 Track Gains -->
        <div class="daily-section">
          <h2 style="font-size:17px;font-weight:800;margin-bottom:14px;"><span class="daily-sec-num">02</span> 赛道涨粉榜 · 各 Top 3</h2>
          <div class="runners-grid" style="grid-template-columns:repeat(3,1fr);">
            ${Object.entries(DATA.dailyTrackGains).map(([track, rows]) => `
              <div class="runners-col" style="background:var(--bg-page);">
                <div class="runners-col-head"><span>${track} 赛道</span><span style="font-size:11px;color:var(--text-muted);">昨日涨粉</span></div>
                <div class="runners-list">
                  ${rows.map((r) => `
                    <div class="runner-row" data-open-account="${esc(r.handle)}" data-fallback-name="${esc(r.name)}">
                      <div class="runner-left">
                        <span class="rank-num top${r.rank}">${r.rank}</span>
                        <span class="runner-name">${esc(r.name)}</span>
                      </div>
                      <span class="delta-pos num">${esc(r.val)}</span>
                    </div>
                  `).join("")}
                </div>
              </div>
            `).join("")}
          </div>
        </div>

        <!-- 03 Topics & Dark Horses -->
        <div class="daily-section">
          <div class="posts-grid">
            <div>
              <h2 style="font-size:17px;font-weight:800;margin-bottom:12px;"><span class="daily-sec-num">03-A</span> 话题榜 · Top 5</h2>
              <div class="runners-list">
                ${DATA.topics.slice(0, 5).map((t) => `
                  <div class="runner-row" style="padding:9px 10px;background:var(--bg-page);border-radius:8px;">
                    <div class="runner-left" style="flex-direction:column;align-items:flex-start;gap:2px;">
                      <div style="font-size:13.5px;font-weight:700;">#${t.rank} ${esc(t.title)}</div>
                      <div style="font-size:11.5px;color:var(--text-muted);">${esc(t.burst)} · ${t.accountsCount} 个账号在聊</div>
                    </div>
                    <span class="runner-val num">${esc(t.views24h)}</span>
                  </div>
                `).join("")}
              </div>
            </div>

            <div>
              <h2 style="font-size:17px;font-weight:800;margin-bottom:12px;"><span class="daily-sec-num">03-B</span> 黑马榜 · Top 5（5000 粉以下）</h2>
              <div class="runners-list">
                ${DATA.dailyDarkHorses.map((d) => `
                  <div class="runner-row" data-open-account="${esc(d.handle)}" data-fallback-name="${esc(d.name)}" style="padding:9px 10px;background:var(--bg-page);border-radius:8px;">
                    <div class="runner-left">
                      <span class="rank-num ${d.rank <= 3 ? "top" + d.rank : ""}">${d.rank}</span>
                      <div>
                        <div style="font-size:13.5px;font-weight:700;">${esc(d.name)}</div>
                        <div style="font-size:11.5px;color:var(--text-muted);" class="mono">@${esc(d.handle)} · 粉丝 ${d.followers}</div>
                      </div>
                    </div>
                    <div style="text-align:right;">
                      <div class="runner-val num">${esc(d.avgViews)}</div>
                      <div style="font-size:11px;color:var(--text-muted);">7天帖均曝光</div>
                    </div>
                  </div>
                `).join("")}
              </div>
            </div>
          </div>
        </div>
      </article>
    `;
  }

  /* ------------------------------------------------------------------------
     View 8: MCP
     ------------------------------------------------------------------------ */
  function renderMcp() {
    const configJson = JSON.stringify({
      mcpServers: {
        xbangdan: {
          url: "https://mcp.xbangdan.com/sse",
          headers: {
            Authorization: "Bearer YOUR_XBANGDAN_API_KEY"
          }
        }
      }
    }, null, 2);

    return `
      <section class="mcp-hero">
        <div style="display:inline-block;padding:4px 10px;border-radius:999px;background:rgba(255,255,255,0.12);font-size:12px;font-weight:700;margin-bottom:12px;">
          X榜单 + AI MCP 服务
        </div>
        <h1 style="font-size:28px;font-weight:900;letter-spacing:-0.02em;">让你的 AI 直接在终端与 IDE 里查爆款</h1>
        <p>在 Claude Code、Cursor、Codex 或任意兼容 MCP 的客户端中，用自然语言实时查询中文区 24 小时爆款推文、对标账号 30 天走势、黑马博主与每日 AI 情报。</p>
        <div style="display:flex;gap:12px;margin-top:20px;flex-wrap:wrap;">
          <button class="icon-btn" id="btnCopyMcp" style="background:#fff;color:#0f1419;font-weight:700;">📋 复制 MCP 配置</button>
          <span style="display:inline-flex;align-items:center;font-size:13px;color:rgba(255,255,255,0.75);">· 10 个实时数据工具 · 12 万+ 去重内容</span>
        </div>
      </section>

      <div class="posts-grid" style="margin-bottom:22px;">
        <div class="sidebar-card" style="margin-bottom:0;">
          <h2 style="font-size:16px;font-weight:800;margin-bottom:10px;">快速接入配置 (JSON)</h2>
          <pre class="code-block" id="mcpCodeBlock">${esc(configJson)}</pre>
        </div>

        <div class="sidebar-card" style="margin-bottom:0;">
          <h2 style="font-size:16px;font-weight:800;margin-bottom:10px;">你可以这样向 AI 提问</h2>
          <div class="runners-list">
            <div style="padding:10px 12px;border-radius:8px;background:var(--bg-page);font-size:13px;">“帮我查一下今天 X 中文区 AI 赛道涨粉最多的前 5 个账号，总结他们的爆款共同点。”</div>
            <div style="padding:10px 12px;border-radius:8px;background:var(--bg-page);font-size:13px;">“拉取昨天海外榜中爆款倍数超过 20 倍的 AI 类推文，整理成中文选题灵感。”</div>
            <div style="padding:10px 12px;border-radius:8px;background:var(--bg-page);font-size:13px;">“查一下今天情报福利里有哪些新开源的 Agent 工具和免费 API 额度。”</div>
          </div>
        </div>
      </div>

      <h2 class="section-title" style="margin-bottom:12px;">10 个内置实时数据工具</h2>
      <div class="mcp-tools-grid">
        ${DATA.mcpTools.map((t, i) => `
          <div class="mcp-tool-card">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">
              <code class="mono" style="font-weight:700;font-size:13.5px;color:var(--accent-blue);">${esc(t.name)}</code>
              <span style="font-size:11px;color:var(--text-muted);" class="mono">#${String(i + 1).padStart(2, "0")}</span>
            </div>
            <p style="font-size:13px;color:var(--text-secondary);">${esc(t.desc)}</p>
          </div>
        `).join("")}
      </div>
    `;
  }

  /* ------------------------------------------------------------------------
     Account Detail Modal + SVG Sparkline
     ------------------------------------------------------------------------ */
  function openAccountModal(handle, fallbackName) {
    const acc = findAccount(handle) || {
      name: fallbackName || handle,
      handle,
      cat: "综合",
      color: colorFor(handle),
      views: 128000,
      followers: 9640,
      gain: 185,
      posts: 18,
      comments: 94,
      avgViews7d: 24600,
      peakPost: 412000,
      bio: "X 中文区收录活跃创作者，数据每小时自动追踪更新。",
      trend: [42, 58, 76, 69, 95, 118, 128]
    };

    const isStar = state.starred.has(acc.handle);
    const maxV = Math.max(...acc.trend, 1);
    const pts = acc.trend.map((v, i) => {
      const x = Math.round((i / (acc.trend.length - 1)) * 420 + 20);
      const y = Math.round(110 - (v / maxV) * 85);
      return [x, y];
    });
    const linePath = pts.map((p, i) => (i === 0 ? `M${p[0]},${p[1]}` : `L${p[0]},${p[1]}`)).join(" ");
    const areaPath = `${linePath} L440,120 L20,120 Z`;

    const relatedPosts = DATA.posts.filter((p) => p.handle.toLowerCase() === acc.handle.toLowerCase());

    openModal("账号数据详情", `
      <div style="display:flex;align-items:center;justify-content:space-between;gap:14px;flex-wrap:wrap;margin-bottom:16px;">
        <div style="display:flex;align-items:center;gap:12px;">
          <div class="avatar avatar-lg" style="background:${acc.color}">${initials(acc.name)}</div>
          <div>
            <div style="font-size:18px;font-weight:800;">${esc(acc.name)} <span class="tag-cat">${esc(acc.cat)}</span></div>
            <div class="mono" style="font-size:13px;color:var(--text-muted);">@${esc(acc.handle)}</div>
          </div>
        </div>
        <div style="display:flex;gap:8px;">
          <button class="icon-btn" id="modalStarBtn" data-star="${esc(acc.handle)}">${isStar ? "★ 已收藏" : "☆ 收藏账号"}</button>
          <a class="icon-btn primary" href="https://x.com/${esc(acc.handle)}" target="_blank" rel="noopener">打开 X 主页 ↗</a>
        </div>
      </div>

      <p style="font-size:13.5px;color:var(--text-secondary);margin-bottom:16px;">${esc(acc.bio)}</p>

      <div class="daily-summary-grid" style="margin:0 0 18px;">
        <div class="stat-box" style="padding:11px 12px;"><div class="stat-value num" style="font-size:19px;">${fmtNum(acc.followers)}</div><div class="stat-label">当前粉丝</div></div>
        <div class="stat-box" style="padding:11px 12px;"><div class="stat-value num delta-pos" style="font-size:19px;">+${fmtNum(acc.gain)}</div><div class="stat-label">今日涨粉</div></div>
        <div class="stat-box" style="padding:11px 12px;"><div class="stat-value num" style="font-size:19px;">${fmtNum(acc.views)}</div><div class="stat-label">今日曝光</div></div>
        <div class="stat-box" style="padding:11px 12px;"><div class="stat-value num" style="font-size:19px;">${fmtNum(acc.avgViews7d)}</div><div class="stat-label">7天帖均曝光</div></div>
      </div>

      <div style="background:var(--bg-page);border:1px solid var(--border-light);border-radius:12px;padding:14px 16px;margin-bottom:16px;">
        <div style="display:flex;justify-content:space-between;font-size:12px;font-weight:700;color:var(--text-secondary);margin-bottom:8px;">
          <span>近 7 天推文曝光走势（万）</span>
          <span class="num">峰值单帖：${fmtNum(acc.peakPost)}</span>
        </div>
        <svg viewBox="0 0 460 130" style="width:100%;height:auto;display:block;">
          <defs>
            <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#1d9bf0" stop-opacity="0.28" />
              <stop offset="100%" stop-color="#1d9bf0" stop-opacity="0.01" />
            </linearGradient>
          </defs>
          <path d="${areaPath}" fill="url(#sparkGrad)"></path>
          <path d="${linePath}" fill="none" stroke="#1d9bf0" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"></path>
          ${pts.map((p, i) => `
            <circle cx="${p[0]}" cy="${p[1]}" r="3.5" fill="#fff" stroke="#1d9bf0" stroke-width="2"></circle>
            <text x="${p[0]}" y="127" text-anchor="middle" font-size="10" fill="#8b98a5">D${i + 1}</text>
          `).join("")}
        </svg>
      </div>

      ${relatedPosts.length ? `
        <div style="font-size:13px;font-weight:800;margin-bottom:8px;">近期代表爆款推文</div>
        ${relatedPosts.map((p) => `
          <div style="padding:12px;border-radius:10px;border:1px solid var(--border-light);margin-bottom:8px;">
            <p style="font-size:13px;line-height:1.6;">${esc(p.text)}</p>
            <div style="margin-top:6px;font-size:12px;color:var(--text-muted);" class="num">👁️ ${fmtNum(p.views)} 曝光 · ❤️ ${fmtNum(p.likes)} 赞</div>
          </div>
        `).join("")}
      ` : ""}
    `, true);

    const starBtn = $("#modalStarBtn");
    if (starBtn) {
      starBtn.addEventListener("click", () => {
        toggleStar(acc.handle);
        const nowStar = state.starred.has(acc.handle);
        starBtn.textContent = nowStar ? "★ 已收藏" : "☆ 收藏账号";
      });
    }
  }

  /* ------------------------------------------------------------------------
     Canvas Share Card & Daily Report Image Generator
     ------------------------------------------------------------------------ */
  function openShareCanvasModal(title, drawFn, filename) {
    openModal(title, `
      <div class="canvas-preview-wrap">
        <canvas id="shareCanvas"></canvas>
      </div>
      <div style="display:flex;gap:10px;">
        <button class="btn-full" id="btnDownloadCanvas">⬇️ 下载 PNG 图片</button>
      </div>
    `, true);

    const canvas = $("#shareCanvas");
    drawFn(canvas);

    $("#btnDownloadCanvas").addEventListener("click", () => {
      const a = document.createElement("a");
      a.download = filename;
      a.href = canvas.toDataURL("image/png");
      a.click();
      showToast("图片已开始下载");
    });
  }

  function drawChampionCard(canvas, item, subtitle) {
    const w = 720, h = 420;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");

    ctx.fillStyle = "#0f1419";
    ctx.fillRect(0, 0, w, h);

    // Subtle accent bar
    ctx.fillStyle = item.color || "#1d9bf0";
    ctx.fillRect(0, 0, w, 8);

    ctx.fillStyle = "#94a3b8";
    ctx.font = "600 18px Inter, sans-serif";
    ctx.fillText(`𝕏 X榜单 · ${subtitle}`, 44, 58);

    ctx.fillStyle = "#f59e0b";
    ctx.font = "700 22px Inter, sans-serif";
    ctx.fillText(item.dim, 44, 108);

    ctx.fillStyle = "#ffffff";
    ctx.font = "800 38px Inter, sans-serif";
    ctx.fillText(item.name, 44, 162);

    ctx.fillStyle = "#94a3b8";
    ctx.font = "500 20px JetBrains Mono, monospace";
    ctx.fillText(`@${item.handle}`, 44, 198);

    ctx.fillStyle = "#ffffff";
    ctx.font = "900 68px Inter, sans-serif";
    ctx.fillText(`${item.mainVal || item.val}${item.unit || ""}`, 44, 296);

    ctx.fillStyle = "rgba(255,255,255,0.12)";
    ctx.fillRect(44, 336, w - 88, 1);

    ctx.fillStyle = "#94a3b8";
    ctx.font = "500 16px Inter, sans-serif";
    ctx.fillText("xbangdan.com · X 中文区博主的每日情报站", 44, 376);
  }

  function drawDailyLongCard(canvas) {
    const w = 760, h = 760;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = "#0f1419";
    ctx.fillRect(0, 0, w, 150);

    ctx.fillStyle = "#94a3b8";
    ctx.font = "700 16px Inter, sans-serif";
    ctx.fillText("𝕏 X榜单 · DAILY REPORT", 40, 48);

    ctx.fillStyle = "#ffffff";
    ctx.font = "900 40px Inter, sans-serif";
    ctx.fillText(`X 中文区日报 · ${DAILY_DATES[state.dailyDateIdx]}`, 40, 106);

    const ys = DATA.meta.yesterdaySummary;
    ctx.fillStyle = "#0f1419";
    ctx.font = "700 20px Inter, sans-serif";
    ctx.fillText(`全站曝光 ${ys.totalViews} · 发帖 ${ys.totalPosts.toLocaleString()} · 净涨粉 +${ys.netFollowers.toLocaleString()}`, 40, 200);

    ctx.fillStyle = "#536471";
    ctx.font = "700 16px Inter, sans-serif";
    ctx.fillText("01 昨日四维冠军", 40, 250);

    DATA.champions.yesterday.cards.forEach((c, i) => {
      const y = 274 + i * 74;
      ctx.fillStyle = "#f5f6f8";
      ctx.fillRect(40, y, w - 80, 60);
      ctx.fillStyle = "#0f1419";
      ctx.font = "700 18px Inter, sans-serif";
      ctx.fillText(`${c.dim}：${c.name} (@${c.handle})`, 58, y + 36);
      ctx.fillStyle = "#d97706";
      ctx.font = "800 22px Inter, sans-serif";
      ctx.textAlign = "right";
      ctx.fillText(`${c.mainVal}${c.unit}`, w - 58, y + 38);
      ctx.textAlign = "left";
    });

    ctx.fillStyle = "#536471";
    ctx.font = "700 16px Inter, sans-serif";
    ctx.fillText("02 热点话题 Top 3", 40, 600);

    DATA.topics.slice(0, 3).forEach((t, i) => {
      ctx.fillStyle = "#0f1419";
      ctx.font = "600 16px Inter, sans-serif";
      ctx.fillText(`${i + 1}. ${t.title}（${t.views24h} 曝光）`, 40, 634 + i * 30);
    });

    ctx.fillStyle = "#8b98a5";
    ctx.font = "500 14px Inter, sans-serif";
    ctx.fillText("xbangdan.com · 每天 08:30 出刊 · 数据来自 X 公开页面", 40, 736);
  }

  /* ------------------------------------------------------------------------
     Utility Modals (Methodology, Add Account, Feedback, Notices, Login)
     ------------------------------------------------------------------------ */
  function openMethodologyModal() {
    openModal("数据是怎么算的", `
      <div style="display:flex;flex-direction:column;gap:14px;">
        ${DATA.methodology.map((m) => `
          <div style="padding:12px 14px;border-radius:10px;background:var(--bg-page);border:1px solid var(--border-light);">
            <div style="font-weight:800;font-size:14px;margin-bottom:4px;">${m.num} ${esc(m.title)}</div>
            <p style="font-size:13px;color:var(--text-secondary);line-height:1.6;">${esc(m.body)}</p>
          </div>
        `).join("")}
        <p style="font-size:12px;color:var(--text-muted);text-align:center;">一切以 X 官方数据为准。发现数字对不上，欢迎点「建议反馈」告诉我们。</p>
      </div>
    `, true);
  }

  function openAddAccountModal() {
    openModal("推荐一个账号", `
      <p style="font-size:13.5px;color:var(--text-secondary);margin-bottom:14px;">
        榜上没有你想看的人？贴他的 @用户名 或 X 主页链接，审核通过就会上榜进入观察期。
      </p>
      <form id="addAccForm">
        <div class="form-field">
          <label class="form-label">X 用户名或主页链接 *</label>
          <input class="form-input" id="addAccHandle" placeholder="例如 @elonmusk 或 https://x.com/..." required />
        </div>
        <div class="form-field">
          <label class="form-label">所属赛道（选填）</label>
          <select class="form-input" id="addAccCat">
            <option value="AI">AI</option>
            <option value="财经">财经</option>
            <option value="自媒体">自媒体</option>
          </select>
        </div>
        <button type="submit" class="btn-full">提交推荐</button>
      </form>
    `);

    $("#addAccForm").addEventListener("submit", (e) => {
      e.preventDefault();
      const raw = $("#addAccHandle").value.trim().replace(/^https?:\/\/(x|twitter)\.com\//i, "").replace(/^@/, "").split("/")[0];
      if (!raw) return;
      if (!findAccount(raw)) {
        DATA.accounts.unshift({
          name: raw,
          handle: raw,
          cat: $("#addAccCat").value,
          color: colorFor(raw),
          views: 18400,
          followers: 1240,
          gain: 36,
          posts: 4,
          comments: 19,
          avgViews7d: 4600,
          peakPost: 28000,
          bio: "刚刚通过用户推荐收录的新账号，当前处于 2 天观察期。",
          trend: [2, 4, 6, 9, 12, 15, 18]
        });
      }
      closeModal();
      showToast(`已提交 @${raw}，已加入榜单观察期`);
      if (state.route === "accounts") render();
    });
  }

  function openFeedbackModal() {
    openModal("建议反馈", `
      <form id="feedbackForm" style="margin-bottom:18px;">
        <div class="form-field">
          <label class="form-label">哪里不好用、想要什么功能，直接说</label>
          <textarea class="form-textarea" id="fbText" rows="3" placeholder="输入你的建议或遇到的问题..." required></textarea>
        </div>
        <button type="submit" class="btn-full">提交建议</button>
      </form>
      <div style="font-size:13px;font-weight:800;margin-bottom:8px;">大家说过的</div>
      <div style="display:flex;flex-direction:column;gap:8px;">
        ${state.feedbacks.map((f) => `
          <div style="padding:10px 12px;border-radius:8px;background:var(--bg-page);font-size:13px;">
            <div>${esc(f.text)}</div>
            <div style="margin-top:4px;font-size:11px;color:var(--text-muted);">${esc(f.time)} · <span style="color:var(--accent-green);font-weight:700;">${esc(f.status)}</span></div>
          </div>
        `).join("")}
      </div>
    `);

    $("#feedbackForm").addEventListener("submit", (e) => {
      e.preventDefault();
      const txt = $("#fbText").value.trim();
      if (!txt) return;
      state.feedbacks.unshift({ text: txt, time: "刚刚", status: "已收到" });
      localStorage.setItem("xb_feedbacks", JSON.stringify(state.feedbacks));
      closeModal();
      showToast("感谢反馈，已记录到建议列表！");
    });
  }

  function openNoticeModal() {
    DATA.notices.forEach((n) => (n.unread = false));
    $("#noticeDot").style.display = "none";
    openModal("消息中心", `
      <div style="display:flex;flex-direction:column;gap:10px;">
        ${DATA.notices.map((n) => `
          <div style="padding:12px 14px;border-radius:10px;background:var(--bg-page);border:1px solid var(--border-light);">
            <div style="display:flex;justify-content:space-between;gap:8px;margin-bottom:4px;">
              <strong style="font-size:14px;">${esc(n.title)}</strong>
              <span style="font-size:11.5px;color:var(--text-muted);">${esc(n.time)}</span>
            </div>
            <p style="font-size:13px;color:var(--text-secondary);">${esc(n.desc)}</p>
          </div>
        `).join("")}
      </div>
    `);
  }

  function openLoginModal() {
    if (state.user) {
      openModal("个人中心", `
        <div style="padding:14px;border-radius:10px;background:var(--bg-page);margin-bottom:16px;">
          <div style="font-weight:800;font-size:15px;">${esc(state.user.email)}</div>
          <div style="font-size:12.5px;color:var(--text-secondary);margin-top:4px;">已收藏 ${state.starred.size} 个对标账号</div>
        </div>
        <div style="display:flex;gap:10px;">
          <button class="icon-btn" style="flex:1;justify-content:center;" id="btnGoStars">查看我的收藏</button>
          <button class="icon-btn" style="flex:1;justify-content:center;color:var(--accent-rose);" id="btnLogout">退出登录</button>
        </div>
      `);
      $("#btnGoStars").addEventListener("click", () => {
        state.accOnlyStarred = true;
        state.accFrozenMode = false;
        closeModal();
        navigate("accounts");
      });
      $("#btnLogout").addEventListener("click", () => {
        state.user = null;
        localStorage.removeItem("xb_user");
        updateLoginBtn();
        closeModal();
        showToast("已退出登录");
      });
      return;
    }

    openModal("登录 X榜单", `
      <p style="font-size:13px;color:var(--text-secondary);margin-bottom:14px;">
        登录后收藏的账号会跨设备同步，我们只保存邮箱用于同步收藏。
      </p>
      <form id="loginForm">
        <div class="form-field">
          <label class="form-label">邮箱地址</label>
          <input type="email" class="form-input" id="loginEmail" placeholder="you@example.com" required />
        </div>
        <button type="submit" class="btn-full">一键登录</button>
      </form>
    `);

    $("#loginForm").addEventListener("submit", (e) => {
      e.preventDefault();
      const email = $("#loginEmail").value.trim();
      if (!email) return;
      state.user = { email };
      localStorage.setItem("xb_user", JSON.stringify(state.user));
      updateLoginBtn();
      closeModal();
      showToast("登录成功");
    });
  }

  function updateLoginBtn() {
    const btn = $("#btnLogin");
    if (state.user) {
      btn.textContent = `★ ${state.starred.size} · 账号`;
    } else {
      btn.textContent = "登录";
    }
  }

  function toggleStar(handle) {
    if (state.starred.has(handle)) {
      state.starred.delete(handle);
      showToast("已取消收藏");
    } else {
      state.starred.add(handle);
      showToast("已收藏到对标列表");
    }
    saveStars();
    updateLoginBtn();
    if (state.route === "accounts") render();
  }

  /* ------------------------------------------------------------------------
     Global Search Dropdown
     ------------------------------------------------------------------------ */
  function setupSearch() {
    const input = $("#globalSearchInput");
    const drop = $("#searchDropdown");

    input.addEventListener("input", () => {
      const q = input.value.trim().toLowerCase();
      if (!q) {
        drop.classList.remove("open");
        return;
      }

      const accs = DATA.accounts.filter((a) => a.name.toLowerCase().includes(q) || a.handle.toLowerCase().includes(q)).slice(0, 4);
      const posts = DATA.posts.filter((p) => p.text.toLowerCase().includes(q) || p.author.toLowerCase().includes(q)).slice(0, 3);
      const intels = DATA.intelItems.filter((i) => i.title.toLowerCase().includes(q) || i.desc.toLowerCase().includes(q)).slice(0, 3);

      let html = "";
      if (accs.length) {
        html += `<div class="search-group-label">账号</div>` + accs.map((a) => `
          <div class="search-result-item" data-search-acc="${esc(a.handle)}">
            <div class="avatar avatar-xs" style="background:${a.color}">${initials(a.name)}</div>
            <div style="min-width:0;flex:1;">
              <div style="font-weight:700;font-size:13px;">${esc(a.name)}</div>
              <div class="mono" style="font-size:11px;color:var(--text-muted);">@${esc(a.handle)} · ${fmtNum(a.followers)} 粉</div>
            </div>
          </div>
        `).join("");
      }
      if (posts.length) {
        html += `<div class="search-group-label">推文</div>` + posts.map((p) => `
          <div class="search-result-item" data-search-route="posts">
            <div style="min-width:0;flex:1;">
              <div style="font-size:12.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(p.text)}</div>
              <div style="font-size:11px;color:var(--text-muted);">${esc(p.author)} · ${fmtNum(p.views)} 曝光</div>
            </div>
          </div>
        `).join("");
      }
      if (intels.length) {
        html += `<div class="search-group-label">情报福利</div>` + intels.map((i) => `
          <div class="search-result-item" data-search-route="intel">
            <div style="min-width:0;flex:1;">
              <div style="font-size:12.5px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(i.title)}</div>
              <div style="font-size:11px;color:var(--text-muted);">${esc(i.type)} · ${esc(i.author)}</div>
            </div>
          </div>
        `).join("");
      }

      if (!html) {
        html = `<div style="padding:18px;text-align:center;color:var(--text-muted);font-size:12.5px;">未找到“${esc(q)}”相关结果</div>`;
      }

      drop.innerHTML = html;
      drop.classList.add("open");
    });

    drop.addEventListener("click", (e) => {
      const accEl = e.target.closest("[data-search-acc]");
      if (accEl) {
        drop.classList.remove("open");
        openAccountModal(accEl.dataset.searchAcc);
        return;
      }
      const routeEl = e.target.closest("[data-search-route]");
      if (routeEl) {
        drop.classList.remove("open");
        navigate(routeEl.dataset.searchRoute);
      }
    });

    document.addEventListener("click", (e) => {
      if (!e.target.closest(".search-box")) drop.classList.remove("open");
    });
  }

  /* ------------------------------------------------------------------------
     Main Render & Delegated Event Binding
     ------------------------------------------------------------------------ */
  function render() {
    const root = $("#viewRoot");
    switch (state.route) {
      case "home": root.innerHTML = renderHome(); break;
      case "accounts": root.innerHTML = renderAccounts(); break;
      case "posts": root.innerHTML = renderPosts(); break;
      case "global": root.innerHTML = renderGlobal(); break;
      case "intel": root.innerHTML = renderIntel(); break;
      case "topics": root.innerHTML = renderTopics(); break;
      case "daily": root.innerHTML = renderDaily(); break;
      case "mcp": root.innerHTML = renderMcp(); break;
    }
    bindViewEvents();
  }

  function bindViewEvents() {
    const root = $("#viewRoot");

    // Quick jumps
    $$("[data-jump]", root).forEach((el) => {
      el.addEventListener("click", () => {
        const dest = el.dataset.jump;
        if (dest === "darkhorse") {
          state.accDarkHorse = "5000粉以下";
          state.accFrozenMode = false;
          navigate("accounts");
        } else if (dest === "frozen") {
          navigate("accounts", { accFrozenMode: true });
        } else {
          navigate(dest);
        }
      });
    });

    // Open account detail
    $$("[data-open-account]", root).forEach((el) => {
      el.addEventListener("click", () => {
        openAccountModal(el.dataset.openAccount, el.dataset.fallbackName);
      });
    });

    // Home tabs & runners
    $$("[data-hometab]", root).forEach((btn) => {
      btn.addEventListener("click", () => {
        state.homeTab = btn.dataset.hometab;
        render();
      });
    });

    const toggleRunners = $("#btnToggleRunners", root);
    if (toggleRunners) {
      toggleRunners.addEventListener("click", () => {
        state.runnersExpanded = !state.runnersExpanded;
        render();
      });
    }

    $$("[data-go-sort]", root).forEach((btn) => {
      btn.addEventListener("click", () => {
        state.accSort = btn.dataset.goSort;
        state.accFrozenMode = false;
        navigate("accounts");
      });
    });

    // Share cards
    $$("[data-share-champ]", root).forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const board = DATA.champions[state.homeTab];
        const item = board.cards[Number(btn.dataset.shareChamp)];
        openShareCanvasModal(
          `${item.dim} · 分享卡`,
          (c) => drawChampionCard(c, item, board.label),
          `xbangdan-${item.handle}.png`
        );
      });
    });

    $$("[data-share-record]", root).forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const item = DATA.records[Number(btn.dataset.shareRecord)];
        openShareCanvasModal(
          `${item.dim} · 殿堂纪录卡`,
          (c) => drawChampionCard(c, item, `纪录殿堂 · ${item.date}`),
          `xbangdan-record-${item.handle}.png`
        );
      });
    });

    const btnGenBoardImg = $("#btnGenBoardImg", root);
    if (btnGenBoardImg) {
      btnGenBoardImg.addEventListener("click", () => {
        openShareCanvasModal("榜单长图预览", drawDailyLongCard, `xbangdan-board-${DATA.meta.date}.png`);
      });
    }

    const heroAddBtn = $("#heroAddBtn", root);
    if (heroAddBtn) heroAddBtn.addEventListener("click", openAddAccountModal);

    // Accounts filters
    $$("[data-acc-sort]", root).forEach((b) => b.addEventListener("click", () => { state.accSort = b.dataset.accSort; render(); }));
    $$("[data-acc-time]", root).forEach((b) => b.addEventListener("click", () => { state.accTime = b.dataset.accTime; render(); }));
    $$("[data-acc-cat]", root).forEach((b) => b.addEventListener("click", () => { state.accCat = b.dataset.accCat; render(); }));
    $$("[data-acc-range]", root).forEach((b) => b.addEventListener("click", () => { state.accRange = b.dataset.accRange; state.accDarkHorse = "全部"; render(); }));
    $$("[data-acc-dark]", root).forEach((b) => b.addEventListener("click", () => { state.accDarkHorse = b.dataset.accDark; state.accRange = "全部"; render(); }));

    const btnOnlyStarred = $("#btnOnlyStarred", root);
    if (btnOnlyStarred) btnOnlyStarred.addEventListener("click", () => { state.accFrozenMode = false; state.accOnlyStarred = !state.accOnlyStarred; render(); });

    const btnFrozenToggle = $("#btnFrozenToggle", root);
    if (btnFrozenToggle) btnFrozenToggle.addEventListener("click", () => { state.accFrozenMode = !state.accFrozenMode; render(); });

    $$("[data-star]", root).forEach((b) => b.addEventListener("click", (e) => { e.stopPropagation(); toggleStar(b.dataset.star); }));
    const emptyAddAcc = $("#emptyAddAcc", root);
    if (emptyAddAcc) emptyAddAcc.addEventListener("click", openAddAccountModal);

    // Posts filters
    $$("[data-post-mode]", root).forEach((b) => b.addEventListener("click", () => { state.postMode = b.dataset.postMode; render(); }));
    $$("[data-post-cat]", root).forEach((b) => b.addEventListener("click", () => { state.postCat = b.dataset.postCat; render(); }));
    $$("[data-post-win]", root).forEach((b) => b.addEventListener("click", () => { state.postWindow = b.dataset.postWin; render(); }));

    // Global filters
    $$("[data-g-cat]", root).forEach((b) => b.addEventListener("click", () => { state.globalCat = b.dataset.gCat; render(); }));
    $$("[data-g-sort]", root).forEach((b) => b.addEventListener("click", () => { state.globalSort = b.dataset.gSort; render(); }));
    $$("[data-g-lang]", root).forEach((b) => b.addEventListener("click", () => { state.globalLang = b.dataset.gLang; render(); }));

    const btnOnlyBreakout = $("#btnOnlyBreakout", root);
    if (btnOnlyBreakout) btnOnlyBreakout.addEventListener("click", () => { state.globalOnlyBreakout = !state.globalOnlyBreakout; render(); });

    $$("[data-toggle-orig]", root).forEach((b) => {
      b.addEventListener("click", () => {
        const el = $("#" + b.dataset.toggleOrig);
        if (!el) return;
        const isOpen = el.classList.toggle("open");
        b.textContent = isOpen ? "收起原文" : "展开原文";
      });
    });

    // Intel filters & votes
    $$("[data-i-topic]", root).forEach((b) => b.addEventListener("click", () => { state.intelTopic = b.dataset.iTopic; render(); }));
    $$("[data-i-type]", root).forEach((b) => b.addEventListener("click", () => { state.intelType = b.dataset.iType; render(); }));
    $$("[data-filter-intel-author]", root).forEach((b) => b.addEventListener("click", () => {
      const a = b.dataset.filterIntelAuthor;
      state.intelAuthor = state.intelAuthor === a ? "" : a;
      render();
    }));
    const btnClearIntelAuthor = $("#btnClearIntelAuthor", root);
    if (btnClearIntelAuthor) btnClearIntelAuthor.addEventListener("click", () => { state.intelAuthor = ""; render(); });

    $$("[data-vote-intel]", root).forEach((b) => b.addEventListener("click", () => {
      const id = b.dataset.voteIntel;
      if (state.votedIntel.has(id)) state.votedIntel.delete(id);
      else state.votedIntel.add(id);
      localStorage.setItem("xb_voted", JSON.stringify(Array.from(state.votedIntel)));
      render();
    }));

    ["#btnSubmitIntel", "#btnSubmitIntelSide"].forEach((sel) => {
      const btn = $(sel, root);
      if (btn) btn.addEventListener("click", openFeedbackModal);
    });

    // Daily controls
    const prevD = $("#btnPrevDaily", root);
    if (prevD) prevD.addEventListener("click", () => { if (state.dailyDateIdx < DAILY_DATES.length - 1) { state.dailyDateIdx++; render(); } });
    const nextD = $("#btnNextDaily", root);
    if (nextD) nextD.addEventListener("click", () => { if (state.dailyDateIdx > 0) { state.dailyDateIdx--; render(); } });
    const genD = $("#btnGenDailyImg", root);
    if (genD) genD.addEventListener("click", () => {
      openShareCanvasModal("日报长图预览", drawDailyLongCard, `xbangdan-daily-${DAILY_DATES[state.dailyDateIdx]}.png`);
    });

    // MCP Copy
    const copyMcp = $("#btnCopyMcp", root);
    if (copyMcp) {
      copyMcp.addEventListener("click", () => {
        const text = $("#mcpCodeBlock").textContent;
        navigator.clipboard?.writeText(text).then(() => showToast("MCP 配置已复制到剪贴板")).catch(() => showToast("复制成功"));
      });
    }
  }

  /* ------------------------------------------------------------------------
     Bootstrap
     ------------------------------------------------------------------------ */
  async function syncLiveData({ force = false, silent = false } = {}) {
    const badge = $("#liveSourceBadge");
    if (!window.XBApi) return;
    if (badge) badge.textContent = "数据源：同步中...";

    const res = await window.XBApi.loadLatest({ force });
    DATA = res.data;
    if (res.ok) {
      const srcs = (res.meta.sources && res.meta.sources.length) ? res.meta.sources.join(" + ") : "快照";
      if (badge) badge.textContent = `实时源：${srcs} · ${res.meta.updatedAt || ""}`;
      if (!silent) showToast("已更新至最新实时快照");
    } else {
      if (badge) badge.textContent = "统计窗口：08:00 切天（本地兜底）";
      if (!silent) showToast("当前使用本地离线快照数据");
    }
    render();
  }

  function init() {
    // Global nav click handling
    $$("[data-route]").forEach((el) => {
      el.addEventListener("click", (e) => {
        e.preventDefault();
        navigate(el.dataset.route);
      });
    });

    // Header & footer utility buttons
    $("#btnAddAccount").addEventListener("click", openAddAccountModal);
    $("#btnAddAccountFoot").addEventListener("click", openAddAccountModal);
    $("#btnMethodologyTop").addEventListener("click", openMethodologyModal);
    $("#btnMethodologyFoot").addEventListener("click", openMethodologyModal);
    $("#btnFeedbackFoot").addEventListener("click", openFeedbackModal);
    $("#btnNotice").addEventListener("click", openNoticeModal);
    $("#btnLogin").addEventListener("click", openLoginModal);

    const btnRefresh = $("#btnRefreshData");
    if (btnRefresh) {
      btnRefresh.addEventListener("click", () => syncLiveData({ force: true, silent: false }));
    }

    // Modal close
    $("#modalClose").addEventListener("click", closeModal);
    $("#modalBackdrop").addEventListener("click", (e) => {
      if (e.target === $("#modalBackdrop")) closeModal();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeModal();
    });

    window.addEventListener("hashchange", () => {
      const r = window.location.hash.replace(/^#/, "") || "home";
      if (VALID_ROUTES.includes(r) && r !== state.route) {
        state.route = r;
        updateNavActive();
        render();
      }
    });

    setupSearch();
    updateLoginBtn();

    const initRoute = window.location.hash.replace(/^#/, "") || "home";
    state.route = VALID_ROUTES.includes(initRoute) ? initRoute : "home";
    updateNavActive();
    render();
    syncLiveData({ force: false, silent: true });
  }

  document.addEventListener("DOMContentLoaded", init);
})();
