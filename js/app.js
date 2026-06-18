// App State
const state = {
  currentPlayer: null,
  isAdmin: false,
  currentView: 'schedule',
  matches: {},
  players: [],
  slips: [],
  allSlips: [],
  // Lines + odds loaded from Sheet
  ahLines: {},
  ouLines: {},
  ahOddsH: {},
  ahOddsA: {},
  ouOddsO: {},
  ouOddsU: {},
};

function parsePicks(s) {
  if (s.picks && Array.isArray(s.picks)) return s;
  try { return { ...s, picks: JSON.parse(s.picks_json || '[]') }; } catch (e) { return { ...s, picks: [] }; }
}

// Check if match is locked (kickoff passed OR has score)
function isMatchLocked(match) {
  const thaiTime = etToThai(match.date);
  const timePassed = new Date() >= thaiTime;
  const result = state.matches[match.id];
  const hasScore = result && typeof result.team1_score === 'number' && typeof result.team2_score === 'number';
  return timePassed || hasScore;
}

// Format AH line: only show on the favorite side (negative = ต่อ)
function formatAhFav(line, isHome) {
  const num = parseFloat(line);
  if (isNaN(num) || num === 0) return '';
  if (num < 0) return isHome ? '' + num : '+' + Math.abs(num);
  return isHome ? '+' + num : '-' + num;
}

function getAllSlips() {
  return state.allSlips.length ? state.allSlips : (state.slips || []);
}

function getDisplayName(playerId) {
  if (!playerId) return '';
  const p = state.players.find(p => p.player_id === playerId);
  return p ? p.display_name : playerId;
}

const STATUS_CONFIG = {
  pending:   { color: 'var(--secondary)', th: 'รอผล',   en: 'Pending'  },
  approved:  { color: 'var(--accent)',    th: 'อนุมัติ', en: 'Approved' },
  won:       { color: 'var(--accent)',    th: 'ชนะ',    en: 'Won'      },
  lost:      { color: 'var(--secondary)', th: 'แพ้',    en: 'Lost'     },
  cancelled: { color: 'var(--text-muted)',th: 'ยกเลิก', en: 'Cancelled'},
};

function formatPickLabel(p, lang) {
  if (p.type === 'ou') return `${p.pick === 'over' ? 'สูง' : 'ต่ำ'} ${p.line || ''}`.trim();
  const m = state.matchById ? state.matchById[p.match_id] : MATCHES.find(x => x.id === p.match_id);
  const isHome = m ? p.pick === m.team1 : false;
  const picked = TEAMS[p.pick];
  const name = picked ? (lang === 'th' ? picked.nameTh : picked.name) : p.pick;
  const line = p.line ? formatAhFav(p.line, isHome) : '';
  return `${name}${line ? ' ' + line : ''}`;
}

// Build lines + odds from matches data (loaded from Sheet)
function buildLinesFromMatches() {
  state.ahLines = {};
  state.ouLines = {};
  state.ahOddsH = {};
  state.ahOddsA = {};
  state.ouOddsO = {};
  state.ouOddsU = {};
  state.matchById = {};
  MATCHES.forEach(m => { state.matchById[m.id] = m; });

  Object.values(state.matches).forEach(m => {
    if (m.ah_line) {
      state.ahLines[m.match_id] = String(m.ah_line);
      state.ahOddsH[m.match_id] = parseFloat(m.ah_odds_h) || 1.80;
      state.ahOddsA[m.match_id] = parseFloat(m.ah_odds_a) || 1.90;
    }
    if (m.ou_line) {
      state.ouLines[m.match_id] = String(m.ou_line);
      state.ouOddsO[m.match_id] = parseFloat(m.ou_odds_o) || 1.90;
      state.ouOddsU[m.match_id] = parseFloat(m.ou_odds_u) || 1.90;
    }
  });
}

// --- Router ---
function navigate(view) {
  state.currentView = view;
  document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
  const el = document.getElementById('view-' + view);
  if (el) {
    el.classList.remove('hidden');
    el.classList.remove('view-enter');
    void el.offsetWidth;
    el.classList.add('view-enter');
  }
  document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
  const activeTab = document.querySelector(`.nav-tab[href="#${view}"]`);
  if (activeTab) activeTab.classList.add('active');
  document.querySelectorAll('.btm-tab').forEach(t => t.classList.remove('active'));
  const activeBtm = document.querySelector(`.btm-tab[href="#${view}"]`);
  if (activeBtm) activeBtm.classList.add('active');
  renderCurrentView();
  window.scrollTo(0, 0);
}

async function renderCurrentView() {
  switch (state.currentView) {
    case 'schedule': renderSchedule(); break;
    case 'bet': renderBetting(); break;
    case 'summary': await renderSummaryLazy(); break;
  }
}

async function renderSummaryLazy() {
  const container = document.getElementById('view-summary');
  if (!state.allSlips.length && API_BASE_URL && !state._fetchingAllSlips) {
    state._fetchingAllSlips = true;
    let sk = '';
    for (let i = 0; i < 4; i++) {
      sk += `<div class="skeleton-card"><div class="skeleton-line" style="height:18px;width:${40 + i * 10}%"></div><div class="skeleton-line" style="height:12px;width:60%"></div><div class="skeleton-line" style="height:12px;width:80%"></div></div>`;
    }
    container.innerHTML = sk;
    try {
      const allSlips = await fetchAPI('allslips');
      if (allSlips) state.allSlips = allSlips;
    } finally {
      state._fetchingAllSlips = false;
    }
  }
  renderSummary();
}

// --- Toast ---
function showToast(msg, duration) {
  duration = duration || 3000;
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.remove('hidden', 'toast-out');
  void toast.offsetWidth; // force reflow to restart animation
  clearTimeout(toast._hideTimer);
  toast._hideTimer = setTimeout(() => {
    toast.classList.add('toast-out');
    setTimeout(() => { toast.classList.add('hidden'); toast.classList.remove('toast-out'); }, 260);
  }, duration);
}

// --- Badge (admin: pending approve count) ---
function updateTabBadges() {
  const count = (state.isAdmin && state.allSlips.length)
    ? state.allSlips.filter(s => {
        if (s.player === state.currentPlayer) return false;
        const resolved = typeof resolveSlip === 'function' ? resolveSlip(s) : { status: s.status };
        const st = resolved.status;
        return (st === 'won' || st === 'lost') && s.status !== 'approved' && s.status !== 'cancelled';
      }).length
    : 0;
  document.querySelectorAll('.bet-badge').forEach(b => {
    if (count > 0) { b.textContent = count; b.classList.remove('hidden'); }
    else b.classList.add('hidden');
  });
}

// --- Loading ---
function showLoading() { document.getElementById('loading').classList.remove('hidden'); }
function hideLoading() { document.getElementById('loading').classList.add('hidden'); }

// --- Init ---
function init() {
  console.log('init() called');
  const debugEl = document.getElementById('debug-msg');
  if (debugEl) debugEl.remove();

  const savedPlayer = sessionStorage.getItem('wc2026_player');
  if (savedPlayer) state.currentPlayer = savedPlayer;
  if (sessionStorage.getItem('wc2026_admin') === 'true') state.isAdmin = true;

  window.addEventListener('hashchange', () => {
    const hash = location.hash.slice(1) || 'schedule';
    navigate(hash);
  });

  document.getElementById('lang-toggle').addEventListener('click', toggleLang);
  document.getElementById('lang-toggle').textContent = currentLang.toUpperCase();

  applyTranslations();
  updateAdminUI();

  // Load cached matches + players for instant first render
  try {
    const cm = JSON.parse(localStorage.getItem('wc2026_matches') || 'null');
    if (cm && Date.now() - cm.t < 10 * 60 * 1000) {
      cm.d.forEach(m => { state.matches[m.match_id] = m; });
      buildLinesFromMatches();
    }
    const cp = JSON.parse(localStorage.getItem('wc2026_players') || 'null');
    if (cp && Date.now() - cp.t < 60 * 60 * 1000) {
      state.players = cp.d;
    }
  } catch(e) {}

  // Show immediately with hardcoded + cached data — don't wait for API
  const hash = location.hash.slice(1) || 'schedule';
  navigate(hash);

  // Fetch API data in background, then re-render
  refreshData().then(() => {
    buildLinesFromMatches();
    updateTabBadges();
    renderCurrentView();
  }).catch(e => {
    console.error('refreshData error:', e);
    showToast(currentLang === 'th' ? 'โหลดข้อมูลไม่ได้ — ใช้ข้อมูลเก่า' : 'Offline — showing cached data', 5000);
  });

}

async function refreshData() {
  if (typeof API_BASE_URL === 'undefined' || !API_BASE_URL) return;
  try {
    // Build all API calls — fire in parallel
    const calls = {
      matches: fetchAPI('matches'),
      players: fetchAPI('players'),
      allSlips: fetchAPI('allslips'),
    };
    if (state.currentPlayer) {
      calls.slips = fetchAPI('slips&player=' + state.currentPlayer);
    }

    const results = await Promise.all(Object.values(calls));
    const keys = Object.keys(calls);
    const data = {};
    keys.forEach((k, i) => { data[k] = results[i]; });

    if (data.matches) {
      data.matches.forEach(m => { state.matches[m.match_id] = m; });
      try { localStorage.setItem('wc2026_matches', JSON.stringify({ t: Date.now(), d: data.matches })); } catch(e) {}
    }
    if (data.players) {
      state.players = data.players;
      try { localStorage.setItem('wc2026_players', JSON.stringify({ t: Date.now(), d: data.players })); } catch(e) {}
    }
    if (data.slips) {
      state.slips = data.slips.map(parsePicks);
    }
    if (data.allSlips) {
      state.allSlips = data.allSlips.map(parsePicks);
    }
  } catch (e) {
    console.warn('API unavailable, using cached data', e);
  }
}

async function manualRefresh() {
  const btn = document.getElementById('refresh-btn');
  btn.disabled = true;
  btn.textContent = '…';
  showLoading();
  try {
    await refreshData();
    buildLinesFromMatches();
    await renderCurrentView();
    updateTabBadges();
    showToast(currentLang === 'th' ? 'อัปเดตแล้ว' : 'Updated');
  } catch(e) {
    showToast(currentLang === 'th' ? 'โหลดไม่ได้ ลองใหม่อีกครั้ง' : 'Failed to load, try again', 5000);
  } finally {
    btn.disabled = false;
    btn.textContent = '↻';
    hideLoading();
  }
}

// --- Start ---
document.addEventListener('DOMContentLoaded', init);

function updateAdminUI() {
  document.querySelectorAll('.admin-only').forEach(el => {
    if (state.isAdmin) el.classList.remove('hidden');
    else el.classList.add('hidden');
  });
}
