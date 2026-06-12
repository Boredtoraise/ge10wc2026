// Predictions — ทายผลสกอร์ (คะแนนแข่งกัน)

function renderPredictions() {
  const container = document.getElementById('view-predict');
  const lang = currentLang;

  if (!state.currentPlayer) {
    renderLoginForm(container);
    return;
  }

  let html = '';

  // User bar
  html += `<div class="user-bar">`;
  html += `<span class="user-name">${state.currentPlayer}</span>`;
  html += `<button class="logout-btn" id="logout-btn">${t('logout')}</button>`;
  html += `</div>`;

  // Separate matches: open vs locked
  const openMatches = [];
  const lockedMatches = [];

  MATCHES.forEach(m => {
    // Only show EPL matches for now
    if (m.stage !== 'epl') return;
    if (isMatchLocked(m)) {
      const key = m.id + ':' + state.currentPlayer;
      const pred = state.predictions[key];
      if (pred) {
        lockedMatches.push(m);
      }
    } else {
      openMatches.push(m);
    }
  });

  openMatches.sort((a, b) => etToThai(a.date) - etToThai(b.date));

  html += `<h2 style="font-size:1rem;margin-bottom:8px">${t('predict.title')}</h2>`;

  // Scoring rules
  html += `<div class="card" style="padding:10px;margin-bottom:12px;font-size:0.8rem;line-height:1.6">`;
  html += `<div style="display:flex;justify-content:space-between;align-items:center;cursor:pointer" id="predict-rules-toggle">`;
  html += `<span style="font-weight:600">${lang === 'th' ? 'เกณฑ์ให้คะแนน' : 'Scoring Rules'}</span>`;
  html += `<span style="color:var(--text-muted);font-size:0.7rem">▼</span>`;
  html += `</div>`;
  html += `<div id="predict-rules-body" style="margin-top:8px">`;
  html += `<table style="width:100%;border-collapse:collapse">`;
  html += `<tr style="border-bottom:1px solid var(--border)"><td style="padding:4px 0">${lang === 'th' ? '🎯 ทายสกอร์ตรงเป๊ะ' : '🎯 Exact score'}</td><td style="text-align:right;font-weight:700;color:var(--accent)">3 ${lang === 'th' ? 'คะแนน' : 'pts'}</td></tr>`;
  html += `<tr style="border-bottom:1px solid var(--border)"><td style="padding:4px 0">${lang === 'th' ? '➡️ ทายทิศทางถูก (ชนะ/เสมอ/แพ้)' : '➡️ Correct direction'}</td><td style="text-align:right;font-weight:700;color:var(--correct)">1 ${lang === 'th' ? 'คะแนน' : 'pt'}</td></tr>`;
  html += `<tr><td style="padding:4px 0">${lang === 'th' ? '❌ ทายผิด' : '❌ Wrong'}</td><td style="text-align:right;font-weight:700">0</td></tr>`;
  html += `</table>`;
  html += `</div></div>`;

  if (openMatches.length === 0) {
    html += `<div style="text-align:center;padding:30px;color:var(--text-muted)">${t('predict.no_open')}</div>`;
  } else {
    openMatches.forEach(m => {
      html += renderScoreCard(m);
    });

    html += `<button class="btn btn-primary" id="save-predictions" style="margin-top:8px">${t('predict.save')}</button>`;
    html += `<button class="btn btn-primary floating-save" id="save-predictions-float">${t('predict.save')}</button>`;
    html += `<div style="height:64px"></div>`;
  }

  // Locked predictions
  if (lockedMatches.length > 0) {
    html += `<h3 style="font-size:0.9rem;color:var(--text-muted);margin:20px 0 8px">${t('predict.my_preds')}</h3>`;
    lockedMatches.forEach(m => {
      html += renderLockedCard(m);
    });
  }

  container.innerHTML = html;

  // Save button handler (both static and floating)
  const saveHandler = async () => {
    collectScorePredictions(container);
    localStorage.setItem('wc2026_predictions', JSON.stringify(state.predictions));

    const data = Object.values(state.predictions).filter(p => p.player === state.currentPlayer);
    if (typeof submitPredictions === 'function') {
      showLoading();
      await submitPredictions(data);
      hideLoading();
    }
    showToast(t('predict.saved'));
  };
  container.querySelector('#save-predictions')?.addEventListener('click', saveHandler);
  container.querySelector('#save-predictions-float')?.addEventListener('click', saveHandler);

  // Logout
  container.querySelector('#logout-btn')?.addEventListener('click', () => {
    state.currentPlayer = null;
    sessionStorage.removeItem('wc2026_player');
    sessionStorage.removeItem('wc2026_pin');
    renderPredictions();
  });
}

function renderScoreCard(match) {
  const lang = currentLang;
  const t1 = TEAMS[match.team1];
  const t2 = TEAMS[match.team2];
  const pred = state.predictions[match.id + ':' + state.currentPlayer] || {};
  const p1 = pred.team1_pred !== undefined ? pred.team1_pred : '';
  const p2 = pred.team2_pred !== undefined ? pred.team2_pred : '';

  const t1Label = t1 ? `${t1.flag} ${lang === 'th' ? t1.nameTh : t1.name}` : getTeamLabel(match.team1, lang);
  const t2Label = t2 ? `${t2.flag} ${lang === 'th' ? t2.nameTh : t2.name}` : getTeamLabel(match.team2, lang);

  let html = `<div class="card match-card" data-match-id="${match.id}">`;

  // Header
  html += `<div class="match-header">`;
  html += `<span>${formatMatchDate(match, lang)}</span>`;
  html += `<span class="match-stage">${match.stage === 'group' ? match.group : STAGE_LABELS[lang][match.stage]}</span>`;
  html += `</div>`;

  // Score inputs
  html += `<div class="match-teams">`;
  html += `<div class="team team-home">${t1Label}</div>`;
  html += `<div class="match-score">`;
  html += `<input type="number" min="0" max="15" value="${p1}" data-match="${match.id}" data-field="team1_pred">`;
  html += `<span class="score-separator">-</span>`;
  html += `<input type="number" min="0" max="15" value="${p2}" data-match="${match.id}" data-field="team2_pred">`;
  html += `</div>`;
  html += `<div class="team team-away">${t2Label}</div>`;
  html += `</div>`;

  html += `<div class="match-venue">${match.venue}</div>`;
  html += `</div>`;
  return html;
}

function renderLockedCard(match) {
  const lang = currentLang;
  const t1 = TEAMS[match.team1];
  const t2 = TEAMS[match.team2];
  const pred = state.predictions[match.id + ':' + state.currentPlayer] || {};
  const result = state.matches[match.id];

  const t1Label = t1 ? `${t1.flag}` : '';
  const t2Label = t2 ? `${t2.flag}` : '';
  const t1Name = t1 ? (lang === 'th' ? t1.nameTh : t1.name) : getTeamLabel(match.team1, lang);
  const t2Name = t2 ? (lang === 'th' ? t2.nameTh : t2.name) : getTeamLabel(match.team2, lang);

  let html = `<div class="card match-card match-locked" style="opacity:0.6">`;
  html += `<div class="match-header">`;
  html += `<span>${formatMatchDate(match, lang)}</span>`;
  html += `<span class="match-stage">${match.stage === 'group' ? match.group : STAGE_LABELS[lang][match.stage]}</span>`;
  html += `</div>`;
  html += `<div class="match-teams" style="font-size:0.85rem">`;
  html += `<div class="team team-home">${t1Label} ${t1Name}</div>`;
  html += `<div class="match-score" style="font-size:0.9rem">${pred.team1_pred !== undefined ? pred.team1_pred + '-' + pred.team2_pred : '-'}${result && typeof result.team1_score === 'number' && typeof result.team2_score === 'number' ? ' → ' + result.team1_score + '-' + result.team2_score : ''}</div>`;
  html += `<div class="team team-away">${t2Name} ${t2Label}</div>`;
  html += `</div>`;
  html += `</div>`;
  return html;
}

function collectScorePredictions(container) {
  const matchInputs = {};
  container.querySelectorAll('.match-score input').forEach(input => {
    const matchId = input.dataset.match;
    const field = input.dataset.field;
    if (!matchInputs[matchId]) matchInputs[matchId] = {};
    matchInputs[matchId][field] = input.value.trim();
  });

  Object.entries(matchInputs).forEach(([matchId, fields]) => {
    const key = matchId + ':' + state.currentPlayer;
    const s1 = fields.team1_pred;
    const s2 = fields.team2_pred;

    // Skip if either field is empty
    if (s1 === '' || s2 === '') {
      // Remove prediction if both cleared
      if (s1 === '' && s2 === '' && state.predictions[key]) {
        delete state.predictions[key];
      }
      return;
    }

    if (!state.predictions[key]) state.predictions[key] = { match_id: matchId, player: state.currentPlayer, player_id: state.currentPlayer };
    state.predictions[key].team1_pred = parseInt(s1);
    state.predictions[key].team2_pred = parseInt(s2);
  });
}

function renderLoginForm(container) {
  const lang = currentLang;
  let html = '<div class="login-form">';
  html += `<h2>${t('login.title')}</h2>`;
  html += `<div id="login-error" class="login-error"></div>`;

  html += `<select id="login-name"><option value="">${t('login.name')}</option>`;
  if (state.players.length) {
    state.players.forEach(p => {
      html += `<option value="${p.player_id}">${p.display_name}</option>`;
    });
  } else {
    ['Pisan', 'Player2', 'Player3', 'Player4', 'Player5', 'Player6'].forEach(name => {
      html += `<option value="${name.toLowerCase()}">${name}</option>`;
    });
  }
  html += '</select>';

  html += `<input type="password" id="login-pin" placeholder="${t('login.pin')}" maxlength="4" inputmode="numeric">`;
  html += `<button class="btn btn-primary" id="login-btn">${t('login.btn')}</button>`;
  html += '</div>';

  container.innerHTML = html;

  container.querySelector('#login-btn').addEventListener('click', async () => {
    const name = container.querySelector('#login-name').value;
    const pin = container.querySelector('#login-pin').value;
    if (!name || !pin) return;

    showLoading();
    const result = await loginPlayer(name, pin);
    hideLoading();

    if (result.success) {
      // Refresh data for this player
      await refreshData();
      buildLinesFromMatches();
      renderPredictions();
    } else {
      container.querySelector('#login-error').textContent = t('login.wrong');
    }
  });
}
