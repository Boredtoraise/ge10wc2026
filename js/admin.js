// Admin panel — set lines/odds + enter scores

function renderAdmin() {
  const container = document.getElementById('view-admin');
  if (!state.isAdmin || !state.currentPlayer) {
    container.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text-muted)">Admin only</div>';
    return;
  }
  const lang = currentLang;

  let html = '';
  html += `<div class="user-bar">`;
  html += `<span class="user-name">${getDisplayName(state.currentPlayer)} (${lang === 'th' ? 'แอดมิน' : 'Admin'})</span>`;
  html += `<button class="logout-btn" id="admin-logout">${t('logout')}</button>`;
  html += `</div>`;

  // Section 1: Set Lines (EPL only)
  const upcoming = MATCHES.filter(m => m.stage === 'epl' && !isMatchLocked(m));
  html += `<h2 style="font-size:1.1rem;margin-bottom:12px">${lang === 'th' ? 'ตั้งราคา' : 'Set Lines & Odds'}</h2>`;

  if (upcoming.length === 0) {
    html += `<div style="color:var(--text-muted);text-align:center;padding:20px">${lang === 'th' ? 'ไม่มีคู่ที่จะตั้งราคา' : 'No upcoming matches'}</div>`;
  } else {
    upcoming.forEach(m => { html += renderAdminLinesCard(m); });
    html += `<button class="btn btn-primary" id="admin-save-lines" style="margin:12px 0">${lang === 'th' ? 'บันทึกราคา' : 'Save All Lines'}</button>`;
  }

  // Section 2: Enter Scores (group stage locked matches)
  const finished = MATCHES.filter(m => m.stage === 'group' && isMatchLocked(m));
  html += `<h2 style="font-size:1.1rem;margin:24px 0 12px">${lang === 'th' ? 'ใส่ผลการแข่ง' : 'Enter Scores'}</h2>`;

  if (finished.length === 0) {
    html += `<div style="color:var(--text-muted);text-align:center;padding:20px">${lang === 'th' ? 'ยังไม่มีคู่ที่จบ' : 'No finished matches'}</div>`;
  } else {
    finished.forEach(m => { html += renderAdminScoreCard(m); });
    html += `<button class="btn btn-primary" id="admin-save-scores" style="margin:12px 0">${lang === 'th' ? 'บันทึกผล' : 'Save All Scores'}</button>`;
  }

  // Section 3: Bulk Approve Slips by Team Pick
  const allSlips = getAllSlips();
  const scoredMatches = MATCHES.filter(m => {
    const r = state.matches[m.id];
    return r && typeof r.team1_score === 'number' && typeof r.team2_score === 'number';
  });

  if (scoredMatches.length > 0) {
    html += `<h2 style="font-size:1.1rem;margin:24px 0 12px">${lang === 'th' ? 'ยืนยันสลิป' : 'Approve Slips'}</h2>`;
    const btnStyle = 'background:var(--accent);color:#000;border:none;padding:6px 14px;border-radius:var(--radius);font-size:0.85rem;font-weight:700;cursor:pointer';

    scoredMatches.forEach(m => {
      const teams = [
        { code: m.team1, info: TEAMS[m.team1] },
        { code: m.team2, info: TEAMS[m.team2] },
      ];
      const buttons = teams.map(({ code, info }) => {
        const count = allSlips.filter(s =>
          s.status !== 'approved' && s.status !== 'cancelled' &&
          (resolveSlip(s).status === 'won' || resolveSlip(s).status === 'lost') &&
          s.picks.some(p => p.type === 'ah' && p.pick === code)
        ).length;
        if (!count) return '';
        const name = info ? (lang === 'th' ? info.nameTh : info.name) : code;
        const flag = info ? info.flag : '';
        return `<button class="bulk-approve-btn" data-team="${code}" style="${btnStyle}">${flag} ${name} (${count} สลิป)</button>`;
      }).join('');

      if (!buttons) return;
      html += `<div class="card" style="padding:10px;margin-bottom:6px">`;
      html += `<div style="font-size:0.75rem;color:var(--text-muted);margin-bottom:6px">${m.id} · ${formatMatchDate(m, lang)}</div>`;
      html += `<div style="display:flex;gap:8px;flex-wrap:wrap">${buttons}</div>`;
      html += `</div>`;
    });
  }

  container.innerHTML = html;

  // Bulk Approve
  container.querySelectorAll('.bulk-approve-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const teamCode = btn.dataset.team;
      const toApprove = getAllSlips().filter(s =>
        s.status !== 'approved' && s.status !== 'cancelled' &&
        (resolveSlip(s).status === 'won' || resolveSlip(s).status === 'lost') &&
        s.picks.some(p => p.type === 'ah' && p.pick === teamCode)
      );
      if (!toApprove.length) return;
      showLoading();
      for (const s of toApprove) { await approveSlip(s.timestamp); }
      await refreshData();
      hideLoading();
      showToast(lang === 'th' ? `ยืนยัน ${toApprove.length} สลิปแล้ว` : `Approved ${toApprove.length} slips`);
      renderAdmin();
    });
  });

  // Save Lines
  container.querySelector('#admin-save-lines')?.addEventListener('click', async () => {
    const updates = [];
    upcoming.forEach(m => {
      const card = container.querySelector(`[data-admin-match="${m.id}"]`);
      if (!card) return;
      const ahLine = card.querySelector('.admin-ah-line')?.value;
      const ahOddsH = card.querySelector('.admin-ah-odds-h')?.value;
      const ahOddsA = card.querySelector('.admin-ah-odds-a')?.value;
      const ouLine = card.querySelector('.admin-ou-line')?.value;
      const ouOddsO = card.querySelector('.admin-ou-odds-o')?.value;
      const ouOddsU = card.querySelector('.admin-ou-odds-u')?.value;
      if (ahLine || ouLine) {
        updates.push({ match_id: m.id, ah_line: ahLine, ah_odds_h: ahOddsH, ah_odds_a: ahOddsA, ou_line: ouLine, ou_odds_o: ouOddsO, ou_odds_u: ouOddsU });
      }
    });
    if (!updates.length) return;
    showLoading();
    const result = await updateLines(updates);
    hideLoading();
    if (result.success) {
      await refreshData();
      buildLinesFromMatches();
      showToast(lang === 'th' ? 'บันทึกราคาแล้ว' : 'Lines saved');
    } else {
      showToast(result.error || 'Error');
    }
  });

  // Save Scores
  container.querySelector('#admin-save-scores')?.addEventListener('click', async () => {
    const updates = [];
    finished.forEach(m => {
      const card = container.querySelector(`[data-admin-score="${m.id}"]`);
      if (!card) return;
      const s1 = card.querySelector('.admin-s1')?.value;
      const s2 = card.querySelector('.admin-s2')?.value;
      if (s1 !== '' || s2 !== '') {
        updates.push({ match_id: m.id, team1_score: s1, team2_score: s2 });
      }
    });
    if (!updates.length) return;
    showLoading();
    const result = await updateScores(updates);
    hideLoading();
    if (result.success) {
      await refreshData();
      showToast(lang === 'th' ? 'บันทึกผลแล้ว' : 'Scores saved');
      renderAdmin();
    } else {
      showToast(result.error || 'Error');
    }
  });

  // Logout
  container.querySelector('#admin-logout')?.addEventListener('click', () => {
    state.currentPlayer = null;
    state.isAdmin = false;
    sessionStorage.removeItem('wc2026_player');
    sessionStorage.removeItem('wc2026_pin');
    sessionStorage.removeItem('wc2026_admin');
    updateAdminUI();
    renderAdmin();
  });
}

function renderAdminLinesCard(m) {
  const lang = currentLang;
  const t1 = TEAMS[m.team1];
  const t2 = TEAMS[m.team2];
  if (!t1 || !t2) return '';
  const t1Name = lang === 'th' ? t1.nameTh : t1.name;
  const t2Name = lang === 'th' ? t2.nameTh : t2.name;

  const ahLine = state.ahLines[m.id] || '';
  const ahOddsH = state.ahOddsH[m.id] || '';
  const ahOddsA = state.ahOddsA[m.id] || '';
  const ouLine = state.ouLines[m.id] || '';
  const ouOddsO = state.ouOddsO[m.id] || '';
  const ouOddsU = state.ouOddsU[m.id] || '';

  const inp = (cls, val, placeholder, w) => `<input type="text" class="${cls}" value="${val}" placeholder="${placeholder}" style="width:${w};padding:6px 8px;background:var(--bg-input);border:1px solid var(--border);border-radius:var(--radius);color:var(--text-primary);font-size:0.85rem;text-align:center">`;

  let html = `<div class="card" style="padding:10px;margin-bottom:6px" data-admin-match="${m.id}">`;
  html += `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">`;
  html += `<span style="font-size:0.75rem;color:var(--text-muted)">${m.id} · ${formatMatchDate(m, lang)}</span>`;
  html += `<span style="font-size:0.8rem">${t1Name} vs ${t2Name}</span>`;
  html += `</div>`;

  // AH row
  html += `<div style="display:flex;align-items:center;gap:4px;margin-bottom:6px;flex-wrap:wrap">`;
  html += `<span style="background:var(--secondary);color:#fff;padding:2px 8px;border-radius:4px;font-size:0.7rem;font-weight:700">AH</span>`;
  html += `Line ${inp('admin-ah-line', ahLine, '0.5', '52px')}`;
  html += `H ${inp('admin-ah-odds-h', ahOddsH, '1.80', '48px')}`;
  html += `A ${inp('admin-ah-odds-a', ahOddsA, '1.90', '48px')}`;
  html += `</div>`;

  // O/U row
  html += `<div style="display:flex;align-items:center;gap:4px;flex-wrap:wrap">`;
  html += `<span style="background:var(--accent);color:#000;padding:2px 8px;border-radius:4px;font-size:0.7rem;font-weight:700">O/U</span>`;
  html += `Line ${inp('admin-ou-line', ouLine, '1.5', '52px')}`;
  html += `O ${inp('admin-ou-odds-o', ouOddsO, '1.90', '48px')}`;
  html += `U ${inp('admin-ou-odds-u', ouOddsU, '1.90', '48px')}`;
  html += `</div>`;

  html += `</div>`;
  return html;
}

function renderAdminScoreCard(m) {
  const lang = currentLang;
  const t1 = TEAMS[m.team1];
  const t2 = TEAMS[m.team2];
  if (!t1 || !t2) return '';
  const t1Name = lang === 'th' ? t1.nameTh : t1.name;
  const t2Name = lang === 'th' ? t2.nameTh : t2.name;
  const result = state.matches[m.id];
  const s1 = result?.team1_score ?? '';
  const s2 = result?.team2_score ?? '';
  const hasScore = typeof s1 === 'number' && typeof s2 === 'number';

  let html = `<div class="card" style="padding:10px;margin-bottom:6px" data-admin-score="${m.id}">`;
  html += `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">`;
  html += `<span style="font-size:0.75rem;color:var(--text-muted)">${m.id} · ${formatMatchDate(m, lang)}</span>`;
  html += `<span style="font-size:0.8rem">${t1Name} vs ${t2Name}</span>`;
  html += `</div>`;

  html += `<div style="display:flex;align-items:center;gap:8px;justify-content:center">`;
  html += `<span style="font-size:0.85rem;color:var(--text-muted)">${t1Name}</span>`;
  html += `<input type="number" class="admin-s1" value="${hasScore ? s1 : ''}" placeholder="?" min="0" style="width:52px;padding:6px 8px;background:var(--bg-input);border:1px solid var(--border);border-radius:var(--radius);color:var(--text-primary);font-size:1.1rem;text-align:center">`;
  html += `<span style="color:var(--text-muted)">-</span>`;
  html += `<input type="number" class="admin-s2" value="${hasScore ? s2 : ''}" placeholder="?" min="0" style="width:52px;padding:6px 8px;background:var(--bg-input);border:1px solid var(--border);border-radius:var(--radius);color:var(--text-primary);font-size:1.1rem;text-align:center">`;
  html += `<span style="font-size:0.85rem;color:var(--text-muted)">${t2Name}</span>`;
  if (hasScore) html += `<span style="font-size:0.7rem;color:var(--accent);margin-left:4px">${lang === 'th' ? 'มีผลแล้ว' : 'saved'}</span>`;
  html += `</div>`;

  html += `</div>`;
  return html;
}
