// Betting — unified single + step (AH + O/U)
// 1 pick = single, 3+ picks = step/parlay

async function renderBetting() {
  const container = document.getElementById('view-bet');
  const lang = currentLang;

  if (!state.currentPlayer) {
    renderBettingLoginForm(container);
    return;
  }

  if (!state.allSlips.length && typeof API_BASE_URL !== 'undefined' && API_BASE_URL) {
    const allSlips = await fetchAPI('allslips');
    if (allSlips) state.allSlips = allSlips;
  }

  const tabStyleOn  = 'padding:8px 16px;font-size:0.85rem;background:var(--primary);border:1px solid var(--primary);color:#fff;border-radius:var(--radius);font-weight:700';
  const tabStyleOff = 'padding:8px 16px;font-size:0.85rem;background:var(--bg-input);border:1px solid var(--border);color:var(--text-primary);border-radius:var(--radius);font-weight:700';

  const byKickoff  = (a, b) => new Date(a.date) - new Date(b.date);
  const byNewest   = (a, b) => new Date(b.date) - new Date(a.date);

  const available = MATCHES.filter(m => (state.ahLines[m.id] || state.ouLines[m.id]) && !isMatchLocked(m)).sort(byKickoff);
  const locked    = MATCHES.filter(m => (state.ahLines[m.id] || state.ouLines[m.id]) && isMatchLocked(m)).sort(byNewest);

  const slipSource  = state.allSlips.length ? state.allSlips : (state.slips || []);
  const allFiltered = slipSource.filter(s => s.status !== 'cancelled').sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  const mySlips     = allFiltered.filter(s => s.player === state.currentPlayer);
  const otherSlips  = allFiltered.filter(s => s.player !== state.currentPlayer);

  let html = '';

  // User bar
  html += `<div class="user-bar">`;
  html += `<span class="user-name">${state.currentPlayer}</span>`;
  html += `<button class="logout-btn" id="bet-logout">${t('logout')}</button>`;
  html += `</div>`;

  // Sub-tabs
  html += `<div style="display:flex;gap:8px;margin-bottom:16px">`;
  html += `<button class="bet-tab-btn" data-tab="open" style="${tabStyleOn}">${lang === 'th' ? 'เปิดรับแทง' : 'Open'}</button>`;
  html += `<button class="bet-tab-btn" data-tab="past" style="${tabStyleOff}">${lang === 'th' ? 'ผ่านไปแล้ว' : 'Past'}${locked.length ? ` (${locked.length})` : ''}</button>`;
  html += `</div>`;

  // ── Tab: เปิดรับแทง ──────────────────────────────
  html += `<div id="bet-tab-open">`;
  html += `<h2 style="font-size:1.1rem;margin-bottom:12px">${lang === 'th' ? 'แทงบอล' : 'Place Bets'}</h2>`;

  if (available.length === 0) {
    html += `<div style="color:var(--text-muted);text-align:center;padding:20px">${lang === 'th' ? 'ยังไม่มีคู่ที่เปิดรับแทง' : 'No open matches with lines'}</div>`;
  } else {
    html += `<p style="font-size:0.85rem;color:var(--text-muted);margin-bottom:12px">${lang === 'th' ? 'กดเลือก กดอีกที=ยกเลิก<br>1 pick = single<br>2 คู่ = 4 picks (AH+O/U ทั้งคู่)<br>3 คู่+ = step (pick ละคู่ก็ได้)' : 'Tap to select, tap again to deselect<br>1 pick = single<br>2 matches = 4 picks (AH+O/U both)<br>3+ matches = step (1 pick/match ok)'}</p>`;
    available.forEach(m => { html += renderBettingCard(m); });

    html += `<div style="margin-top:12px;padding:12px;background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius-lg)">`;
    html += `<div id="bet-summary" style="font-size:0.85rem;color:var(--text-muted)">${lang === 'th' ? 'เลือก' : 'Picks'}: 0</div>`;
    html += `<div style="margin-top:8px;display:flex;align-items:center;gap:8px">`;
    html += `<label style="font-size:0.85rem">${lang === 'th' ? 'จำนวนเงิน' : 'Amount'}</label>`;
    html += `<input type="number" id="bet-amount" min="1" step="10" value="10" style="width:100px;padding:6px 8px;background:var(--bg-input);border:1px solid var(--border);border-radius:var(--radius);color:var(--text-primary);font-size:0.9rem;text-align:right">`;
    html += `<span style="color:var(--accent)">฿</span>`;
    html += `</div>`;
    html += `<div id="bet-odds-display" style="margin-top:8px;font-size:0.85rem;color:var(--text-muted)">${lang === 'th' ? 'ราคารวม' : 'Odds'}: -</div>`;
    html += `<div id="bet-payout-display" style="margin-top:4px;font-size:1rem;font-weight:700;color:var(--accent)">${lang === 'th' ? 'จ่าย' : 'Payout'}: -</div>`;
    html += `<button class="btn btn-primary" id="bet-save-btn" style="margin-top:10px" disabled>${lang === 'th' ? 'ลงเงิน' : 'Place Bet'}</button>`;
    html += `</div>`;
    html += `<div style="height:20px"></div>`;
  }

  // My slips — full cards
  html += `<div id="slip-list">`;
  html += `<h3 style="font-size:0.95rem;color:var(--primary);margin:20px 0 8px">${lang === 'th' ? 'สลิปของฉัน' : 'My Slips'}</h3>`;
  if (mySlips.length === 0) {
    html += `<div style="color:var(--text-muted);font-size:0.85rem;padding:8px 0">${lang === 'th' ? 'ยังไม่มีสลิป' : 'No slips yet'}</div>`;
  } else {
    mySlips.forEach((slip, idx) => { html += renderSlip(slip, idx); });
  }

  // Others' slips — pending-approve as full cards, rest as compact table
  if (otherSlips.length > 0) {
    const needsApprove = state.isAdmin
      ? otherSlips.filter(slip => {
          const resolved = typeof resolveSlip === 'function' ? resolveSlip(slip) : { status: slip.status };
          const st = resolved.status;
          return (st === 'won' || st === 'lost') && slip.status !== 'approved' && slip.status !== 'cancelled';
        })
      : [];
    const needsApproveTs = new Set(needsApprove.map(s => s.timestamp));
    const compactSlips = otherSlips.filter(s => !needsApproveTs.has(s.timestamp));

    if (needsApprove.length > 0) {
      html += `<h3 style="font-size:0.95rem;color:var(--accent);margin:20px 0 8px">${lang === 'th' ? 'รอ Approve' : 'Pending Approval'}</h3>`;
      needsApprove.forEach((slip, idx) => { html += renderSlip(slip, idx); });
    }

    if (compactSlips.length > 0) {
      html += `<h3 style="font-size:0.95rem;color:var(--text-muted);margin:20px 0 8px">${lang === 'th' ? 'สลิปเพื่อน' : 'Friends\' Slips'}</h3>`;
      html += `<table style="width:100%;border-collapse:collapse;font-size:0.82rem">`;
      html += `<thead><tr style="color:var(--text-muted);border-bottom:1px solid var(--border)">`;
      html += `<th style="text-align:left;padding:4px 6px">${lang === 'th' ? 'ชื่อ' : 'Player'}</th>`;
      html += `<th style="text-align:left;padding:4px 6px">Type</th>`;
      html += `<th style="text-align:right;padding:4px 6px">${lang === 'th' ? 'ลงไป' : 'Bet'}</th>`;
      html += `<th style="text-align:right;padding:4px 6px">${lang === 'th' ? 'จ่าย' : 'Payout'}</th>`;
      html += `<th style="text-align:right;padding:4px 6px">${lang === 'th' ? 'สถานะ' : 'Status'}</th>`;
      html += `</tr></thead><tbody>`;
      const statusColors = { pending: 'var(--text-muted)', won: 'var(--accent)', lost: 'var(--wrong)', approved: 'var(--accent)' };
      const statusLabels = { pending: lang === 'th' ? 'รอ' : 'Pending', won: lang === 'th' ? 'ถูก' : 'Won', lost: lang === 'th' ? 'ผิด' : 'Lost', approved: lang === 'th' ? 'ยืนยัน' : 'OK' };
      compactSlips.forEach(slip => {
        const resolved = typeof resolveSlip === 'function' ? resolveSlip(slip) : { status: slip.status };
        const isStep = (slip.picks || []).length >= 3;
        const st = resolved.status;
        html += `<tr style="border-bottom:1px solid var(--border)">`;
        html += `<td style="padding:5px 6px;font-weight:600">${slip.player}</td>`;
        html += `<td style="padding:5px 6px;color:var(--text-muted)">${isStep ? 'STEP' : 'SINGLE'}</td>`;
        html += `<td style="padding:5px 6px;text-align:right">${slip.bet}฿</td>`;
        html += `<td style="padding:5px 6px;text-align:right;color:var(--accent)">${slip.payout}฿</td>`;
        html += `<td style="padding:5px 6px;text-align:right;font-weight:700;color:${statusColors[st]}">${statusLabels[st]}</td>`;
        html += `</tr>`;
      });
      html += `</tbody></table>`;
    }
  }
  html += `</div>`; // slip-list
  html += `</div>`; // bet-tab-open

  // ── Tab: ผ่านไปแล้ว ──────────────────────────────
  html += `<div id="bet-tab-past" style="display:none">`;
  if (locked.length === 0) {
    html += `<div style="color:var(--text-muted);text-align:center;padding:40px">${lang === 'th' ? 'ยังไม่มีผลการแข่ง' : 'No results yet'}</div>`;
  } else {
    locked.forEach(m => { html += renderBettingCardLocked(m); });
  }
  html += `</div>`; // bet-tab-past

  container.innerHTML = html;

  // Tab switching
  container.querySelectorAll('.bet-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;
      container.querySelectorAll('.bet-tab-btn').forEach(b => {
        b.style.cssText = b.dataset.tab === tab ? tabStyleOn : tabStyleOff;
      });
      container.querySelector('#bet-tab-open').style.display = tab === 'open' ? '' : 'none';
      container.querySelector('#bet-tab-past').style.display = tab === 'past' ? '' : 'none';
    });
  });

  // Pick state: key = "matchId_ah" or "matchId_ou"
  let betPicks = {};

  // Click handlers for picks (toggle on/off)
  container.querySelectorAll('.bet-pick').forEach(btn => {
    btn.addEventListener('click', () => {
      const matchId = btn.dataset.match;
      const pick = btn.dataset.pick;
      const odds = parseFloat(btn.dataset.odds);
      const isOu = btn.classList.contains('ou-btn');
      const key = matchId + (isOu ? '_ou' : '_ah');

      // Toggle: if already selected, deselect
      if (btn.classList.contains('selected')) {
        btn.classList.remove('selected');
        delete betPicks[key];
      } else {
        // Deselect same type siblings
        const selector = isOu
          ? `.bet-pick.ou-btn[data-match="${matchId}"]`
          : `.bet-pick:not(.ou-btn)[data-match="${matchId}"]`;
        container.querySelectorAll(selector).forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        betPicks[key] = { matchId, pick, odds, isOu };
      }
      updateBettingSummary(betPicks, container);
    });
  });

  container.querySelector('#bet-amount')?.addEventListener('input', () => {
    updateBettingSummary(betPicks, container);
  });

  // Save button
  container.querySelector('#bet-save-btn')?.addEventListener('click', async () => {
    const betAmount = parseInt(container.querySelector('#bet-amount').value) || 0;
    const pickEntries = Object.entries(betPicks);
    const pickCount = pickEntries.length;
    const matchCount = new Set(pickEntries.map(([, d]) => d.matchId)).size;

    // Validate: single (1 pick) or step (2 matches × 4 picks or 3+ matches)
    let valid = false;
    if (pickCount === 1) valid = true;
    else if (matchCount >= 3) valid = true;
    else if (matchCount === 2 && pickCount >= 4) valid = true;

    if (!valid) return;
    if (betAmount < 10) { showToast(lang === 'th' ? 'ขั้นต่ำ 10฿' : 'Min 10฿'); return; }

    const picks = pickEntries.map(([, data]) => ({
      match_id: data.matchId,
      pick: data.pick,
      odds: data.odds,
      type: data.isOu ? 'ou' : 'ah',
      line: data.isOu ? state.ouLines[data.matchId] : state.ahLines[data.matchId],
    }));

    const combinedOdds = picks.reduce((acc, p) => acc * p.odds, 1);

    const slip = {
      bet: betAmount,
      combined_odds: Math.round(combinedOdds * 1000) / 1000,
      payout: Math.round(betAmount * combinedOdds),
      picks: picks,
    };

    if (typeof submitSlip === 'function') {
      showLoading();
      const result = await submitSlip(slip);
      hideLoading();
      if (result && !result.success) {
        showToast(result.error || 'Error');
        return;
      }
    }

    showToast(lang === 'th' ? 'บันทึกแล้ว' : 'Bet placed');
    renderBetting();
  });

  // Delete slip buttons
  container.querySelectorAll('.slip-delete-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const ts = btn.dataset.ts;
      if (typeof cancelSlip === 'function') {
        await cancelSlip(ts);
      }
      renderBetting();
    });
  });

  // Approve slip buttons (admin only)
  container.querySelectorAll('.slip-approve-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const ts = btn.dataset.ts;
      const result = await approveSlip(ts);
      if (result && result.success) {
        const allSlips = state.allSlips.length ? state.allSlips : (state.slips || []);
        const slip = allSlips.find(s => String(s.timestamp) === String(ts));
        if (slip) slip.status = 'approved';
        showToast(lang === 'th' ? 'ยืนยันแล้ว' : 'Approved');
        renderBetting();
      } else {
        showToast(result?.error || 'Error');
      }
    });
  });

  // Logout
  container.querySelector('#bet-logout')?.addEventListener('click', () => {
    state.currentPlayer = null;
    sessionStorage.removeItem('wc2026_player');
    sessionStorage.removeItem('wc2026_pin');
    renderBetting();
  });
}

function renderBettingCardLocked(m) {
  const lang = currentLang;
  const t1 = TEAMS[m.team1];
  const t2 = TEAMS[m.team2];
  if (!t1 || !t2) return '';

  const ahLine = state.ahLines[m.id] || '';
  const ouLine = state.ouLines[m.id] || '';
  const ahOddsH = state.ahOddsH[m.id] || 1.80;
  const ahOddsA = state.ahOddsA[m.id] || 1.90;
  const ouOddsO = state.ouOddsO[m.id] || 1.90;
  const ouOddsU = state.ouOddsU[m.id] || 1.90;
  const t1Name = lang === 'th' ? t1.nameTh : t1.name;
  const t2Name = lang === 'th' ? t2.nameTh : t2.name;
  const result = state.matches[m.id];
  const s1 = result?.team1_score;
  const s2 = result?.team2_score;
  const hasScore = typeof s1 === 'number' && typeof s2 === 'number';
  const scoreLabel = hasScore ? `${s1} - ${s2}` : (lang === 'th' ? 'กำลังแข่ง' : 'Live');
  const dis = 'disabled';

  // Figure out which side won
  let ahWinSide = null, ouWinSide = null;
  if (hasScore && ahLine) {
    const ahOutcome = getAHOutcome(parseFloat(ahLine), s1, s2);
    if (ahOutcome.team1 === 'full' || ahOutcome.team1 === 'half') ahWinSide = 'team1';
    else if (ahOutcome.team2 === 'full' || ahOutcome.team2 === 'half') ahWinSide = 'team2';
  }
  if (hasScore && ouLine) {
    const ouOutcome = getOUOutcome(parseFloat(ouLine), s1 + s2);
    if (ouOutcome.over === 'full' || ouOutcome.over === 'half') ouWinSide = 'over';
    else if (ouOutcome.under === 'full' || ouOutcome.under === 'half') ouWinSide = 'under';
  }

  const btnStyle = (isWinner) => isWinner
    ? `${dis} style="flex:1;font-size:0.8rem;cursor:default;pointer-events:none;background:rgba(212,160,23,0.15);border:1px solid var(--accent);color:var(--accent);font-weight:700"`
    : `${dis} style="flex:1;font-size:0.8rem;cursor:default;pointer-events:none;opacity:0.35"`;

  let html = `<div class="card" style="padding:10px;margin-bottom:6px;position:relative;opacity:0.7">`;
  html += `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">`;
  html += `<span style="font-size:0.75rem;color:var(--text-muted)">${formatMatchDate(m, lang)}</span>`;
  html += `<span style="font-size:0.75rem">${t1.flag} ${t1Name} vs ${t2Name} ${t2.flag}</span>`;
  html += `<span style="font-size:0.8rem;font-weight:700;color:var(--text-muted)">${scoreLabel}</span>`;
  html += `</div>`;

  if (ahLine) {
    const ahH = formatAhFav(ahLine, true);
    const ahA = formatAhFav(ahLine, false);
    html += `<div style="display:flex;align-items:center;gap:4px;margin-bottom:6px">`;
    html += `<span style="background:var(--secondary);color:#fff;padding:2px 8px;border-radius:4px;font-size:0.75rem;font-weight:700;white-space:nowrap">AH</span>`;
    html += `<button ${btnStyle(ahWinSide === 'team1')} class="ah-btn">${t1.flag} ${t1Name} <span style="font-weight:700">${ahH}</span> <span class="odds-tag">@${ahOddsH}</span></button>`;
    html += `<button ${btnStyle(ahWinSide === 'team2')} class="ah-btn">${t2.flag} ${t2Name} <span style="font-weight:700">${ahA}</span> <span class="odds-tag">@${ahOddsA}</span></button>`;
    html += `</div>`;
  }

  if (ouLine) {
    html += `<div style="display:flex;align-items:center;gap:4px">`;
    html += `<span style="background:var(--accent);color:#000;padding:2px 8px;border-radius:4px;font-size:0.75rem;font-weight:700;white-space:nowrap">${lang === 'th' ? 'สูงต่ำ' : 'O/U'} ${ouLine}</span>`;
    html += `<button ${btnStyle(ouWinSide === 'over')} class="ah-btn ou-btn">${lang === 'th' ? 'สูง' : 'Over'} <span class="odds-tag">@${ouOddsO}</span></button>`;
    html += `<button ${btnStyle(ouWinSide === 'under')} class="ah-btn ou-btn">${lang === 'th' ? 'ต่ำ' : 'Under'} <span class="odds-tag">@${ouOddsU}</span></button>`;
    html += `</div>`;
  }

  html += `</div>`;
  return html;
}

function renderBettingCard(m) {
  const lang = currentLang;
  const t1 = TEAMS[m.team1];
  const t2 = TEAMS[m.team2];
  if (!t1 || !t2) return '';

  const ahLine = state.ahLines[m.id] || '';
  const ouLine = state.ouLines[m.id] || '';
  const ahOddsH = state.ahOddsH[m.id] || 1.80;
  const ahOddsA = state.ahOddsA[m.id] || 1.90;
  const ouOddsO = state.ouOddsO[m.id] || 1.90;
  const ouOddsU = state.ouOddsU[m.id] || 1.90;
  const t1Name = lang === 'th' ? t1.nameTh : t1.name;
  const t2Name = lang === 'th' ? t2.nameTh : t2.name;

  let html = `<div class="card" style="padding:10px;margin-bottom:6px">`;
  html += `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">`;
  html += `<span style="font-size:0.75rem;color:var(--text-muted)">${formatMatchDate(m, lang)}</span>`;
  html += `<span style="font-size:0.75rem">${t1.flag} ${t1Name} vs ${t2Name} ${t2.flag}</span>`;
  html += `</div>`;

  // AH — colored badge + 2 buttons in one row
  if (ahLine) {
    const ahH = formatAhFav(ahLine, true);
    const ahA = formatAhFav(ahLine, false);
    html += `<div style="display:flex;align-items:center;gap:4px;margin-bottom:6px">`;
    html += `<span style="background:var(--secondary);color:#fff;padding:2px 8px;border-radius:4px;font-size:0.75rem;font-weight:700;white-space:nowrap">AH</span>`;
    html += `<button class="ah-btn bet-pick" data-match="${m.id}" data-pick="${m.team1}" data-odds="${ahOddsH}" style="flex:1;font-size:0.8rem">${t1.flag} ${t1Name} <span style="font-weight:700">${ahH}</span> <span class="odds-tag">@${ahOddsH}</span></button>`;
    html += `<button class="ah-btn bet-pick" data-match="${m.id}" data-pick="${m.team2}" data-odds="${ahOddsA}" style="flex:1;font-size:0.8rem">${t2.flag} ${t2Name} <span style="font-weight:700">${ahA}</span> <span class="odds-tag">@${ahOddsA}</span></button>`;
    html += `</div>`;
  }

  // O/U — colored badge + 2 buttons in one row
  if (ouLine) {
    html += `<div style="display:flex;align-items:center;gap:4px">`;
    html += `<span style="background:var(--accent);color:#000;padding:2px 8px;border-radius:4px;font-size:0.75rem;font-weight:700;white-space:nowrap">${lang === 'th' ? 'สูงต่ำ' : 'O/U'} ${ouLine}</span>`;
    html += `<button class="ah-btn ou-btn bet-pick" data-match="${m.id}" data-pick="over" data-odds="${ouOddsO}" style="flex:1;font-size:0.8rem">${lang === 'th' ? 'สูง' : 'Over'} <span class="odds-tag">@${ouOddsO}</span></button>`;
    html += `<button class="ah-btn ou-btn bet-pick" data-match="${m.id}" data-pick="under" data-odds="${ouOddsU}" style="flex:1;font-size:0.8rem">${lang === 'th' ? 'ต่ำ' : 'Under'} <span class="odds-tag">@${ouOddsU}</span></button>`;
    html += `</div>`;
  }

  html += `</div>`;
  return html;
}

function updateBettingSummary(picks, container) {
  const lang = currentLang;
  const keys = Object.keys(picks);
  const matchCount = new Set(keys.map(k => picks[k].matchId)).size;
  const summaryEl = container.querySelector('#bet-summary');
  const oddsEl = container.querySelector('#bet-odds-display');
  const payoutEl = container.querySelector('#bet-payout-display');
  const saveBtn = container.querySelector('#bet-save-btn');
  const betAmount = parseInt(container.querySelector('#bet-amount')?.value) || 0;

  if (!summaryEl) return;

  // Validate: 1 pick = single, 2 matches min 4 picks (AH+O/U), 3+ matches = step
  let pickType = '';
  let valid = true;

  if (keys.length === 1) {
    pickType = 'SINGLE';
  } else if (keys.length >= 4 && matchCount >= 2) {
    pickType = 'STEP';
  } else if (keys.length >= 3 && matchCount >= 3) {
    pickType = 'STEP';
  } else if (matchCount === 2 && keys.length < 4) {
    pickType = lang === 'th' ? '2 คู่ต้อง 4 picks (AH+O/U)' : '2 matches need 4 picks (AH+O/U)';
    valid = false;
  } else if (matchCount === 1 && keys.length >= 2) {
    pickType = lang === 'th' ? '1 คู่ทำ step ไม่ได้' : 'Can\'t step on 1 match';
    valid = false;
  } else {
    pickType = lang === 'th' ? 'ต้อง 3+ คู่ หรือ 2 คู่×4 picks' : 'Need 3+ matches or 2 matches × 4 picks';
    valid = false;
  }

  summaryEl.textContent = `${lang === 'th' ? 'เลือก' : 'Picks'}: ${keys.length} (${matchCount} ${lang === 'th' ? 'คู่' : 'matches'}) — ${pickType}`;

  if (valid) {
    const combinedOdds = Object.values(picks).reduce((acc, p) => acc * p.odds, 1);
    const payout = Math.round(betAmount * combinedOdds);
    const profit = payout - betAmount;
    oddsEl.textContent = `${lang === 'th' ? 'ราคารวม' : 'Odds'}: ${combinedOdds.toFixed(3)}`;
    oddsEl.style.color = 'var(--accent)';

    payoutEl.innerHTML = `${lang === 'th' ? 'ถูก' : 'Win'}: ${payout}฿ (+${profit}) · ${lang === 'th' ? 'ผิด' : 'Lose'}: -${betAmount}฿`;
    payoutEl.style.color = 'var(--accent)';
    if (saveBtn) saveBtn.disabled = false;
  } else {
    const combinedOdds = Object.values(picks).reduce((acc, p) => acc * p.odds, 1);
    oddsEl.textContent = `${lang === 'th' ? 'ราคารวม' : 'Odds'}: ${combinedOdds.toFixed(3)}`;
    oddsEl.style.color = 'var(--text-muted)';
    payoutEl.textContent = pickType;
    payoutEl.style.color = 'var(--wrong)';
    saveBtn.disabled = true;
  }
}

function renderSlip(slip, idx) {
  const lang = currentLang;
  const resolved = typeof resolveSlip === 'function' ? resolveSlip(slip) : { status: slip.status, profit: 0 };
  const displayStatus = resolved.status;
  const statusColors = { pending: 'var(--secondary)', won: 'var(--accent)', lost: '#D94F4F', approved: 'var(--accent)' };
  const statusLabels = { pending: lang === 'th' ? 'รอผล' : 'Pending', won: lang === 'th' ? 'ถูก' : 'Won', lost: lang === 'th' ? 'ผิด' : 'Lost', approved: lang === 'th' ? 'ยืนยันแล้ว' : 'Approved' };

  const picks = slip.picks || [];
  const isStep = picks.length >= 3;

  const ownPending = slip.player === state.currentPlayer && slip.status === 'pending';
  const noLockedPicks = !picks.some(p => { const match = MATCHES.find(m => m.id === p.match_id); return match && isMatchLocked(match); });
  const canDelete = ownPending && (state.isAdmin || noLockedPicks);

  let cardStyle = '';
  if (displayStatus === 'won') cardStyle = 'border:2px solid var(--accent);box-shadow:0 0 12px rgba(212,160,23,0.15);background:rgba(212,160,23,0.04);';
  else if (displayStatus === 'lost') cardStyle = 'border:3px dashed var(--secondary);background:rgba(46,134,171,0.06);';

  const isApproved = slip.status === 'approved';
  if (isApproved) cardStyle = 'border:2px solid var(--accent);';

  let html = `<div class="card" style="padding:10px;margin-bottom:8px;${cardStyle}">`;
  html += `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">`;
  if (state.isAdmin) {
    html += `<span style="font-size:0.85rem"><b style="color:var(--accent)">${slip.player}</b> <span style="color:var(--text-muted)">#${idx + 1} ${isStep ? 'STEP' : 'SINGLE'} — ${new Date(slip.timestamp).toLocaleDateString('th-TH')}</span></span>`;
  } else {
    html += `<span style="font-size:0.8rem;color:var(--text-muted)">#${idx + 1} ${isStep ? 'STEP' : 'SINGLE'} — ${new Date(slip.timestamp).toLocaleDateString('th-TH')}</span>`;
  }
  html += `<div style="display:flex;align-items:center;gap:8px">`;
  if (canDelete) {
    html += `<button class="slip-delete-btn" data-ts="${slip.timestamp}" style="background:var(--wrong);border:none;color:#fff;padding:5px 14px;border-radius:6px;font-size:0.85rem;font-weight:700;cursor:pointer">🗑 ${lang === 'th' ? 'ลบสลิป' : 'Delete'}</button>`;
  }
  const isResolved = displayStatus === 'won' || displayStatus === 'lost';
  if (state.isAdmin && isResolved && slip.status !== 'approved' && slip.status !== 'cancelled') {
    html += `<button class="slip-approve-btn" data-ts="${slip.timestamp}" style="background:var(--accent);color:#000;border:none;padding:2px 10px;border-radius:4px;font-size:0.7rem;font-weight:700;cursor:pointer">${lang === 'th' ? '✓ ยืนยัน' : '✓ Approve'}</button>`;
  }
  if (isApproved) {
    html += `<span style="background:var(--secondary);color:#fff;padding:2px 8px;border-radius:4px;font-size:0.75rem;font-weight:700">✓ ${lang === 'th' ? 'ยืนยันแล้ว' : 'Approved'}</span>`;
  }
  html += `<span style="font-size:0.8rem;font-weight:700;color:${statusColors[displayStatus]}">${statusLabels[displayStatus]}</span>`;
  html += `</div></div>`;

  picks.forEach(p => {
    const match = MATCHES.find(m => m.id === p.match_id);
    if (!match) return;
    const t1 = TEAMS[match.team1];
    const t2 = TEAMS[match.team2];
    const isOu = p.type === 'ou';
    const t1Name = t1 ? (lang === 'th' ? t1.nameTh : t1.name) : match.team1;
    const t2Name = t2 ? (lang === 'th' ? t2.nameTh : t2.name) : match.team2;

    let pickLabel = '', resultBadge = '';

    if (isOu) {
      const lineLabel = p.line || state.ouLines[match.id] || '';
      pickLabel = `${p.pick === 'over' ? (lang === 'th' ? 'สูง' : 'Over') : (lang === 'th' ? 'ต่ำ' : 'Under')} ${lineLabel}`;
      resultBadge = getPickResultBadge(p, match);
    } else {
      const picked = TEAMS[p.pick];
      const lineLabel = p.line || state.ahLines[match.id] || '';
      const isHome = match && p.pick === match.team1;
      const ahSideLabel = lineLabel ? formatAhFav(lineLabel, isHome) : '';
      pickLabel = `${picked?.flag || ''} ${picked ? (lang === 'th' ? picked.nameTh : picked.name) : p.pick} ${ahSideLabel}`;
      resultBadge = getPickResultBadge(p, match);
    }

    // Highlight picks: won = gold border/bg, lost = red border, half = light gold
    const pickOutcome = typeof getPickOutcome === 'function' ? getPickOutcome(p, state.matches[match.id]) : null;
    let pickBg = '';
    if (pickOutcome === 'full') pickBg = 'background:rgba(212,160,23,0.12);border-left:3px solid var(--accent);border-radius:4px;padding:4px 6px;margin:2px 0;';
    else if (pickOutcome === 'half') pickBg = 'background:rgba(212,160,23,0.06);border-left:3px solid var(--accent);border-radius:4px;padding:4px 6px;margin:2px 0;';
    else if (pickOutcome === 'loss' || pickOutcome === 'half_loss') pickBg = 'background:rgba(180,60,60,0.08);border-left:3px solid var(--wrong);border-radius:4px;padding:4px 6px;margin:2px 0;';
    else if (pickOutcome === 'push') pickBg = 'border-left:3px solid var(--text-muted);border-radius:4px;padding:4px 6px;margin:2px 0;';

    const result = state.matches[match.id];
    const hasResult = result && typeof result.team1_score === 'number' && typeof result.team2_score === 'number';
    const scoreStr = hasResult ? ` <span style="font-weight:700">${result.team1_score}-${result.team2_score}</span>` : '';

    html += `<div style="font-size:0.8rem;display:flex;justify-content:space-between;align-items:center;${pickBg}">`;
    html += `<span>${pickLabel} ${p.odds ? '<span class="odds-tag">@' + p.odds + '</span>' : ''} ${resultBadge}</span>`;
    html += `<span style="color:var(--text-muted)">${t1?.flag || ''} ${t1Name} vs ${t2?.flag || ''} ${t2Name}${scoreStr}</span>`;
    html += `</div>`;
  });

  const displayOdds = slip.combined_odds || slip.odds || (picks.length ? picks.reduce((a, p) => a * (p.odds || 1), 1).toFixed(3) : '-');
  html += `<div style="margin-top:6px;padding-top:6px;border-top:1px solid var(--border);display:flex;justify-content:space-between;font-size:0.85rem">`;
  html += `<span>${slip.bet}฿ × ${displayOdds}</span>`;
  if (displayStatus === 'won') {
    html += `<span style="color:var(--accent);font-weight:700">+${resolved.profit}฿</span>`;
  } else if (displayStatus === 'lost') {
    html += `<span style="color:#D94F4F;font-weight:700">${resolved.profit}฿</span>`;
  } else {
    html += `<span style="color:var(--accent)">${lang === 'th' ? 'จ่าย' : 'Payout'}: ${slip.payout}฿</span>`;
  }
  html += `</div></div>`;
  return html;
}

function getPickResultBadge(pick, match) {
  const result = state.matches[match.id];
  if (!result || typeof result.team1_score !== 'number' || typeof result.team2_score !== 'number') return '';

  if (pick.type === 'ou') {
    const ouLine = state.ouLines[match.id];
    if (!ouLine) return '';
    const total = result.team1_score + result.team2_score;
    const outcome = getOUOutcome(parseFloat(ouLine), total);
    const res = outcome[pick.pick];
    if (res === 'full') return '<span class="badge badge-exact">✓</span>';
    if (res === 'half') return '<span class="badge badge-exact">½✓</span>';
    if (res === 'push') return '<span class="badge badge-correct">Push</span>';
    if (res === 'half_loss') return '<span class="badge badge-wrong">½✗</span>';
    return '<span class="badge badge-wrong">✗</span>';
  } else {
    const ahLine = state.ahLines[match.id];
    if (!ahLine) return '';
    const outcome = getAHOutcome(parseFloat(ahLine), result.team1_score, result.team2_score);
    const side = pick.pick === match.team1 ? 'team1' : 'team2';
    const res = outcome[side];
    if (res === 'full') return '<span class="badge badge-exact">✓</span>';
    if (res === 'half') return '<span class="badge badge-exact">½✓</span>';
    if (res === 'push') return '<span class="badge badge-correct">Push</span>';
    if (res === 'half_loss') return '<span class="badge badge-wrong">½✗</span>';
    return '<span class="badge badge-wrong">✗</span>';
  }
}

function renderBettingLoginForm(container) {
  const lang = currentLang;
  let html = '<div class="login-form">';
  html += `<h2>${t('login.title')}</h2>`;
  html += `<div id="bet-login-error" class="login-error"></div>`;

  html += `<select id="bet-login-name"><option value="">${t('login.name')}</option>`;
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

  html += `<input type="password" id="bet-login-pin" placeholder="${t('login.pin')}" maxlength="4" inputmode="numeric">`;
  html += `<button class="btn btn-primary" id="bet-login-btn">${t('login.btn')}</button>`;
  html += '</div>';

  container.innerHTML = html;

  container.querySelector('#bet-login-btn').addEventListener('click', async () => {
    const name = container.querySelector('#bet-login-name').value;
    const pin = container.querySelector('#bet-login-pin').value;
    if (!name || !pin) return;

    showLoading();
    const result = await loginPlayer(name, pin);
    hideLoading();

    if (result.success) {
      await refreshData();
      buildLinesFromMatches();
      renderBetting();
    } else {
      container.querySelector('#bet-login-error').textContent = t('login.wrong');
    }
  });
}
