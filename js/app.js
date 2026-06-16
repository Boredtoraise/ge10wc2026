// App State
const state = {
  currentPlayer: null,
  isAdmin: false,
  currentView: 'schedule',
  predictions: {},
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
  if (num === 0) return '';
  if (num < 0 && isHome) return '' + num;
  if (num > 0 && !isHome) return '-' + num;
  return '';
}

// Build lines + odds from matches data (loaded from Sheet)
function buildLinesFromMatches() {
  state.ahLines = {};
  state.ouLines = {};
  state.ahOddsH = {};
  state.ahOddsA = {};
  state.ouOddsO = {};
  state.ouOddsU = {};

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
    // case 'predict': renderPredictions(); break;
    case 'bet': renderBetting(); break;
    case 'admin': renderAdmin(); break;
    case 'summary': await renderSummaryLazy(); break;
  }
}

async function renderSummaryLazy() {
  const container = document.getElementById('view-summary');
  container.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text-muted)">' + (currentLang === 'th' ? 'กำลังโหลด...' : 'Loading...') + '</div>';
  if (!state.allSlips.length && API_BASE_URL) {
    const allSlips = await fetchAPI('allslips');
    if (allSlips) state.allSlips = allSlips;
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

  const cached = localStorage.getItem('wc2026_predictions');
  if (cached) {
    try {
      const parsed = JSON.parse(cached);
      // Migrate old format (keyed by match_id) to new format (keyed by match_id:player)
      if (parsed && typeof parsed === 'object') {
        const needsMigration = Object.keys(parsed).some(k => !k.includes(':'));
        if (needsMigration) {
          // Clear old cache — will reload from API
          state.predictions = {};
          localStorage.removeItem('wc2026_predictions');
        } else {
          state.predictions = parsed;
        }
      }
    } catch(e) {}
  }

  window.addEventListener('hashchange', () => {
    const hash = location.hash.slice(1) || 'schedule';
    navigate(hash);
  });

  document.getElementById('lang-toggle').addEventListener('click', toggleLang);
  document.getElementById('lang-toggle').textContent = currentLang.toUpperCase();

  applyTranslations();
  updateAdminUI();

  // Show immediately with hardcoded data — don't wait for API
  const hash = location.hash.slice(1) || 'schedule';
  navigate(hash);

  // Fetch API data in background, then re-render
  refreshData().then(() => {
    buildLinesFromMatches();
    updateTabBadges();
    renderCurrentView();
  }).catch(e => {
    console.error('refreshData error:', e);
  });

  // Swipe left/right to change tab
  (function initSwipe() {
    let startX = 0;
    const tabOrder = ['schedule', 'bet', 'summary'];
    const app = document.getElementById('app');
    app.addEventListener('touchstart', e => { startX = e.touches[0].clientX; }, { passive: true });
    app.addEventListener('touchend', e => {
      const dx = e.changedTouches[0].clientX - startX;
      if (Math.abs(dx) < 60) return;
      const idx = tabOrder.indexOf(state.currentView);
      if (dx < 0 && idx < tabOrder.length - 1) navigate(tabOrder[idx + 1]);
      if (dx > 0 && idx > 0) navigate(tabOrder[idx - 1]);
    }, { passive: true });
  })();
}

async function refreshData() {
  if (typeof API_BASE_URL === 'undefined' || !API_BASE_URL) return;
  try {
    // Build all API calls — fire in parallel
    const calls = {
      matches: fetchAPI('matches'),
      players: fetchAPI('players'),
    };
    if (state.currentPlayer) {
      calls.preds = fetchAPI('allpredictions');
      calls.slips = fetchAPI('slips&player=' + state.currentPlayer);
      calls.allSlips = fetchAPI('allslips');
    }

    const results = await Promise.all(Object.values(calls));
    const keys = Object.keys(calls);
    const data = {};
    keys.forEach((k, i) => { data[k] = results[i]; });

    if (data.matches) {
      data.matches.forEach(m => { state.matches[m.match_id] = m; });
    }
    if (data.players) {
      state.players = data.players;
    }
    if (data.preds) {
      state.predictions = {};
      data.preds.forEach(p => {
        const key = p.match_id + ':' + (p.player_id || p.player);
        state.predictions[key] = p;
      });
      localStorage.setItem('wc2026_predictions', JSON.stringify(state.predictions));
    }
    if (data.slips) {
      state.slips = data.slips;
    }
    if (data.allSlips) {
      state.allSlips = data.allSlips;
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
    state.allSlips = [];
    await renderCurrentView();
    updateTabBadges();
    showToast(currentLang === 'th' ? 'อัปเดตแล้ว' : 'Updated');
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
