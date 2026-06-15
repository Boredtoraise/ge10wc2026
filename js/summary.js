// Summary — leaderboard (score) + money (slips) + per-user dashboard

function renderSummary() {
  const container = document.getElementById('view-summary');
  const lang = currentLang;
  const players = getPlayers();

  let html = '';

  // Tab bar: summary + per-user
  html += `<div class="lb-tabs">`;
  html += `<button class="lb-tab active" data-lb-tab="summary">${lang === 'th' ? 'สรุป' : 'Summary'}</button>`;
  players.forEach(p => {
    const isMe = p === state.currentPlayer;
    html += `<button class="lb-tab${isMe ? ' me' : ''}" data-lb-tab="${p}">${p}${isMe ? ' ★' : ''}</button>`;
  });
  html += `</div>`;

  // Summary tab
  html += `<div class="lb-tab-content active" data-lb-content="summary">`;
  html += renderSummaryTab();
  html += `</div>`;

  // Per-user tabs
  players.forEach(p => {
    html += `<div class="lb-tab-content" data-lb-content="${p}">`;
    html += renderUserDashboard(p);
    html += `</div>`;
  });

  container.innerHTML = html;

  // Tab switching
  container.querySelectorAll('.lb-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      container.querySelectorAll('.lb-tab').forEach(t => t.classList.remove('active'));
      container.querySelectorAll('.lb-tab-content').forEach(c => c.classList.remove('active'));
      tab.classList.add('active');
      container.querySelector(`[data-lb-content="${tab.dataset.lbTab}"]`)?.classList.add('active');
    });
  });
}

// --- Summary tab ---
function renderSummaryTab() {
  const lang = currentLang;
  let html = '';

  // Overall ranking by money
  const allPlayers = getPlayers();
  const summary = [];
  allPlayers.forEach(player => {
    const money = calculatePlayerMoney(player);
    summary.push({ player, money, totalBalance: money.profit });
  });
  summary.sort((a, b) => b.totalBalance - a.totalBalance);

  // Money leaderboard
  html += `<div class="lb-section open">`;
  html += `<div class="lb-section-header"><h3>${lang === 'th' ? 'ยอดเงินรวม' : 'Money Total'}</h3><span class="lb-section-arrow">▼</span></div>`;
  html += `<div class="lb-section-body">`;

  const moneySorted = [...summary].sort((a, b) => b.totalBalance - a.totalBalance);
  html += '<table class="lb-table"><thead><tr>';
  html += `<th class="rank">#</th><th>${lang === 'th' ? 'ผู้เล่น' : 'Player'}</th>`;
  html += `<th class="pts-cell">${lang === 'th' ? 'ลงไป' : 'Bet'}</th>`;
  html += `<th class="pts-cell">${lang === 'th' ? 'ถูก' : 'Won'}</th>`;
  html += `<th class="pts-cell">${lang === 'th' ? 'ผิด' : 'Lost'}</th>`;
  html += `<th class="pts-cell">${lang === 'th' ? 'กำไร/ขาดทุน' : 'P/L'}</th>`;
  html += '</tr></thead><tbody>';

  moneySorted.forEach((s, i) => {
    const isMe = s.player === state.currentPlayer;
    const c = s.totalBalance >= 0 ? 'var(--accent)' : 'var(--wrong)';
    const sign = s.totalBalance >= 0 ? '+' : '';
    html += `<tr class="${isMe ? 'me' : ''}">`;
    html += `<td class="rank">${i + 1}</td>`;
    html += `<td class="player-name">${s.player}</td>`;
    html += `<td class="pts-cell">${s.money.totalBet}฿</td>`;
    html += `<td class="pts-cell" style="color:var(--accent)">${s.money.wins}</td>`;
    html += `<td class="pts-cell" style="color:var(--wrong)">${s.money.losses}</td>`;
    html += `<td class="pts-cell" style="color:${c};font-size:0.95rem;font-weight:700">${sign}${s.totalBalance}฿</td>`;
    html += '</tr>';
  });
  html += '</tbody></table>';
  html += `</div></div>`;

  // Rules
  html += `<div class="lb-section">`;
  html += `<div class="lb-section-header"><h3>${lang === 'th' ? 'กติกา' : 'Rules'}</h3><span class="lb-section-arrow">▼</span></div>`;
  html += `<div class="lb-section-body">`;
  html += renderRulesInline();
  html += `</div></div>`;

  return html;
}

// --- Per-user dashboard ---
function renderUserDashboard(player) {
  const lang = currentLang;
  const slipsDetail = calculatePlayerSlipsDetailed(player);
  const totalBalance = slipsDetail.total.profit;

  const fmtMoney = (v) => { const sg = v >= 0 ? '+' : ''; return `${sg}${v}฿`; };
  const moneyColor = (v) => v >= 0 ? 'var(--accent)' : 'var(--wrong)';

  let html = '';

  // Grand total banner
  html += `<div style="text-align:center;padding:16px;margin-bottom:12px;background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius-lg)">`;
  html += `<div style="font-size:0.85rem;color:var(--text-muted)">${lang === 'th' ? 'ยอดรวมทั้งหมด' : 'Grand Total'}</div>`;
  html += `<div style="font-size:1.8rem;font-weight:700;color:${moneyColor(totalBalance)}">${fmtMoney(totalBalance)}</div>`;
  html += `</div>`;

  // Slips detail
  html += `<div class="lb-section open">`;
  html += `<div class="lb-section-header"><h3>${lang === 'th' ? 'สลิปทั้งหมด' : 'All Slips'}: <span style="color:${moneyColor(totalBalance)}">${fmtMoney(totalBalance)}</span></h3><span class="lb-section-arrow">▼</span></div>`;
  html += `<div class="lb-section-body">`;

  if (slipsDetail.tickets.length === 0) {
    html += `<div style="color:var(--text-muted);font-size:0.85rem;text-align:center;padding:12px">${lang === 'th' ? 'ยังไม่มีสลิป' : 'No slips yet'}</div>`;
  } else {
    slipsDetail.tickets.reverse().forEach((tk, idx) => {
      const statusColor = { pending: 'var(--secondary)', won: 'var(--accent)', lost: 'var(--wrong)' };
      const isStep = tk.picks.length >= 3;
      html += `<div class="card" style="padding:8px;margin-bottom:6px">`;
      html += `<div style="display:flex;justify-content:space-between;font-size:0.8rem;margin-bottom:4px">`;
      html += `<span style="color:var(--text-muted)">#${idx + 1} ${isStep ? 'STEP' : 'SINGLE'} — ${new Date(tk.timestamp).toLocaleDateString('th-TH')}</span>`;
      html += `<span style="font-weight:700;color:${statusColor[tk.status]}">${tk.status.toUpperCase()}</span>`;
      html += `</div>`;
      tk.picks.forEach(p => {
        html += `<div style="font-size:0.75rem;display:flex;justify-content:space-between;padding:1px 0">`;
        html += `<span>${p.label} <span class="odds-tag">@${p.odds}</span></span>`;
        html += `<span>${p.resultBadge}</span>`;
        html += `</div>`;
      });
      html += `<div style="display:flex;justify-content:space-between;margin-top:4px;padding-top:4px;border-top:1px solid var(--border);font-size:0.85rem;font-weight:600">`;
      html += `<span>${tk.bet}฿ × ${tk.odds}</span>`;
      html += `<span style="color:${moneyColor(tk.profit)}">${fmtMoney(tk.profit)}</span>`;
      html += `</div></div>`;
    });
  }
  html += `</div></div>`;

  return html;
}

// --- Calculation helpers ---
function getPlayers() {
  const slips = state.allSlips.length ? state.allSlips : (state.slips || []);
  return state.players.length
    ? state.players.map(p => p.player_id)
    : [...new Set([
        ...Object.values(state.predictions).map(p => p.player || p.player_id),
        ...slips.map(s => s.player),
      ].filter(Boolean))].sort();
}

function hasScore(result) {
  if (!result) return false;
  return typeof result.team1_score === 'number' && typeof result.team2_score === 'number';
}

function calculatePlayerScores(player) {
  let resultPts = 0, exactCount = 0, correctCount = 0;
  MATCHES.forEach(m => {
    if (m.stage !== 'epl') return;
    const result = state.matches[m.id];
    if (!hasScore(result)) return;
    const key = m.id + ':' + player;
    const pred = state.predictions[key];
    if (!pred) return;
    const pts = calcResultPoints(Number(pred.team1_pred), Number(pred.team2_pred), Number(result.team1_score), Number(result.team2_score));
    resultPts += pts;
    if (pts === 3) exactCount++;
    else if (pts === 1) correctCount++;
  });
  return { resultPts, exactCount, correctCount };
}

function calculatePlayerMoney(player) {
  let profit = 0, wins = 0, losses = 0, totalBet = 0;
  const allSlips = state.allSlips.length ? state.allSlips : (state.slips || []);
  const playerSlips = allSlips.filter(s => s.player === player && s.status !== 'cancelled' && s.status === 'approved');

  playerSlips.forEach(slip => {
    const resolved = resolveSlip(slip);
    totalBet += slip.bet;
    if (resolved.status === 'won') {
      profit += resolved.profit;
      wins++;
    } else if (resolved.status === 'lost') {
      profit += resolved.profit;
      losses++;
    }
  });

  return { profit, wins, losses, totalBet };
}

function calculatePlayerSlipsDetailed(player) {
  const lang = currentLang;
  let total = { profit: 0, totalBet: 0 };
  const tickets = [];
  const allSlips = state.allSlips.length ? state.allSlips : (state.slips || []);

  allSlips.filter(s => s.player === player && s.status !== 'cancelled').forEach(slip => {
    const resolved = resolveSlip(slip);
    total.profit += resolved.profit;
    total.totalBet += slip.bet;

    const picks = (slip.picks || []).map(p => {
      const match = MATCHES.find(m => m.id === p.match_id);
      const result = state.matches[p.match_id];
      let label = '', resultBadge = '';

      if (p.type === 'ou') {
        const ouLine = state.ouLines[p.match_id] || '';
        label = `${p.pick === 'over' ? (lang === 'th' ? 'สูง' : 'O') : (lang === 'th' ? 'ต่ำ' : 'U')} ${ouLine}`;
        if (result && typeof result.team1_score === 'number' && typeof result.team2_score === 'number') {
          const outcome = getOUOutcome(parseFloat(ouLine), result.team1_score + result.team2_score);
          const res = outcome[p.pick];
          if (res === 'full') resultBadge = '<span class="badge badge-exact">✓</span>';
          else if (res === 'half') resultBadge = '<span class="badge badge-exact">½✓</span>';
          else if (res === 'push') resultBadge = '<span class="badge badge-correct">Push</span>';
          else if (res === 'half_loss') resultBadge = '<span class="badge badge-wrong">½✗</span>';
          else resultBadge = '<span class="badge badge-wrong">✗</span>';
        }
      } else {
        const picked = TEAMS[p.pick];
        label = `${picked?.flag || ''} ${picked ? (lang === 'th' ? picked.nameTh : picked.name) : p.pick}`;
        const ahLine = state.ahLines[p.match_id];
        if (ahLine && match) {
          const isHome = p.pick === match.team1;
          label += ' ' + formatAhFav(ahLine, isHome);
        }
        if (match && result && typeof result.team1_score === 'number' && typeof result.team2_score === 'number') {
          const ahLine = state.ahLines[p.match_id];
          if (ahLine) {
            const outcome = getAHOutcome(parseFloat(ahLine), result.team1_score, result.team2_score);
            const side = p.pick === match.team1 ? 'team1' : 'team2';
            const res = outcome[side];
            if (res === 'full') resultBadge = '<span class="badge badge-exact">✓</span>';
            else if (res === 'half') resultBadge = '<span class="badge badge-exact">½✓</span>';
            else if (res === 'push') resultBadge = '<span class="badge badge-correct">Push</span>';
            else if (res === 'half_loss') resultBadge = '<span class="badge badge-wrong">½✗</span>';
            else resultBadge = '<span class="badge badge-wrong">✗</span>';
          }
        }
      }

      return { label, odds: p.odds, resultBadge };
    });

    tickets.push({
      timestamp: slip.timestamp,
      bet: slip.bet,
      odds: slip.combined_odds || slip.odds,
      status: resolved.status,
      profit: resolved.profit,
      picks,
    });
  });

  return { total, tickets };
}

// --- Rules inline ---
function renderRulesInline() {
  const lang = currentLang;
  return `
    <div class="rules-section">
      <h3>${lang === 'th' ? 'แทงบอล (AH / สูงต่ำ)' : 'Betting (AH / O/U)'}</h3>
      <table class="rules-table">
        <tr><td>${lang === 'th' ? '1 คู่ = Single' : '1 pick = Single'}</td><td style="font-weight:700">${lang === 'th' ? 'ลงเงิน × odds' : 'Bet × odds'}</td></tr>
        <tr><td>${lang === 'th' ? '3+ คู่ = Step' : '3+ picks = Step'}</td><td style="font-weight:700">${lang === 'th' ? 'ลงเงิน × odds รวม' : 'Bet × combined odds'}</td></tr>
        <tr><td>${lang === 'th' ? 'ถูก' : 'Correct'}</td><td style="color:var(--accent);font-weight:700">${lang === 'th' ? 'ได้ เงินลง × odds' : 'Bet × odds'}</td></tr>
        <tr><td>${lang === 'th' ? 'ผิด' : 'Wrong'}</td><td style="color:var(--wrong);font-weight:700">${lang === 'th' ? 'เสียเงินที่ลง' : 'Lose bet'}</td></tr>
        <tr><td>${lang === 'th' ? 'เสมอ (Push)' : 'Push'}</td><td style="font-weight:700">${lang === 'th' ? 'เงินคืน' : 'Money back'}</td></tr>
      </table>
    </div>

    <div class="rules-section">
      <h3>${lang === 'th' ? 'กฎทั่วไป' : 'General'}</h3>
      <div class="rules-note">
        ${lang === 'th'
          ? 'ทายได้จนถึงเวลาเตะ = ล็อคอัตโนมัติ<br>ลบสลิปได้ก่อนบอลเตะ<br>รอบ Knockout เปิดหลังจบรอบกลุ่ม (27 มิ.ย.)'
          : 'Predictions lock at kickoff<br>Can delete slip before kickoff<br>Knockout opens after group stage (Jun 27)'}
      </div>
    </div>
  `;
}

// --- Admin: Approve slips (Pok only) ---
function renderAdminApprove() {
  const lang = currentLang;
  const allSlips = state.allSlips.length ? state.allSlips : (state.slips || []);

  // Show all slips NOT yet approved (pending, won, lost — anything without 'approved')
  const unapproved = allSlips.filter(s => s.status !== 'cancelled' && s.status !== 'approved');

  let html = '';

  if (unapproved.length === 0) {
    html += `<div style="text-align:center;padding:30px;color:var(--text-muted)">${lang === 'th' ? 'ไม่มีสลิปรอตรวจ' : 'No slips to review'}</div>`;
    return html;
  }

  html += `<div style="margin-bottom:12px;font-size:0.85rem;color:var(--text-muted)">${lang === 'th' ? 'สลิปที่ยังไม่ยืนยัน' : 'Unapproved slips'}: ${unapproved.length}</div>`;

  // Sort: resolved (won/lost) first, then pending
  unapproved.sort((a, b) => {
    const aResolved = resolveSlip(a);
    const bResolved = resolveSlip(b);
    const aDone = aResolved.status === 'won' || aResolved.status === 'lost' ? 0 : 1;
    const bDone = bResolved.status === 'won' || bResolved.status === 'lost' ? 0 : 1;
    if (aDone !== bDone) return aDone - bDone;
    return b.timestamp - a.timestamp;
  });

  unapproved.forEach(slip => {
    const resolved = resolveSlip(slip);
    const picks = slip.picks || [];
    const isStep = picks.length >= 3;

    const statusColor = { pending: 'var(--secondary)', won: 'var(--accent)', lost: 'var(--wrong)' };
    const statusLabel = { pending: lang === 'th' ? 'รอผล' : 'Pending', won: lang === 'th' ? 'ถูก' : 'Won', lost: lang === 'th' ? 'ผิด' : 'Lost' };
    const displayStatus = resolved.status;

    html += `<div class="card" style="padding:10px;margin-bottom:8px">`;

    // Header: player + status + approve button
    html += `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">`;
    html += `<div>`;
    html += `<span style="font-size:0.85rem;font-weight:700">${slip.player}</span>`;
    html += `<span style="font-size:0.75rem;color:var(--text-muted);margin-left:8px">#${isStep ? 'STEP' : 'SINGLE'} · ${new Date(slip.timestamp).toLocaleDateString('th-TH')}</span>`;
    html += `</div>`;
    html += `<div style="display:flex;align-items:center;gap:8px">`;
    html += `<span style="font-size:0.8rem;font-weight:700;color:${statusColor[displayStatus]}">${statusLabel[displayStatus]}</span>`;
    html += `<button class="admin-approve-btn" data-ts="${slip.timestamp}" style="background:var(--accent);color:#000;border:none;padding:4px 12px;border-radius:4px;font-size:0.75rem;font-weight:700;cursor:pointer">${lang === 'th' ? '✓ ยืนยัน' : '✓ Approve'}</button>`;
    html += `</div></div>`;

    // Picks detail
    picks.forEach(p => {
      const match = MATCHES.find(m => m.id === p.match_id);
      if (!match) return;
      const t1 = TEAMS[match.team1];
      const t2 = TEAMS[match.team2];
      const isOu = p.type === 'ou';
      const t1Name = t1 ? (lang === 'th' ? t1.nameTh : t1.name) : match.team1;
      const t2Name = t2 ? (lang === 'th' ? t2.nameTh : t2.name) : match.team2;

      let pickLabel = '';
      if (isOu) {
        const lineLabel = p.line || state.ouLines[match.id] || '';
        pickLabel = `${p.pick === 'over' ? (lang === 'th' ? 'สูง' : 'O') : (lang === 'th' ? 'ต่ำ' : 'U')} ${lineLabel}`;
      } else {
        const picked = TEAMS[p.pick];
        const lineLabel = p.line || state.ahLines[match.id] || '';
        const isHome = p.pick === match.team1;
        const ahSide = lineLabel ? formatAhFav(lineLabel, isHome) : '';
        pickLabel = `${picked?.flag || ''} ${picked ? (lang === 'th' ? picked.nameTh : picked.name) : p.pick} ${ahSide}`;
      }

      const resultBadge = getPickResultBadge(p, match);

      html += `<div style="font-size:0.75rem;display:flex;justify-content:space-between;padding:1px 0">`;
      html += `<span>${pickLabel} <span class="odds-tag">@${p.odds}</span> ${resultBadge}</span>`;
      html += `<span style="color:var(--text-muted)">${t1?.flag || ''} ${t1Name} vs ${t2?.flag || ''} ${t2Name}</span>`;
      html += `</div>`;
    });

    // Footer
    html += `<div style="margin-top:6px;padding-top:6px;border-top:1px solid var(--border);display:flex;justify-content:space-between;font-size:0.85rem">`;
    html += `<span>${slip.bet}฿ × ${slip.combined_odds || slip.odds}</span>`;
    if (displayStatus === 'won') {
      html += `<span style="color:var(--accent);font-weight:700">+${resolved.profit}฿</span>`;
    } else if (displayStatus === 'lost') {
      html += `<span style="color:var(--wrong);font-weight:700">${resolved.profit}฿</span>`;
    } else {
      html += `<span style="color:var(--accent)">${lang === 'th' ? 'จ่าย' : 'Payout'}: ${slip.payout}฿</span>`;
    }
    html += `</div></div>`;
  });

  return html;
}

// --- Auto-resolve slip from match results ---
function resolveSlip(slip) {
  const picks = slip.picks || [];
  if (!picks.length) return { status: 'pending', profit: 0 };

  const isStep = picks.length >= 3;

  // Resolve each pick that has a score
  const outcomes = picks.map(p => {
    const result = state.matches[p.match_id];
    return { pick: p, outcome: getPickOutcome(p, result) };
  });

  // Step: full loss on any leg = whole step dead
  // half_loss on any leg = half the step pushed back, half lost
  if (isStep) {
    const anyFullLoss = outcomes.some(o => o.outcome === 'loss');
    const anyHalfLoss = outcomes.some(o => o.outcome === 'half_loss');
    if (anyFullLoss) return { status: 'lost', profit: -slip.bet };
    if (anyHalfLoss) return { status: 'lost', profit: -Math.round(slip.bet / 2) };
  }

  // Check if ALL picks have scores
  const allResolved = outcomes.every(o => o.outcome !== null);
  if (!allResolved) return { status: 'pending', profit: 0 };

  if (isStep) {
    let combinedOdds = 1;
    outcomes.forEach(({ pick: p, outcome }) => {
      if (outcome === 'full') combinedOdds *= p.odds;
      else if (outcome === 'half') combinedOdds *= (1 + (p.odds - 1) / 2);
      // push = skip (multiply by 1)
    });
    const payout = Math.round(slip.bet * combinedOdds);
    return { status: 'won', profit: payout - slip.bet };
  }

  // Single: independent outcome
  const { pick: p, outcome } = outcomes[0];

  if (outcome === 'full') return { status: 'won', profit: Math.round(slip.bet * p.odds) - slip.bet };
  if (outcome === 'half') {
    const halfPayout = Math.round(slip.bet * (1 + (p.odds - 1) / 2));
    return { status: 'won', profit: halfPayout - slip.bet };
  }
  if (outcome === 'push') return { status: 'won', profit: 0 };
  if (outcome === 'half_loss') return { status: 'lost', profit: -Math.round(slip.bet / 2) };
  return { status: 'lost', profit: -slip.bet };
}

function getPickOutcome(pick, result) {
  if (!result || typeof result.team1_score !== 'number' || typeof result.team2_score !== 'number') return null;

  if (pick.type === 'ou') {
    const ouLine = pick.line || state.ouLines[pick.match_id];
    if (!ouLine) return null;
    const outcome = getOUOutcome(parseFloat(ouLine), result.team1_score + result.team2_score);
    return outcome[pick.pick];
  }

  const match = MATCHES.find(m => m.id === pick.match_id);
  if (!match) return null;
  const ahLine = pick.line || state.ahLines[pick.match_id];
  if (!ahLine) return null;
  const outcome = getAHOutcome(parseFloat(ahLine), result.team1_score, result.team2_score);
  const side = pick.pick === match.team1 ? 'team1' : 'team2';
  return outcome[side];
}

// --- Core calculation functions ---
function getAHOutcome(line, score1, score2) {
  const quarters = Math.round(line * 4);
  const isQuarter = Math.abs(quarters % 2) === 1;
  if (!isQuarter) {
    const diff = score1 + line - score2;
    if (diff > 0) return { team1: 'full', team2: 'loss' };
    if (diff === 0) return { team1: 'push', team2: 'push' };
    return { team1: 'loss', team2: 'full' };
  }
  const lineLow = Math.floor(line * 2) / 2;
  const lineHigh = Math.ceil(line * 2) / 2;
  function subResult(ln) {
    const d = score1 + ln - score2;
    if (d > 0) return 1;
    if (d === 0) return 0;
    return -1;
  }
  const total = subResult(lineLow) + subResult(lineHigh);
  if (total === 2) return { team1: 'full', team2: 'loss' };
  if (total === 1) return { team1: 'half', team2: 'half_loss' };
  if (total === 0) return { team1: 'push', team2: 'push' };
  if (total === -1) return { team1: 'half_loss', team2: 'half' };
  return { team1: 'loss', team2: 'full' };
}

function getOUOutcome(line, totalGoals) {
  // Check if quarter line (e.g., 1.75, 2.25)
  const quarters = Math.round(line * 4);
  const isQuarter = Math.abs(quarters % 2) === 1;

  if (isQuarter) {
    const lineLow = Math.floor(line * 2) / 2;
    const lineHigh = Math.ceil(line * 2) / 2;
    function subResult(ln) {
      const d = totalGoals - ln;
      if (d > 0) return 1;
      if (d === 0) return 0;
      return -1;
    }
    const total = subResult(lineLow) + subResult(lineHigh);
    if (total === 2) return { over: 'full', under: 'loss' };
    if (total === 1) return { over: 'half', under: 'half_loss' };
    if (total === 0) return { over: 'push', under: 'push' };
    if (total === -1) return { over: 'half_loss', under: 'half' };
    return { over: 'loss', under: 'full' };
  }

  // Standard line (e.g., 1.5, 2.0, 2.5)
  const diff = totalGoals - line;
  if (diff > 0) return { over: 'full', under: 'loss' };
  if (diff === 0) return { over: 'push', under: 'push' };
  return { over: 'loss', under: 'full' };
}

function calcResultPoints(pred1, pred2, actual1, actual2) {
  if (pred1 === undefined || pred2 === undefined) return 0;
  if (pred1 === actual1 && pred2 === actual2) return 3;
  const predDiff = pred1 - pred2;
  const actualDiff = actual1 - actual2;
  if ((predDiff > 0 && actualDiff > 0) || (predDiff < 0 && actualDiff < 0) || (predDiff === 0 && actualDiff === 0)) return 1;
  return 0;
}
