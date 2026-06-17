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

  // Approve buttons (admin only)
  container.querySelectorAll('.slip-approve-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const ts = btn.dataset.ts;
      const result = await approveSlip(ts);
      if (result && result.success) {
        const allSlips = state.allSlips.length ? state.allSlips : (state.slips || []);
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
    const allSlips = state.allSlips.length ? state.allSlips : (state.slips || []);
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
  const allSlipsAll = state.allSlips.length ? state.allSlips : (state.slips || []);
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
  const playerSlips = (state.allSlips.length ? state.allSlips : (state.slips || []))
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
  let total = { profit: 0, totalBet: 0, totalWon: 0, totalLost: 0, pendingBet: 0, pendingPayout: 0 };
  const tickets = [];
  const allSlips = state.allSlips.length ? state.allSlips : (state.slips || []);

  allSlips.filter(s => s.player === player && s.status !== 'cancelled').forEach(slip => {
    const resolved = resolveSlip(slip);
    total.profit += resolved.profit;
    total.totalBet += slip.bet;
    if (resolved.status === 'won') total.totalWon += resolved.profit;
    else if (resolved.status === 'lost') total.totalLost += resolved.profit;
    else if (resolved.status === 'pending') { total.pendingBet += slip.bet; total.pendingPayout += slip.payout || 0; }

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

function getTodayMatches() {
  // Match dates are stored as ET strings — compare by ET date (UTC-4)
  const todayET = new Date(Date.now() - 4 * 3600000).toISOString().slice(0, 10);
  return MATCHES.filter(m => m.date.slice(0, 10) === todayET);
}

// --- Admin: House (Pok) risk dashboard ---
function renderHouseDashboard() {
  const lang = currentLang;
  const allSlips = state.allSlips.length ? state.allSlips : (state.slips || []);
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

  // Slip count row
  html += `<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-bottom:10px">`;
  const countItems = [
    { label: lang === 'th' ? 'ทั้งหมด' : 'Total',   val: slips.length,   color: 'var(--text-primary)' },
    { label: lang === 'th' ? 'ถูกแล้ว' : 'Won',     val: wonCount,       color: 'var(--accent)'       },
    { label: lang === 'th' ? 'ผิดแล้ว' : 'Lost',    val: lostCount,      color: 'var(--secondary)'    },
    { label: lang === 'th' ? 'รอผล'   : 'Pending',  val: pendingCount,   color: 'var(--text-muted)'   },
  ];
  countItems.forEach(({ label, val, color }) => {
    html += `<div style="text-align:center;padding:8px 4px;background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius)">`;
    html += `<div style="font-size:0.68rem;color:var(--text-muted);margin-bottom:3px">${label}</div>`;
    html += `<div style="font-size:1.1rem;font-weight:700;color:${color}">${val}</div>`;
    html += `</div>`;
  });
  html += `</div>`;

  // Money position
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

  // Today's round exposure
  const todayMatches = getTodayMatches();
  if (todayMatches.length > 0) {
    const todayIds = new Set(todayMatches.map(m => m.id));
    const allSlipsForToday = allSlips.filter(s => s.status !== 'cancelled');
    const todayPending = allSlipsForToday.filter(s => {
      const r = resolveSlip(s);
      return r.status === 'pending' && (s.picks || []).some(p => todayIds.has(p.match_id));
    });
    const todayWorstPay  = todayPending.reduce((sum, s) => sum + Math.max(0, (s.payout || 0) - (s.bet || 0)), 0);
    const todayBestKeep  = todayPending.reduce((sum, s) => sum + (s.bet || 0), 0);

    const thaiDateLabel = todayMatches[0]
      ? new Date(etToThai(todayMatches[0].date).getTime() + 7 * 3600000)
          .toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })
      : '';

    html += `<div style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius-lg);padding:12px 14px;margin-bottom:10px">`;
    html += `<div style="font-size:0.78rem;font-weight:700;color:var(--text-muted);margin-bottom:10px">`;
    html += `${lang === 'th' ? 'วันนี้' : 'Today'} · ${thaiDateLabel} · ${todayMatches.length} ${lang === 'th' ? 'คู่' : 'matches'} · ${lang === 'th' ? 'สลิปรอ' : 'pending'} ${todayPending.length} ${lang === 'th' ? 'ใบ' : ''}`;
    html += `</div>`;
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
    } else {
      html += `<div style="font-size:0.82rem;color:var(--text-muted);text-align:center">${lang === 'th' ? 'ไม่มีสลิปรอสำหรับวันนี้' : 'No pending slips for today'}</div>`;
    }
    html += `</div>`;
  }

  // Pending exposure (only show if there are pending slips)
  if (pendingCount > 0) {
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
        pickLabel = `${picked ? (lang === 'th' ? picked.nameTh : picked.name) : p.pick} ${ahSide}`;
      }

      const resultBadge = getPickResultBadge(p, match);

      html += `<div style="font-size:0.75rem;display:flex;justify-content:space-between;padding:1px 0">`;
      html += `<span>${pickLabel} <span class="odds-tag">@${p.odds}</span> ${resultBadge}</span>`;
      html += `<span style="color:var(--text-muted)">${t1Name} vs ${t2Name}</span>`;
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

function calcResultPoints(pred1, pred2, actual1, actual2) {
  if (pred1 === undefined || pred2 === undefined) return 0;
  if (pred1 === actual1 && pred2 === actual2) return 3;
  const predDiff = pred1 - pred2;
  const actualDiff = actual1 - actual2;
  if ((predDiff > 0 && actualDiff > 0) || (predDiff < 0 && actualDiff < 0) || (predDiff === 0 && actualDiff === 0)) return 1;
  return 0;
}
