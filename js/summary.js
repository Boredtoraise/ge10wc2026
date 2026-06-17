// Summary — leaderboard (score) + money (slips) + per-user dashboard

function renderSummary() {
  const container = document.getElementById('view-summary');
  const lang = currentLang;
  const players = getPlayers();

  let html = '';

  const tabPlayers = players;

  html += `<div class="lb-tabs">`;
  html += `<button class="lb-tab active" data-lb-tab="summary">${lang === 'th' ? 'สรุป' : 'Summary'}</button>`;
  tabPlayers.forEach(p => {
    const isMe = p === state.currentPlayer;
    html += `<button class="lb-tab${isMe ? ' me' : ''}" data-lb-tab="${p}">${p}${isMe ? ' ★' : ''}</button>`;
  });
  html += `</div>`;

  // Summary tab
  html += `<div class="lb-tab-content active" data-lb-content="summary">`;
  html += renderSummaryTab();
  html += `</div>`;

  // Per-user tabs
  tabPlayers.forEach(p => {
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

  // Approve buttons (admin only)
  container.querySelectorAll('.slip-approve-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const ts = btn.dataset.ts;
      const result = await approveSlip(ts);
      if (result && result.success) {
        const allSlips = getAllSlips();
        const slip = allSlips.find(s => String(s.timestamp) === String(ts));
        if (slip) slip.status = 'approved';
        renderSummary();
      }
    });
  });
}

// --- Summary tab ---
function renderSummaryTab() {
  const lang = currentLang;
  let html = '';

  if (state.isAdmin) {
    html += renderAdminSummary();
  }

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
  const rankIcon = ['🏆', '🥈', '🥉'];
  moneySorted.forEach((s, i) => {
    const isMe = s.player === state.currentPlayer;
    const c = s.totalBalance >= 0 ? 'var(--accent)' : 'var(--wrong)';
    const sign = s.totalBalance >= 0 ? '+' : '';
    const icon = rankIcon[i] || `${i + 1}.`;
    const border = i === 0 ? 'border:2px solid var(--accent);' : isMe ? 'border:1px solid var(--secondary);' : '';
    html += `<div style="display:flex;align-items:center;gap:12px;padding:12px 14px;margin-bottom:8px;background:var(--bg-card);border-radius:var(--radius-lg);${border}">`;
    html += `<span style="font-size:1.4rem;min-width:28px;text-align:center">${icon}</span>`;
    html += `<div style="flex:1;min-width:0">`;
    html += `<div style="font-weight:700;font-size:0.95rem">${s.player}${isMe ? ' <span style="color:var(--secondary);font-size:0.75rem">★ ฉัน</span>' : ''}</div>`;
    html += `<div style="font-size:0.75rem;color:var(--text-muted);margin-top:2px">${lang === 'th' ? 'ลง' : 'Bet'} ${s.money.totalBet}฿ · ${lang === 'th' ? 'ถูก' : 'W'} ${s.money.wins} · ${lang === 'th' ? 'ผิด' : 'L'} ${s.money.losses}</div>`;
    html += `</div>`;
    html += `<span style="font-size:1.15rem;font-weight:800;color:${c};white-space:nowrap">${sign}${s.totalBalance}฿</span>`;
    html += `</div>`;
  });
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

  // Admin's own tab = house dashboard + approve queue
  if (state.isAdmin && player === state.currentPlayer) {
    const allSlips = getAllSlips();
    const toApprove = allSlips
      .filter(s => s.status !== 'cancelled' && s.status !== 'approved')
      .sort((a, b) => {
        const aR = resolveSlip(a), bR = resolveSlip(b);
        const aD = (aR.status === 'won' || aR.status === 'lost') ? 0 : 1;
        const bD = (bR.status === 'won' || bR.status === 'lost') ? 0 : 1;
        return aD - bD || new Date(b.timestamp) - new Date(a.timestamp);
      });
    let html = renderHouseDashboard();
    html += `<div style="margin:16px 0 8px;font-size:0.85rem;color:var(--text-muted);font-weight:700">${lang === 'th' ? 'รอยืนยัน' : 'Pending approval'} (${toApprove.length})</div>`;
    if (!toApprove.length) {
      html += `<div style="text-align:center;padding:20px;color:var(--text-muted)">${lang === 'th' ? 'ไม่มีสลิปรอตรวจ' : 'Nothing to approve'}</div>`;
    } else {
      toApprove.forEach(slip => { html += renderSlipCard(slip, { showPlayer: true }); });
    }
    return html;
  }

  const slipsDetail = calculatePlayerSlipsDetailed(player);
  const totalBalance = slipsDetail.total.profit;

  const fmtMoney = (v) => { const sg = v >= 0 ? '+' : ''; return `${sg}${v}฿`; };
  const moneyColor = (v) => v >= 0 ? 'var(--accent)' : 'var(--wrong)';

  let html = '';

  // Grand total banner
  html += `<div style="text-align:center;padding:16px;margin-bottom:8px;background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius-lg)">`;
  html += `<div style="font-size:0.85rem;color:var(--text-muted)">${lang === 'th' ? 'ยอดรวมทั้งหมด' : 'Grand Total'}</div>`;
  html += `<div style="font-size:1.8rem;font-weight:700;color:${moneyColor(totalBalance)}">${fmtMoney(totalBalance)}</div>`;
  html += `</div>`;

  // Win / Loss / Pending breakdown row
  const { totalWon, totalLost, pendingBet, pendingPayout } = slipsDetail.total;
  html += `<div style="display:flex;gap:8px;margin-bottom:12px">`;
  html += `<div style="flex:1;text-align:center;padding:10px 6px;background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius)">`;
  html += `<div style="font-size:0.72rem;color:var(--text-muted);margin-bottom:2px">${lang === 'th' ? 'บวกรวม' : 'Total Won'}</div>`;
  html += `<div style="font-size:1rem;font-weight:700;color:var(--accent)">+${totalWon}฿</div>`;
  html += `</div>`;
  html += `<div style="flex:1;text-align:center;padding:10px 6px;background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius)">`;
  html += `<div style="font-size:0.72rem;color:var(--text-muted);margin-bottom:2px">${lang === 'th' ? 'ลบรวม' : 'Total Lost'}</div>`;
  html += `<div style="font-size:1rem;font-weight:700;color:var(--secondary)">${totalLost}฿</div>`;
  html += `</div>`;
  if (pendingBet > 0) {
    html += `<div style="flex:1;text-align:center;padding:10px 6px;background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius)">`;
    html += `<div style="font-size:0.72rem;color:var(--text-muted);margin-bottom:2px">${lang === 'th' ? 'รอผล' : 'Pending'}</div>`;
    html += `<div style="font-size:1rem;font-weight:700;color:var(--text-primary)">${pendingBet}฿</div>`;
    html += `<div style="font-size:0.68rem;color:var(--text-muted)">${lang === 'th' ? 'จ่าย' : 'payout'} ${pendingPayout}฿</div>`;
    html += `</div>`;
  }
  html += `</div>`;

  // All pending slips (not yet settled in sheet)
  const allSlipsAll = getAllSlips();
  const todayPending = allSlipsAll.filter(s => s.player === player && s.status === 'pending');
  if (todayPending.length > 0) {
    const todayRoiBplus  = todayPending.reduce((sum, s) => sum + ((s.payout || 0) - (s.bet || 0)), 0);
    const todayRoiMinus  = todayPending.reduce((sum, s) => sum + (s.bet || 0), 0);
    html += `<div style="margin-bottom:12px;padding:10px 12px;background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius)">`;
    html += `<div style="font-size:0.78rem;font-weight:700;color:var(--text-muted);margin-bottom:8px">${lang === 'th' ? 'สลิปรอ' : 'Pending'} (${todayPending.length})</div>`;
    html += `<div style="display:flex;gap:12px">`;
    html += `<div style="flex:1;text-align:center">`;
    html += `<div style="font-size:0.7rem;color:var(--text-muted);margin-bottom:2px">${lang === 'th' ? 'รอบวก' : 'Max Win'}</div>`;
    html += `<div style="font-size:1.05rem;font-weight:700;color:var(--accent)">+${todayRoiBplus}฿</div>`;
    html += `</div>`;
    html += `<div style="width:1px;background:var(--border)"></div>`;
    html += `<div style="flex:1;text-align:center">`;
    html += `<div style="font-size:0.7rem;color:var(--text-muted);margin-bottom:2px">${lang === 'th' ? 'รอลบ' : 'Max Loss'}</div>`;
    html += `<div style="font-size:1.05rem;font-weight:700;color:var(--secondary)">-${todayRoiMinus}฿</div>`;
    html += `</div>`;
    html += `</div></div>`;
  }

  // Slips detail — unified renderSlipCard
  const playerSlips = (getAllSlips())
    .filter(s => s.player === player && s.status !== 'cancelled')
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  html += `<div class="lb-section open">`;
  html += `<div class="lb-section-header"><h3>${lang === 'th' ? 'สลิปทั้งหมด' : 'All Slips'}: <span style="color:${moneyColor(totalBalance)}">${fmtMoney(totalBalance)}</span></h3><span class="lb-section-arrow">▼</span></div>`;
  html += `<div class="lb-section-body">`;
  if (!playerSlips.length) {
    html += `<div style="color:var(--text-muted);font-size:0.85rem;text-align:center;padding:12px">${lang === 'th' ? 'ยังไม่มีสลิป' : 'No slips yet'}</div>`;
  } else {
    playerSlips.forEach(slip => { html += renderSlipCard(slip, { showDetails: true }); });
  }
  html += `</div></div>`;

  return html;
}

// --- Calculation helpers ---
function getPlayers() {
  const slips = getAllSlips();
  return state.players.length
    ? state.players.filter(p => String(p.is_admin).toLowerCase() !== 'true').map(p => p.player_id)
    : [...new Set(slips.map(s => s.player).filter(Boolean))].sort();
}


function calculatePlayerMoney(player) {
  let profit = 0, wins = 0, losses = 0, totalBet = 0;
  const allSlips = getAllSlips();
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
  let total = { profit: 0, totalBet: 0, totalWon: 0, totalLost: 0, pendingBet: 0, pendingPayout: 0 };
  const tickets = [];
  const allSlips = getAllSlips();

  allSlips.filter(s => s.player === player && s.status !== 'cancelled').forEach(slip => {
    const resolved = resolveSlip(slip);
    total.profit += resolved.profit;
    total.totalBet += slip.bet;
    if (resolved.status === 'won') total.totalWon += resolved.profit;
    else if (resolved.status === 'lost') total.totalLost += resolved.profit;
    else if (resolved.status === 'pending') { total.pendingBet += slip.bet; total.pendingPayout += slip.payout || 0; }

    const picks = (slip.picks || []).map(p => {
      const match = (state.matchById && state.matchById[p.match_id]) || MATCHES.find(m => m.id === p.match_id);
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
        label = `${picked ? (lang === 'th' ? picked.nameTh : picked.name) : p.pick}`;
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

function getMatchRoundDate(m) {
  // Round boundary = 14:00 TH — matches before 14:00 TH belong to previous day's round
  const thaiMs = etToThai(m.date).getTime() + 7 * 3600000;
  const thaiDate = new Date(thaiMs);
  const minuteOfDay = thaiDate.getUTCHours() * 60 + thaiDate.getUTCMinutes();
  const roundMs = minuteOfDay < 14 * 60 ? thaiMs - 24 * 3600000 : thaiMs;
  return new Date(roundMs).toISOString().slice(0, 10);
}

function getTodayMatches() {
  // Current round date: if now is before 14:00 TH, we're still in yesterday's round
  const nowTH = Date.now() + 7 * 3600000;
  const nowDate = new Date(nowTH);
  const nowMinuteOfDay = nowDate.getUTCHours() * 60 + nowDate.getUTCMinutes();
  const currentRoundMs = nowMinuteOfDay < 14 * 60 ? nowTH - 24 * 3600000 : nowTH;
  const currentRound = new Date(currentRoundMs).toISOString().slice(0, 10);

  const withLines = MATCHES.filter(m => state.ahLines[m.id] || state.ouLines[m.id]);
  const byDate = {};
  withLines.forEach(m => {
    const d = getMatchRoundDate(m);
    if (!byDate[d]) byDate[d] = [];
    byDate[d].push(m);
  });
  const dates = Object.keys(byDate).sort().filter(d => d >= currentRound);
  for (const d of dates) {
    const group = byDate[d];
    const allScored = group.every(m => {
      const r = state.matches[m.id];
      return r && typeof r.team1_score === 'number' && typeof r.team2_score === 'number';
    });
    if (!allScored) return group;
  }
  return byDate[dates[dates.length - 1]] || [];
}

// --- Admin: Summary card (สรุป tab) — totals + P&L chart ---
function renderAdminSummary() {
  const lang = currentLang;
  const allSlips = getAllSlips();
  const slips = allSlips.filter(s => s.status !== 'cancelled');

  let wonCount = 0, lostCount = 0, pendingCount = 0;
  let pokPaidOut = 0, pokCollected = 0;
  slips.forEach(s => {
    const r = resolveSlip(s);
    if (r.status === 'won')       { wonCount++;    pokPaidOut   += r.profit; }
    else if (r.status === 'lost') { lostCount++;   pokCollected += Math.abs(r.profit); }
    else                          { pendingCount++; }
  });
  const pokNet   = pokCollected - pokPaidOut;
  const netColor = pokNet >= 0 ? 'var(--accent)' : 'var(--secondary)';
  const netSign  = pokNet >= 0 ? '+' : '';

  let html = '';

  // Slip count row
  html += `<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-bottom:10px">`;
  [
    { label: lang === 'th' ? 'ทั้งหมด' : 'Total',   val: slips.length,   color: 'var(--text-primary)' },
    { label: lang === 'th' ? 'ถูกแล้ว' : 'Won',     val: wonCount,       color: 'var(--accent)'       },
    { label: lang === 'th' ? 'ผิดแล้ว' : 'Lost',    val: lostCount,      color: 'var(--secondary)'    },
    { label: lang === 'th' ? 'รอผล'   : 'Pending',  val: pendingCount,   color: 'var(--text-muted)'   },
  ].forEach(({ label, val, color }) => {
    html += `<div style="text-align:center;padding:8px 4px;background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius)">`;
    html += `<div style="font-size:0.68rem;color:var(--text-muted);margin-bottom:3px">${label}</div>`;
    html += `<div style="font-size:1.1rem;font-weight:700;color:${color}">${val}</div>`;
    html += `</div>`;
  });
  html += `</div>`;

  // House position card
  html += `<div style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius-lg);padding:12px 14px;margin-bottom:10px">`;
  html += `<div style="font-size:0.78rem;font-weight:700;color:var(--text-muted);margin-bottom:10px">${lang === 'th' ? 'สถานะเงิน (มุมมองเจ้ามือ)' : 'House Position'}</div>`;
  html += `<div style="display:flex;justify-content:space-between;margin-bottom:6px">`;
  html += `<span style="font-size:0.82rem;color:var(--text-muted)">${lang === 'th' ? 'เก็บจากที่ผิด' : 'Collected (losses)'}</span>`;
  html += `<span style="font-size:0.88rem;font-weight:700;color:var(--accent)">+${pokCollected}฿</span>`;
  html += `</div>`;
  html += `<div style="display:flex;justify-content:space-between;margin-bottom:10px">`;
  html += `<span style="font-size:0.82rem;color:var(--text-muted)">${lang === 'th' ? 'จ่ายให้ที่ถูก' : 'Paid out (wins)'}</span>`;
  html += `<span style="font-size:0.88rem;font-weight:700;color:var(--secondary)">-${pokPaidOut}฿</span>`;
  html += `</div>`;
  html += `<div style="display:flex;justify-content:space-between;padding-top:8px;border-top:1px solid var(--border)">`;
  html += `<span style="font-size:0.9rem;font-weight:700">${lang === 'th' ? 'กำไรตอนนี้' : 'Net so far'}</span>`;
  html += `<span style="font-size:1.1rem;font-weight:800;color:${netColor}">${netSign}${pokNet}฿</span>`;
  html += `</div>`;
  html += `</div>`;

  // P&L chart by round (14:00 Thai boundary)
  function getRoundKey(s) {
    const picks = s.picks || [];
    if (!picks.length) return null;
    const match = (state.matchById || {})[picks[0].match_id]
                || MATCHES.find(m => m.id === picks[0].match_id);
    if (!match) return null;
    const thaiMs = etToThai(match.date).getTime() + 7 * 3600 * 1000;
    const d = new Date(thaiMs);
    if (d.getUTCHours() < 14) d.setUTCDate(d.getUTCDate() - 1);
    return d.toISOString().slice(0, 10);
  }

  const byRound = {};
  slips.forEach(s => {
    const key = getRoundKey(s);
    if (!key) return;
    if (!byRound[key]) byRound[key] = { net: 0 };
    const r = resolveSlip(s);
    if (r.status === 'won')       byRound[key].net -= r.profit;
    else if (r.status === 'lost') byRound[key].net += Math.abs(r.profit);
  });
  const rounds = Object.keys(byRound).filter(k => byRound[k].net !== 0).sort();

  if (rounds.length > 0) {
    const maxAbs = Math.max(...rounds.map(k => Math.abs(byRound[k].net)));
    const BAR_MAX = 120;
    let cumulative = 0;
    html += `<div style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius-lg);padding:12px 14px;margin-bottom:10px">`;
    html += `<div style="font-size:0.78rem;font-weight:700;color:var(--text-muted);margin-bottom:10px">${lang === 'th' ? 'กำไร/ขาดทุน · รายรอบ' : 'P&L · By Round'}</div>`;
    rounds.forEach(key => {
      const net = byRound[key].net;
      cumulative += net;
      const barW = Math.round(Math.abs(net) / maxAbs * BAR_MAX);
      const isPos = net >= 0;
      const barColor = isPos ? 'var(--accent)' : 'var(--secondary)';
      const amtColor = isPos ? 'var(--accent)' : 'var(--secondary)';
      const amtStr  = (isPos ? '+' : '') + net + '฿';
      const [yr, mo, dy] = key.split('-').map(Number);
      const dateLabel = new Date(Date.UTC(yr, mo - 1, dy))
        .toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
      html += `<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">`;
      html += `<span style="font-size:0.72rem;color:var(--text-muted);width:52px;flex-shrink:0">${dateLabel}</span>`;
      html += `<div style="flex:1;height:14px;background:var(--bg-input);border-radius:3px;overflow:hidden">`;
      html += `<div style="width:${barW}px;max-width:100%;height:100%;background:${barColor};border-radius:3px"></div>`;
      html += `</div>`;
      html += `<span style="font-size:0.78rem;font-weight:700;color:${amtColor};width:52px;text-align:right;flex-shrink:0">${amtStr}</span>`;
      html += `</div>`;
    });
    const cumColor = cumulative >= 0 ? 'var(--accent)' : 'var(--secondary)';
    const cumStr   = (cumulative >= 0 ? '+' : '') + cumulative + '฿';
    html += `<div style="display:flex;justify-content:space-between;border-top:1px solid var(--border);padding-top:8px;margin-top:2px">`;
    html += `<span style="font-size:0.82rem;font-weight:700;color:var(--text-muted)">${lang === 'th' ? 'สะสม' : 'Total'}</span>`;
    html += `<span style="font-size:1rem;font-weight:800;color:${cumColor}">${cumStr}</span>`;
    html += `</div>`;
    html += `</div>`;
  }

  return html;
}

// --- Admin: House (Pok) today dashboard (แทงบอล tab) ---
function renderHouseDashboard() {
  const lang = currentLang;
  const allSlips = getAllSlips();
  const slips = allSlips.filter(s => s.status !== 'cancelled');

  let wonCount = 0, lostCount = 0, pendingCount = 0;
  let pokPaidOut = 0;      // money paid to winning players (expense)
  let pokCollected = 0;    // money kept from losing players (revenue)
  let pendingWorstPay = 0; // if all pending WIN: extra Pok must pay (player profit)
  let pendingBestKeep = 0; // if all pending LOSE: extra Pok keeps (bets)

  slips.forEach(s => {
    const r = resolveSlip(s);
    if (r.status === 'won') {
      wonCount++;
      pokPaidOut += r.profit; // positive = Pok paid this much to player
    } else if (r.status === 'lost') {
      lostCount++;
      pokCollected += Math.abs(r.profit); // negative profit = Pok's gain
    } else {
      pendingCount++;
      pendingWorstPay  += Math.max(0, (s.payout || 0) - (s.bet || 0));
      pendingBestKeep  += (s.bet || 0);
    }
  });

  const pokNet = pokCollected - pokPaidOut;
  const netColor = pokNet >= 0 ? 'var(--accent)' : 'var(--secondary)';
  const netSign  = pokNet >= 0 ? '+' : '';

  let html = '';

  // Today's round exposure
  const todayMatches = getTodayMatches().sort((a, b) => etToThai(a.date) - etToThai(b.date));
  let todayRoundPendingCount = 0;
  if (todayMatches.length > 0) {
    const todayIds = new Set(todayMatches.map(m => m.id));
    const allSlipsForToday = allSlips.filter(s => s.status !== 'cancelled' && (s.picks || []).some(p => todayIds.has(p.match_id)));
    let todayWonCount = 0, todayLostCount = 0, todayWonPaid = 0, todayLostKept = 0;
    const todayPending = [];
    allSlipsForToday.forEach(s => {
      const r = resolveSlip(s);
      if (r.status === 'won')       { todayWonCount++;  todayWonPaid  += r.profit; }
      else if (r.status === 'lost') { todayLostCount++; todayLostKept += Math.abs(r.profit); }
      else                          { todayPending.push(s); }
    });
    todayRoundPendingCount = todayPending.length;
    const todayNet = todayLostKept - todayWonPaid;
    const todayWorstPay = todayPending.reduce((sum, s) => sum + Math.max(0, (s.payout || 0) - (s.bet || 0)), 0);
    const todayBestKeep = todayPending.reduce((sum, s) => sum + (s.bet || 0), 0);

    const thaiDateLabel = todayMatches[0]
      ? new Date(etToThai(todayMatches[0].date).getTime() + 7 * 3600000)
          .toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })
      : '';

    html += `<div style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius-lg);padding:12px 14px;margin-bottom:10px">`;
    html += `<div style="font-size:0.78rem;font-weight:700;color:var(--text-muted);margin-bottom:10px">${lang === 'th' ? 'วันนี้' : 'Today'} · ${thaiDateLabel} · ${todayMatches.length} ${lang === 'th' ? 'คู่' : 'matches'}</div>`;

    // Slip count row
    html += `<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-bottom:10px">`;
    const todayItems = [
      { label: lang === 'th' ? 'ทั้งหมด' : 'Total',   val: allSlipsForToday.length, color: 'var(--text-primary)' },
      { label: lang === 'th' ? 'ถูกแล้ว' : 'Won',     val: todayWonCount,            color: 'var(--accent)'       },
      { label: lang === 'th' ? 'ผิดแล้ว' : 'Lost',    val: todayLostCount,           color: 'var(--secondary)'    },
      { label: lang === 'th' ? 'รอผล'   : 'Pending',  val: todayPending.length,      color: 'var(--text-muted)'   },
    ];
    todayItems.forEach(({ label, val, color }) => {
      html += `<div style="text-align:center;padding:7px 4px;background:var(--bg-input);border-radius:var(--radius)">`;
      html += `<div style="font-size:0.65rem;color:var(--text-muted);margin-bottom:2px">${label}</div>`;
      html += `<div style="font-size:1rem;font-weight:700;color:${color}">${val}</div>`;
      html += `</div>`;
    });
    html += `</div>`;

    // Net today
    if (todayWonCount + todayLostCount > 0) {
      const netColor = todayNet >= 0 ? 'var(--accent)' : 'var(--secondary)';
      html += `<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-top:1px solid var(--border);border-bottom:${todayPending.length ? '1px solid var(--border)' : 'none'};margin-bottom:${todayPending.length ? '10px' : '0'}">`;
      html += `<span style="font-size:0.82rem;color:var(--text-muted)">${lang === 'th' ? 'ยอดสุทธิวันนี้ (เจ้ามือ)' : 'Net today (house)'}</span>`;
      html += `<span style="font-size:1rem;font-weight:700;color:${netColor}">${todayNet >= 0 ? '+' : ''}${todayNet}฿</span>`;
      html += `</div>`;
    }

    // Exposure boxes (only if there are pending slips)
    if (todayPending.length > 0) {
      html += `<div style="display:flex;gap:8px">`;
      html += `<div style="flex:1;text-align:center;padding:8px;border:1px solid var(--border);border-radius:var(--radius)">`;
      html += `<div style="font-size:0.68rem;color:var(--text-muted);margin-bottom:4px">${lang === 'th' ? 'ถ้าถูกหมด' : 'If all win'}</div>`;
      html += `<div style="font-size:0.72rem;color:var(--text-muted);margin-bottom:2px">${lang === 'th' ? 'จ่ายเพิ่ม' : 'Pay extra'}</div>`;
      html += `<div style="font-size:1.05rem;font-weight:700;color:var(--secondary)">-${todayWorstPay}฿</div>`;
      html += `</div>`;
      html += `<div style="flex:1;text-align:center;padding:8px;border:1px solid var(--border);border-radius:var(--radius)">`;
      html += `<div style="font-size:0.68rem;color:var(--text-muted);margin-bottom:4px">${lang === 'th' ? 'ถ้าผิดหมด' : 'If all lose'}</div>`;
      html += `<div style="font-size:0.72rem;color:var(--text-muted);margin-bottom:2px">${lang === 'th' ? 'เก็บเพิ่ม' : 'Keep extra'}</div>`;
      html += `<div style="font-size:1.05rem;font-weight:700;color:var(--accent)">+${todayBestKeep}฿</div>`;
      html += `</div>`;
      html += `</div>`;
    }
    html += `</div>`;
  }

  // Pick distribution for today's matches
  if (todayMatches.length > 0) {
    const dist = {};
    // Per-match filtering: done match = all non-cancelled; pending match = alive slips only
    todayMatches.forEach(m => {
      const matchDone = isMatchLocked(m);
      dist[m.id] = { ahHome: 0, ahAway: 0, over: 0, under: 0 };
      allSlips.filter(s => {
        if (s.status === 'cancelled') return false;
        if (!matchDone && resolveSlip(s).status !== 'pending') return false;
        return (s.picks || []).some(p => p.match_id === m.id);
      }).forEach(s => {
        const w = (s.payout || s.bet || 0) / Math.max(1, (s.picks || []).length);
        const matchObj = state.matchById ? state.matchById[m.id] : null;
        (s.picks || []).filter(p => p.match_id === m.id).forEach(pick => {
          if (pick.type === 'ou') {
            if (pick.pick === 'over') dist[m.id].over += w;
            else dist[m.id].under += w;
          } else {
            if (matchObj && pick.pick === matchObj.team1) dist[m.id].ahHome += w;
            else dist[m.id].ahAway += w;
          }
        });
      });
    });

    const anyPicks = todayMatches.some(m => dist[m.id] && (dist[m.id].ahHome + dist[m.id].ahAway + dist[m.id].over + dist[m.id].under > 0));
    if (anyPicks) {
      html += `<div style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius-lg);padding:12px 14px;margin-bottom:10px">`;
      html += `<div style="font-size:0.78rem;font-weight:700;color:var(--text-muted);margin-bottom:10px">${lang === 'th' ? 'เชียร์ใคร · รอบวันนี้' : 'Pick Distribution · Today'}</div>`;
      todayMatches.forEach(m => {
        const d = dist[m.id];
        if (!d || (d.ahHome + d.ahAway + d.over + d.under === 0)) return;
        const t1 = TEAMS[m.team1], t2 = TEAMS[m.team2];
        const t1Name = t1 ? (lang === 'th' ? t1.nameTh : t1.name) : m.team1;
        const t2Name = t2 ? (lang === 'th' ? t2.nameTh : t2.name) : m.team2;
        // Score + winner detection
        const result  = state.matches[m.id];
        const scored  = result && typeof result.team1_score === 'number' && typeof result.team2_score === 'number';
        const sc1     = scored ? result.team1_score : null;
        const sc2     = scored ? result.team2_score : null;
        const ahLine  = state.ahLines[m.id]  || '';
        const ouLine  = state.ouLines[m.id]  || '';

        let ahWinner = null; // 'team1' | 'team2' | 'push'
        if (scored && ahLine) {
          const o = getAHOutcome(parseFloat(ahLine), sc1, sc2);
          if (o.team1 === 'full' || o.team1 === 'half') ahWinner = 'team1';
          else if (o.team2 === 'full' || o.team2 === 'half') ahWinner = 'team2';
          else ahWinner = 'push';
        }
        let ouWinner = null; // 'over' | 'under' | 'push'
        if (scored && ouLine) {
          const o = getOUOutcome(parseFloat(ouLine), sc1 + sc2);
          if (o.over === 'full' || o.over === 'half') ouWinner = 'over';
          else if (o.under === 'full' || o.under === 'half') ouWinner = 'under';
          else ouWinner = 'push';
        }

        const winBox = 'border:1px solid var(--accent);border-radius:3px;padding:0 3px;color:var(--accent);font-weight:700';

        html += `<div style="margin-bottom:10px">`;
        html += `<div style="font-size:0.78rem;font-weight:700;margin-bottom:5px">${t1Name} vs ${t2Name}`;
        if (scored) html += ` <span style="color:var(--text-muted);font-weight:400">${sc1} - ${sc2}</span>`;
        html += `</div>`;

        // AH row
        if (d.ahHome + d.ahAway > 0) {
          const ahOddsH = state.ahOddsH[m.id] || '';
          const ahOddsA = state.ahOddsA[m.id] || '';
          const lineH   = ahLine ? formatAhFav(ahLine, true)  : '';
          const lineA   = ahLine ? formatAhFav(ahLine, false) : '';
          const ahTotal = d.ahHome + d.ahAway;
          const h1pct   = Math.round(d.ahHome / ahTotal * 100);
          const h2pct   = 100 - h1pct;
          const h1big   = d.ahHome >= d.ahAway;
          html += `<div style="display:flex;align-items:center;gap:6px;font-size:0.72rem;margin-bottom:2px">`;
          html += `<span style="width:36px;text-align:right;${ahWinner==='team1'?winBox:`font-weight:${h1big?'700':'400'};color:${h1big?'var(--text-primary)':'var(--text-muted)'}`}">${Math.round(d.ahHome)}฿</span>`;
          html += `<div style="flex:1;display:flex;height:10px;border-radius:3px;overflow:hidden;background:var(--bg-input)">`;
          html += `<div style="width:${h1pct}%;background:var(--secondary)"></div>`;
          html += `<div style="width:${h2pct}%;background:var(--accent)"></div>`;
          html += `</div>`;
          html += `<span style="width:36px;${ahWinner==='team2'?winBox:`font-weight:${!h1big?'700':'400'};color:${!h1big?'var(--text-primary)':'var(--text-muted)'}`}">${Math.round(d.ahAway)}฿</span>`;
          html += `</div>`;
          html += `<div style="display:flex;justify-content:space-between;font-size:0.66rem;color:var(--text-muted);margin-bottom:6px">`;
          html += `<span>${t1Name}${lineH?' '+lineH:''} ${ahOddsH?'@'+ahOddsH:''}</span>`;
          html += `<span>AH ${ahLine}</span>`;
          html += `<span style="text-align:right">${ahOddsA?'@'+ahOddsA:''} ${t2Name}${lineA?' '+lineA:''}</span>`;
          html += `</div>`;
        }

        // O/U row
        if (d.over + d.under > 0) {
          const ouOddsO = state.ouOddsO[m.id] || '';
          const ouOddsU = state.ouOddsU[m.id] || '';
          const ouTotal = d.over + d.under;
          const oPct    = Math.round(d.over / ouTotal * 100);
          const uPct    = 100 - oPct;
          const oBig    = d.over >= d.under;
          html += `<div style="display:flex;align-items:center;gap:6px;font-size:0.72rem;margin-bottom:2px">`;
          html += `<span style="width:36px;text-align:right;${ouWinner==='over'?winBox:`font-weight:${oBig?'700':'400'};color:${oBig?'var(--text-primary)':'var(--text-muted)'}`}">${Math.round(d.over)}฿</span>`;
          html += `<div style="flex:1;display:flex;height:10px;border-radius:3px;overflow:hidden;background:var(--bg-input)">`;
          html += `<div style="width:${oPct}%;background:var(--secondary)"></div>`;
          html += `<div style="width:${uPct}%;background:var(--accent)"></div>`;
          html += `</div>`;
          html += `<span style="width:36px;${ouWinner==='under'?winBox:`font-weight:${!oBig?'700':'400'};color:${!oBig?'var(--text-primary)':'var(--text-muted)'}`}">${Math.round(d.under)}฿</span>`;
          html += `</div>`;
          html += `<div style="display:flex;justify-content:space-between;font-size:0.66rem;color:var(--text-muted);margin-bottom:2px">`;
          html += `<span>${lang === 'th' ? 'สูง' : 'Over'} ${ouOddsO?'@'+ouOddsO:''}</span>`;
          html += `<span>O/U ${ouLine}</span>`;
          html += `<span style="text-align:right">${ouOddsU?'@'+ouOddsU:''} ${lang === 'th' ? 'ต่ำ' : 'Under'}</span>`;
          html += `</div>`;
        }

        html += `</div>`;
      });
      html += `</div>`;
    }
  }

  // Pending exposure (only show if there are pending slips from rounds OTHER than today)
  if (pendingCount > todayRoundPendingCount) {
    html += `<div style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius-lg);padding:12px 14px;margin-bottom:10px">`;
    html += `<div style="font-size:0.78rem;font-weight:700;color:var(--text-muted);margin-bottom:10px">${lang === 'th' ? `ความเสี่ยง (${pendingCount} สลิปรอ)` : `Risk (${pendingCount} pending)`}</div>`;
    html += `<div style="display:flex;gap:8px">`;
    html += `<div style="flex:1;text-align:center;padding:8px;border:1px solid var(--border);border-radius:var(--radius)">`;
    html += `<div style="font-size:0.68rem;color:var(--text-muted);margin-bottom:4px">${lang === 'th' ? 'ถ้าถูกหมด' : 'If all win'}</div>`;
    html += `<div style="font-size:0.72rem;color:var(--text-muted);margin-bottom:2px">${lang === 'th' ? 'จ่ายเพิ่ม' : 'Pay extra'}</div>`;
    html += `<div style="font-size:1.05rem;font-weight:700;color:var(--secondary)">-${pendingWorstPay}฿</div>`;
    html += `<div style="font-size:0.7rem;color:var(--text-muted);margin-top:3px">${lang === 'th' ? 'net' : 'net'}: ${netSign}${pokNet - pendingWorstPay}฿</div>`;
    html += `</div>`;
    html += `<div style="flex:1;text-align:center;padding:8px;border:1px solid var(--border);border-radius:var(--radius)">`;
    html += `<div style="font-size:0.68rem;color:var(--text-muted);margin-bottom:4px">${lang === 'th' ? 'ถ้าผิดหมด' : 'If all lose'}</div>`;
    html += `<div style="font-size:0.72rem;color:var(--text-muted);margin-bottom:2px">${lang === 'th' ? 'เก็บเพิ่ม' : 'Keep extra'}</div>`;
    html += `<div style="font-size:1.05rem;font-weight:700;color:var(--accent)">+${pendingBestKeep}฿</div>`;
    html += `<div style="font-size:0.7rem;color:var(--text-muted);margin-top:3px">${lang === 'th' ? 'net' : 'net'}: +${pokNet + pendingBestKeep}฿</div>`;
    html += `</div>`;
    html += `</div>`;
    html += `</div>`;
  }

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

  // Step: full loss on any leg = whole step dead immediately
  if (isStep && outcomes.some(o => o.outcome === 'loss')) {
    return { status: 'lost', profit: -slip.bet };
  }

  // Check if ALL picks have scores
  const allResolved = outcomes.every(o => o.outcome !== null);
  if (!allResolved) return { status: 'pending', profit: 0 };

  if (isStep) {
    // half_loss: half the bet dies, the surviving half continues at ×1 for that leg
    // multiple half_loss legs compound: survivalFactor = (0.5)^N
    let survivalFactor = 1;
    let combinedOdds = 1;
    outcomes.forEach(({ pick: p, outcome }) => {
      if (outcome === 'full') combinedOdds *= p.odds;
      else if (outcome === 'half') combinedOdds *= (1 + (p.odds - 1) / 2);
      else if (outcome === 'half_loss') survivalFactor *= 0.5;
      // push: ×1 (skip)
    });
    const payout = Math.round(slip.bet * survivalFactor * combinedOdds);
    const profit = payout - slip.bet;
    return { status: profit >= 0 ? 'won' : 'lost', profit };
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

