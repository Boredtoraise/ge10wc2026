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
    html += `<button class="lb-tab${isMe ? ' me' : ''}" data-lb-tab="${p}">${getDisplayName(p)}${isMe ? ' ★' : ''}</button>`;
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

  html += renderFunLeaderboard();

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

  // Initial balance from players sheet
  const playerData    = state.players.find(p => p.player_id === player);
  const initialBal    = playerData && playerData.initial_balance !== '' && playerData.initial_balance != null
    ? parseFloat(playerData.initial_balance) || 0 : null;

  let html = '';

  // Balance card (only when initial_balance is set in Sheet)
  if (initialBal !== null) {
    const allSlipsAll2  = getAllSlips();
    const approvedPnl   = allSlipsAll2
      .filter(s => s.player === player && s.status === 'approved')
      .reduce((sum, s) => sum + resolveSlip(s).profit, 0);
    const currentBal    = initialBal + approvedPnl;
    const balColor      = currentBal >= initialBal ? 'var(--accent)' : 'var(--secondary)';
    const pnlColor      = approvedPnl >= 0 ? 'var(--accent)' : 'var(--secondary)';

    // Slips resolved but awaiting Pok's approval
    const toConfirm     = allSlipsAll2.filter(s => s.player === player && s.status === 'pending' && resolveSlip(s).status !== 'pending');
    const toConfirmPnl  = toConfirm.reduce((sum, s) => sum + resolveSlip(s).profit, 0);

    // Slips still waiting for match result
    const stillPending  = allSlipsAll2.filter(s => s.player === player && s.status === 'pending' && resolveSlip(s).status === 'pending');
    const pendMaxWin    = stillPending.reduce((sum, s) => sum + Math.max(0, (s.payout || 0) - (s.bet || 0)), 0);
    const pendMaxLose   = stillPending.reduce((sum, s) => sum + (s.bet || 0), 0);

    html += `<div style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius-lg);padding:12px 14px;margin-bottom:10px">`;
    html += `<div style="font-size:0.78rem;font-weight:700;color:var(--text-muted);margin-bottom:10px">${lang === 'th' ? 'ยอดเงิน' : 'Balance'}</div>`;
    html += `<div style="display:flex;justify-content:space-between;margin-bottom:5px">`;
    html += `<span style="font-size:0.82rem;color:var(--text-muted)">${lang === 'th' ? 'เงินเริ่ม' : 'Starting'}</span>`;
    html += `<span style="font-size:0.88rem;font-weight:600;color:var(--text-primary)">${initialBal.toLocaleString()}฿</span>`;
    html += `</div>`;
    html += `<div style="display:flex;justify-content:space-between;margin-bottom:8px">`;
    html += `<span style="font-size:0.82rem;color:var(--text-muted)">${lang === 'th' ? 'กำไร/ขาดทุน (ยืนยันแล้ว)' : 'Settled P&L'}</span>`;
    html += `<span style="font-size:0.88rem;font-weight:600;color:${pnlColor}">${approvedPnl >= 0 ? '+' : ''}${approvedPnl}฿</span>`;
    html += `</div>`;
    html += `<div style="display:flex;justify-content:space-between;padding-top:8px;border-top:1px solid var(--border)">`;
    html += `<span style="font-size:0.9rem;font-weight:700">${lang === 'th' ? 'ยอดปัจจุบัน' : 'Current Balance'}</span>`;
    html += `<span style="font-size:1.3rem;font-weight:800;color:${balColor}">${currentBal.toLocaleString()}฿</span>`;
    html += `</div>`;
    if (toConfirm.length > 0) {
      const tcColor = toConfirmPnl >= 0 ? 'var(--accent)' : 'var(--secondary)';
      html += `<div style="margin-top:8px;padding-top:8px;border-top:1px solid var(--border);font-size:0.76rem;color:var(--text-muted)">`;
      html += `⏳ ${lang === 'th' ? 'รอ Pok ยืนยัน' : 'Awaiting approval'} (${toConfirm.length}): <span style="color:${tcColor};font-weight:700">${toConfirmPnl >= 0 ? '+' : ''}${toConfirmPnl}฿</span>`;
      html += `</div>`;
    }
    if (stillPending.length > 0) {
      html += `<div style="margin-top:5px;font-size:0.76rem;color:var(--text-muted)">`;
      html += `⚽ ${lang === 'th' ? 'รอผลบอล' : 'Match pending'} (${stillPending.length}): <span style="color:var(--accent)">+${pendMaxWin}฿</span> / <span style="color:var(--secondary)">-${pendMaxLose}฿</span>`;
      html += `</div>`;
    }
    html += `</div>`;
  }

  // Grand total banner (P&L all slips)
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

  // Slips detail — grouped by date (14:00 Thai cutoff)
  const playerSlips = (getAllSlips())
    .filter(s => s.player === player && s.status !== 'cancelled')
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  function getPlayerRoundKey(s) {
    const picks = s.picks || [];
    if (!picks.length) return null;
    const match = (state.matchById || {})[picks[0].match_id] || MATCHES.find(m => m.id === picks[0].match_id);
    if (!match) return null;
    const thaiMs = etToThai(match.date).getTime() + 7 * 3600 * 1000;
    const d = new Date(thaiMs);
    if (d.getUTCHours() < 14) d.setUTCDate(d.getUTCDate() - 1);
    return d.toISOString().slice(0, 10);
  }

  // Group slips by round key
  const slipsByRound = {};
  playerSlips.forEach(s => {
    const key = getPlayerRoundKey(s) || 'other';
    if (!slipsByRound[key]) slipsByRound[key] = [];
    slipsByRound[key].push(s);
  });
  const roundKeys = Object.keys(slipsByRound).sort().reverse();

  if (!playerSlips.length) {
    html += `<div class="lb-section open">`;
    html += `<div class="lb-section-header"><h3>${lang === 'th' ? 'สลิปทั้งหมด' : 'All Slips'}</h3><span class="lb-section-arrow">▼</span></div>`;
    html += `<div class="lb-section-body"><div style="color:var(--text-muted);font-size:0.85rem;text-align:center;padding:12px">${lang === 'th' ? 'ยังไม่มีสลิป' : 'No slips yet'}</div></div></div>`;
  } else {
    roundKeys.forEach(key => {
      const daySlips = slipsByRound[key];
      let dayNet = 0;
      daySlips.forEach(s => { const r = resolveSlip(s); dayNet += r.profit || 0; });
      const daySettled = daySlips.some(s => { const r = resolveSlip(s); return r.status === 'won' || r.status === 'lost'; });
      const dayLabel = key === 'other' ? (lang === 'th' ? 'อื่นๆ' : 'Other') : (() => {
        const [yr, mo, dy] = key.split('-').map(Number);
        return new Date(Date.UTC(yr, mo - 1, dy)).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
      })();
      const netStr = dayNet >= 0 ? `+${dayNet}฿` : `${dayNet}฿`;
      const netColor = dayNet >= 0 ? 'var(--accent)' : 'var(--secondary)';
      const headerRight = daySettled
        ? `<span style="font-size:0.85rem;font-weight:700;color:${netColor}">${netStr}</span>`
        : `<span style="font-size:0.78rem;color:var(--text-muted)">${daySlips.length} ${lang === 'th' ? 'สลิปรอ' : 'pending'}</span>`;
      html += `<div class="lb-section open">`;
      html += `<div class="lb-section-header"><h3>${dayLabel}</h3>${headerRight}<span class="lb-section-arrow">▼</span></div>`;
      html += `<div class="lb-section-body">`;
      daySlips.forEach(slip => { html += renderSlipCard(slip, { showDetails: true }); });
      html += `</div></div>`;
    });
  }

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

// --- Fun leaderboard with badges + streaks ---
function renderFunLeaderboard() {
  const lang = currentLang;
  const players = getPlayers();
  if (!players.length) return '';

  const allSlipsAll = getAllSlips();

  // Compute per-player stats from all non-cancelled slips (live resolveSlip, not approval-based)
  const stats = players.map(player => {
    const pSlips = allSlipsAll
      .filter(s => s.player === player && s.status !== 'cancelled')
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    let wins = 0, losses = 0, totalBet = 0, totalProfit = 0;
    let streakVal = 0, streakDir = 0; // 1=win day, -1=loss day (by daily net P&L)
    let hasStep = false, hasSingle = false;
    const byDay = {};

    pSlips.forEach(s => {
      const r = resolveSlip(s);
      totalBet    += s.bet || 0;
      totalProfit += r.profit;
      if ((s.picks || []).length >= 3) hasStep = true; else hasSingle = true;
      if (r.status === 'won') wins++;
      else if (r.status === 'lost') losses++;

      // Group into days (14:00 Thai cutoff) for streak
      const picks = s.picks || [];
      if (!picks.length) return;
      const m0 = (state.matchById || {})[picks[0].match_id] || MATCHES.find(m => m.id === picks[0].match_id);
      if (!m0) return;
      const thaiMs = etToThai(m0.date).getTime() + 7 * 3600 * 1000;
      const dObj = new Date(thaiMs);
      if (dObj.getUTCHours() < 14) dObj.setUTCDate(dObj.getUTCDate() - 1);
      const dk = dObj.toISOString().slice(0, 10);
      if (!byDay[dk]) byDay[dk] = { net: 0, hasPending: false };
      if (r.status === 'pending') byDay[dk].hasPending = true;
      else byDay[dk].net += r.profit;
    });

    // Walk days oldest→newest: count consecutive net+ / net- days
    Object.keys(byDay).sort().forEach(dk => {
      const day = byDay[dk];
      if (day.hasPending) return; // skip day if any slip still unresolved
      if (day.net > 0) {
        if (streakDir === 1) streakVal++; else { streakDir = 1; streakVal = 1; }
      } else if (day.net < 0) {
        if (streakDir === -1) streakVal++; else { streakDir = -1; streakVal = 1; }
      }
      // net === 0 (push/breakeven): don't reset streak
    });

    const settled = wins + losses;
    const winRate = settled > 0 ? wins / settled : null;
    return { player, wins, losses, totalBet, totalProfit, settled, winRate, streakVal, streakDir, hasStep, hasSingle };
  });

  const active = stats.filter(s => s.settled > 0 || s.totalBet > 0);
  if (!active.length) return `<div style="text-align:center;padding:24px;color:var(--text-muted)">ยังไม่มีข้อมูล</div>`;

  const sorted = [...active].sort((a, b) => b.totalProfit - a.totalProfit);
  const maxProfit = sorted[0]?.totalProfit;
  const minProfit = sorted[sorted.length - 1]?.totalProfit;
  const byWinRate = [...active].filter(s => s.settled >= 2).sort((a, b) => (b.winRate || 0) - (a.winRate || 0));
  const biggestBetLost = [...active].filter(s => s.totalProfit < 0).sort((a, b) => b.totalBet - a.totalBet)[0];

  // Pending exposure per player
  const pendingByPlayer = {};
  allSlipsAll.filter(s => s.status !== 'cancelled' && players.includes(s.player)).forEach(s => {
    const r = resolveSlip(s);
    if (r.status === 'pending') {
      if (!pendingByPlayer[s.player]) pendingByPlayer[s.player] = { maxWin: 0, maxLose: 0 };
      pendingByPlayer[s.player].maxWin += Math.max(0, (s.payout || 0) - (s.bet || 0));
      pendingByPlayer[s.player].maxLose += s.bet || 0;
    }
  });

  // Assign badges
  sorted.forEach(s => {
    const b = [];
    if (active.length > 1 && s.totalProfit === maxProfit && maxProfit > 0) b.push('👑 ราชา');
    if (byWinRate[0]?.player === s.player && s.settled >= 2) b.push('🎯 สไนเปอร์');
    if (s.streakDir === 1 && s.streakVal >= 2) b.push(`🔥 ออนไฟร์ ×${s.streakVal} วัน`);
    if (active.length > 1 && s.totalProfit === minProfit && minProfit < 0) b.push('🗑️ เผาเงิน');
    if (s.winRate === 0 && s.settled >= 3) b.push('🤡 วันนี้ตาย');
    if (s.streakDir === -1 && s.streakVal >= 3) b.push(`🧊 หนาว ×${s.streakVal} วัน`);
    if (biggestBetLost?.player === s.player) b.push('🙈 ตาบอด');
    if (!s.hasStep && s.hasSingle && s.settled >= 2) b.push('🐔 ขี้กลัว');
    s.badges = b;
  });

  // Headline
  const headlineParts = [];
  const leader = sorted[0];
  const last = sorted[sorted.length - 1];
  const hottest = [...active].filter(s => s.streakDir === 1).sort((a, b) => b.streakVal - a.streakVal)[0];
  const coldest = [...active].filter(s => s.streakDir === -1).sort((a, b) => b.streakVal - a.streakVal)[0];
  if (leader?.totalProfit > 0) headlineParts.push(`${getDisplayName(leader.player)} นำโด่ง`);
  if (hottest?.streakVal >= 3) headlineParts.push(`${getDisplayName(hottest.player)} ร้อนแรง`);
  if (coldest?.streakVal >= 3) headlineParts.push(`${getDisplayName(coldest.player)} หนาวสั่น`);
  if (last?.totalProfit < -300) headlineParts.push(`${getDisplayName(last.player)} ต้องการการบำบัด`);
  const headline = headlineParts.length ? `🗞️ ${headlineParts.join(' · ')}` : '🗞️ ดราม่ากำลังก่อตัว...';

  // จับตา alerts
  const alerts = [];
  sorted.forEach((s, i) => {
    if (s.streakDir === 1 && s.streakVal === 1) alerts.push(`⚡ ${getDisplayName(s.player)} — อีก 1 ถูก ได้ 🔥 ออนไฟร์`);
    if (s.streakDir === -1 && s.streakVal === 2) alerts.push(`⚠️ ${getDisplayName(s.player)} — อีก 1 ผิด ได้ 🧊 หนาว`);
    if (i > 0) {
      const gap = sorted[i - 1].totalProfit - s.totalProfit;
      if (gap > 0 && gap <= 50) alerts.push(`📈 ${getDisplayName(s.player)} ห่างอันดับ ${i} แค่ ${gap}฿`);
    }
    if (i < sorted.length - 1) {
      const gap = s.totalProfit - sorted[i + 1].totalProfit;
      if (gap > 0 && gap <= 30) alerts.push(`📉 ${getDisplayName(s.player)} ระวัง! ${getDisplayName(sorted[i + 1].player)} ตามมาแค่ ${gap}฿`);
    }
  });

  const rankIcon = ['🏆', '🥈', '🥉'];
  let html = `<div class="lb-section open">`;
  html += `<div class="lb-section-header"><h3>Leaderboard</h3></div>`;
  html += `<div class="lb-section-body">`;

  // Headline banner
  html += `<div style="padding:8px 12px;margin-bottom:10px;background:var(--bg-input);border-radius:var(--radius);font-size:0.82rem;font-weight:600;color:var(--text-muted)">${headline}</div>`;

  sorted.forEach((s, i) => {
    const isMe = s.player === state.currentPlayer;
    const profitColor = s.totalProfit >= 0 ? 'var(--accent)' : 'var(--secondary)';
    const profitStr = (s.totalProfit >= 0 ? '+' : '') + s.totalProfit + '฿';
    const winStr = s.settled > 0 ? `${s.wins}/${s.settled}` : '-';
    const streakStr = s.streakVal >= 1 ? `${s.streakVal} วันติด` : '';
    const border = i === 0 && s.totalProfit > 0 ? 'border:2px solid var(--accent);'
                 : isMe ? 'border:1px solid var(--secondary);' : '';
    const icon = rankIcon[i] || `${i + 1}`;
    const pending = pendingByPlayer[s.player];

    html += `<div style="padding:10px 12px;margin-bottom:8px;background:var(--bg-card);border-radius:var(--radius-lg);${border}">`;
    html += `<div style="display:flex;align-items:center;gap:10px">`;
    html += `<span style="font-size:1.2rem;min-width:24px;text-align:center">${icon}</span>`;
    html += `<div style="flex:1;min-width:0">`;
    html += `<div style="font-weight:700;font-size:0.95rem">${getDisplayName(s.player)}${isMe ? ' <span style="color:var(--secondary);font-size:0.72rem">★</span>' : ''}</div>`;
    if (s.badges.length) {
      html += `<div style="margin-top:3px;display:flex;flex-wrap:wrap;gap:3px">`;
      s.badges.forEach(b => {
        html += `<span style="font-size:0.7rem;background:var(--bg-input);border:1px solid var(--border);border-radius:99px;padding:1px 7px">${b}</span>`;
      });
      html += `</div>`;
    }
    html += `<div style="margin-top:3px;font-size:0.72rem;color:var(--text-muted)">ถูก ${winStr}`;
    if (s.totalBet > 0) html += ` · ลง ${s.totalBet}฿`;
    if (streakStr) html += ` · ${streakStr}`;
    html += `</div>`;
    if (pending) {
      html += `<div style="margin-top:2px;font-size:0.7rem">⏳ รอ: <span style="color:var(--accent)">+${pending.maxWin}฿</span> / <span style="color:var(--secondary)">-${pending.maxLose}฿</span></div>`;
    }
    html += `</div>`;
    html += `<span style="font-size:1.15rem;font-weight:800;color:${profitColor};white-space:nowrap">${profitStr}</span>`;
    html += `</div></div>`;
  });

  // จับตา section
  if (alerts.length) {
    html += `<div style="margin-bottom:8px;padding:8px 12px;background:var(--bg-input);border-radius:var(--radius)">`;
    html += `<div style="font-size:0.7rem;font-weight:700;color:var(--text-muted);margin-bottom:4px">จับตา</div>`;
    alerts.forEach(a => {
      html += `<div style="font-size:0.75rem;margin-bottom:2px">${a}</div>`;
    });
    html += `</div>`;
  }

  // Group fun stats footer
  const settledAll = allSlipsAll.filter(s => {
    if (s.status === 'cancelled') return false;
    if (!players.includes(s.player)) return false;
    return resolveSlip(s).status !== 'pending';
  });

  if (settledAll.length > 0) {
    const withResolved = settledAll.map(s => ({ ...s, r: resolveSlip(s) }));
    const worstSlip = withResolved.filter(s => s.r.status === 'lost').sort((a, b) => a.r.profit - b.r.profit)[0];
    const bestSlip  = withResolved.filter(s => s.r.status === 'won').sort((a, b) => b.r.profit - a.r.profit)[0];
    const mostPicksWon  = withResolved.filter(s => s.r.status === 'won').sort((a, b) => (b.picks||[]).length - (a.picks||[]).length)[0];
    const mostPicksLost = withResolved.filter(s => s.r.status === 'lost').sort((a, b) => (b.picks||[]).length - (a.picks||[]).length)[0];
    const groupProfit = active.reduce((sum, s) => sum + s.totalProfit, 0);
    const groupColor = groupProfit >= 0 ? 'var(--accent)' : 'var(--secondary)';
    const groupSign  = groupProfit >= 0 ? '+' : '';
    const totalWins = active.reduce((s, p) => s + p.wins, 0);
    const totalSettled = active.reduce((s, p) => s + p.settled, 0);
    const groupWinRate = totalSettled > 0 ? Math.round(totalWins / totalSettled * 100) : 0;
    const winRateRoast = groupWinRate < 40 ? 'แย่กว่าโยนเหรียญมาก 💀' : groupWinRate < 50 ? 'แย่กว่าโยนเหรียญนิดนึง 🪙' : groupWinRate < 60 ? 'พอๆ กับโยนเหรียญ 🤷' : 'เก่งกว่าโยนเหรียญ 🎯';
    const coffees = Math.round(Math.abs(groupProfit) / 50);
    const groupRoast = groupProfit < -500 ? `เผาไป ${Math.abs(groupProfit)}฿ ซื้อตั๋วบอลโลกได้เลยนะ` : groupProfit < 0 ? `เผาไป ${Math.abs(groupProfit)}฿ หรือ ${coffees} แก้วกาแฟ` : groupProfit === 0 ? 'เสมอตัว... อย่างน้อยไม่ขาดทุน' : `บวกรวม ${groupProfit}฿ Pok ร้องไห้อยู่`;

    html += `<div style="margin-top:4px;padding:10px 12px;background:var(--bg-input);border-radius:var(--radius);font-size:0.78rem">`;
    html += `<div style="font-weight:700;color:var(--text-muted);margin-bottom:6px">📊 สถิติกลุ่ม</div>`;
    if (worstSlip) {
      const pc = (worstSlip.picks || []).length;
      html += `<div style="margin-bottom:4px">🗑️ อัปยศประจำรอบ: <b>${getDisplayName(worstSlip.player)}</b> ${pc >= 3 ? `step ${pc} คู่` : 'single'} ลง ${worstSlip.bet}฿ <span style="color:var(--secondary);font-weight:700">หายเกลี้ยง ${worstSlip.r.profit}฿</span></div>`;
    }
    if (bestSlip) {
      const pc = (bestSlip.picks || []).length;
      html += `<div style="margin-bottom:4px">👑 มือทองรอบนี้: <b>${getDisplayName(bestSlip.player)}</b> ${pc >= 3 ? `step ${pc} คู่` : 'single'} ลง ${bestSlip.bet}฿ → <span style="color:var(--accent);font-weight:700">+${bestSlip.r.profit}฿</span></div>`;
    }
    if (mostPicksWon && (mostPicksWon.picks||[]).length >= 2) {
      const pc = (mostPicksWon.picks||[]).length;
      html += `<div style="margin-bottom:4px">🏅 step ใหญ่สุดที่ถูก: <b>${getDisplayName(mostPicksWon.player)}</b> ${pc} คู่ → <span style="color:var(--accent);font-weight:700">+${mostPicksWon.r.profit}฿</span></div>`;
    }
    if (mostPicksLost && (mostPicksLost.picks||[]).length >= 2) {
      const pc = (mostPicksLost.picks||[]).length;
      const wrongCount = (mostPicksLost.picks||[]).filter(p => {
        const o = getPickOutcome(p, state.matches[p.match_id]);
        return o === 'loss' || o === 'half_loss';
      }).length;
      const allWrong = wrongCount === pc;
      const wrongLabel = allWrong ? `ผิดหมด ${pc}/${pc} 😭` : `ผิด ${wrongCount}/${pc}`;
      html += `<div style="margin-bottom:4px">💣 step ใหญ่สุดที่ผิด: <b>${getDisplayName(mostPicksLost.player)}</b> ${pc} คู่ ลง ${mostPicksLost.bet}฿ — <span style="color:var(--secondary);font-weight:700">${wrongLabel}</span></div>`;
    }
    html += `<div style="margin-bottom:4px">🎯 win rate กลุ่ม: <b>${groupWinRate}%</b> (${totalWins}/${totalSettled}) — ${winRateRoast}</div>`;
    html += `<div style="color:${groupColor};font-weight:700">${groupSign}${groupProfit}฿ — ${groupRoast}</div>`;
    html += `</div>`;
  }

  // Badge legend
  const badgeLegend = [
    ['👑', 'ราชา', 'กำไรสูงสุด'],
    ['🎯', 'สไนเปอร์', 'win rate สูงสุด'],
    ['🔥', 'ออนไฟร์', 'ชนะติดต่อกัน'],
    ['🗑️', 'เผาเงิน', 'ขาดทุนหนักสุด'],
    ['🤡', 'วันนี้ตาย', '0% ถูกจาก 3+ slip'],
    ['🧊', 'หนาว', 'แพ้ติดต่อกัน 3+'],
    ['🙈', 'ตาบอด', 'แทงเยอะสุดแต่ยังติดลบ'],
    ['🐔', 'ขี้กลัว', 'single อย่างเดียว ไม่เล่น step'],
  ];
  html += `<div style="margin-top:8px;padding:8px 10px;background:var(--bg-input);border-radius:var(--radius)">`;
  html += `<div style="font-size:0.68rem;font-weight:700;color:var(--text-muted);margin-bottom:5px">ความหมาย badge</div>`;
  html += `<div style="display:grid;grid-template-columns:1fr 1fr;gap:2px 8px">`;
  badgeLegend.forEach(([icon, name, desc]) => {
    html += `<div style="font-size:0.68rem;color:var(--text-muted)">${icon} <b>${name}</b> — ${desc}</div>`;
  });
  html += `</div></div>`;

  html += `</div></div>`;
  return html;
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

  // All matches with odds
  const todayMatches = MATCHES.filter(m => state.ahLines[m.id] || state.ouLines[m.id]).sort((a, b) => etToThai(a.date) - etToThai(b.date));
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
      { label: lang === 'th' ? 'ทั้งหมด' : 'Total',   val: allSlipsForToday.length, color: 'var(--text-primary)', amt: null },
      { label: lang === 'th' ? 'ถูกแล้ว' : 'Won',     val: todayWonCount,            color: 'var(--accent)',       amt: todayWonPaid  > 0 ? `-${todayWonPaid}฿`  : null, amtColor: 'var(--secondary)' },
      { label: lang === 'th' ? 'ผิดแล้ว' : 'Lost',    val: todayLostCount,           color: 'var(--secondary)',    amt: todayLostKept > 0 ? `+${todayLostKept}฿` : null, amtColor: 'var(--accent)'    },
      { label: lang === 'th' ? 'รอผล'   : 'Pending',  val: todayPending.length,      color: 'var(--text-muted)',   amt: null },
    ];
    todayItems.forEach(({ label, val, color, amt, amtColor }) => {
      html += `<div style="text-align:center;padding:7px 4px;background:var(--bg-input);border-radius:var(--radius)">`;
      html += `<div style="font-size:0.65rem;color:var(--text-muted);margin-bottom:2px">${label}</div>`;
      html += `<div style="font-size:1rem;font-weight:700;color:${color}">${val}</div>`;
      if (amt) html += `<div style="font-size:0.7rem;font-weight:700;color:${amtColor};margin-top:2px">${amt}</div>`;
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
      dist[m.id] = {
        ahHome: 0, ahAway: 0, over: 0, under: 0,
        ahHomeC: 0, ahAwayC: 0, overC: 0, underC: 0,
        ahHomeBet: 0, ahAwayBet: 0, overBet: 0, underBet: 0,
        ahHomePay: 0, ahAwayPay: 0, overPay: 0, underPay: 0,
      };
      const mResult = state.matches[m.id];
      const matchDone = !!(mResult && typeof mResult.team1_score === 'number' && typeof mResult.team2_score === 'number');
      allSlips.filter(s => {
        if (s.status === 'cancelled') return false;
        if (!matchDone && resolveSlip(s).status !== 'pending') return false;
        return (s.picks || []).some(p => p.match_id === m.id);
      }).forEach(s => {
        const w = (s.payout || s.bet || 0) / Math.max(1, (s.picks || []).length);
        const matchObj = state.matchById ? state.matchById[m.id] : null;
        let cntH = false, cntA = false, cntO = false, cntU = false;
        (s.picks || []).filter(p => p.match_id === m.id).forEach(pick => {
          if (pick.type === 'ou') {
            if (pick.pick === 'over') {
              dist[m.id].over += w;
              if (!cntO) { cntO = true; dist[m.id].overC++; dist[m.id].overBet += s.bet || 0; dist[m.id].overPay += s.payout || 0; }
            } else {
              dist[m.id].under += w;
              if (!cntU) { cntU = true; dist[m.id].underC++; dist[m.id].underBet += s.bet || 0; dist[m.id].underPay += s.payout || 0; }
            }
          } else {
            if (matchObj && pick.pick === matchObj.team1) {
              dist[m.id].ahHome += w;
              if (!cntH) { cntH = true; dist[m.id].ahHomeC++; dist[m.id].ahHomeBet += s.bet || 0; dist[m.id].ahHomePay += s.payout || 0; }
            } else {
              dist[m.id].ahAway += w;
              if (!cntA) { cntA = true; dist[m.id].ahAwayC++; dist[m.id].ahAwayBet += s.bet || 0; dist[m.id].ahAwayPay += s.payout || 0; }
            }
          }
        });
      });
    });

    const anyPicks = todayMatches.some(m => dist[m.id] && (dist[m.id].ahHome + dist[m.id].ahAway + dist[m.id].over + dist[m.id].under > 0));
    if (anyPicks) {
      html += `<div style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius-lg);padding:12px 14px;margin-bottom:10px">`;
      html += `<div style="font-size:0.78rem;font-weight:700;color:var(--text-muted);margin-bottom:10px">${lang === 'th' ? 'เชียร์ใคร · ทั้งหมด' : 'Pick Distribution · All Matches'}</div>`;
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
          html += `<div style="display:flex;justify-content:space-between;font-size:0.63rem;color:var(--text-muted);margin-bottom:6px">`;
          html += `<span>${d.ahHomeC} slip · เก็บ ${d.ahHomeBet}฿ · จ่าย ${d.ahHomePay}฿</span>`;
          html += `<span style="text-align:right">${d.ahAwayC} slip · เก็บ ${d.ahAwayBet}฿ · จ่าย ${d.ahAwayPay}฿</span>`;
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
          html += `<div style="display:flex;justify-content:space-between;font-size:0.63rem;color:var(--text-muted);margin-bottom:2px">`;
          html += `<span>${d.overC} slip · เก็บ ${d.overBet}฿ · จ่าย ${d.overPay}฿</span>`;
          html += `<span style="text-align:right">${d.underC} slip · เก็บ ${d.underBet}฿ · จ่าย ${d.underPay}฿</span>`;
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

