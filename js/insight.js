// Admin Insight Page — player behavior analysis

function renderInsight() {
  const container = document.getElementById('view-insight');
  if (!container) return;
  if (!state.isAdmin) { container.innerHTML = ''; return; }

  const lang = currentLang;
  const allSlips = getAllSlips();
  const players  = getPlayers();

  if (!players.length || !allSlips.length) {
    container.innerHTML = `<div style="text-align:center;padding:40px;color:var(--text-muted)">ยังไม่มีข้อมูล</div>`;
    return;
  }

  // ── Helpers ─────────────────────────────────────────────────────────
  function getRoundKey(s) {
    const picks = s.picks || [];
    if (!picks.length) return null;
    const match = (state.matchById || {})[picks[0].match_id] || MATCHES.find(m => m.id === picks[0].match_id);
    if (!match) return null;
    const thaiMs = etToThai(match.date).getTime() + 7 * 3600 * 1000;
    const d = new Date(thaiMs);
    if (d.getUTCHours() < 14) d.setUTCDate(d.getUTCDate() - 1);
    return d.toISOString().slice(0, 10);
  }

  function fmtHours(h) {
    if (h < 1)   return Math.round(h * 60) + 'm';
    if (h < 24)  return Math.round(h) + 'h';
    return Math.round(h / 24) + 'd';
  }

  // ── Per-player computation ───────────────────────────────────────────
  function computeInsight(player) {
    const mine = allSlips
      .filter(s => s.player === player && s.status !== 'cancelled')
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    let wins = 0, losses = 0, totalBet = 0, netPnl = 0;
    let streakVal = 0, streakDir = 0;
    let singles = 0, steps = 0;
    let singleWins = 0, singleLosses = 0, stepWins = 0, stepLosses = 0;
    let ahCount = 0, ouCount = 0;
    let ahWins = 0, ahLosses = 0, ouWins = 0, ouLosses = 0;
    let totalOdds = 0, oddsCount = 0;
    let totalTimingHours = 0, timingCount = 0;
    const pickFreq = {};
    const byRound  = {};

    mine.forEach(s => {
      const r      = resolveSlip(s);
      const isStep = (s.picks || []).length >= 3;
      totalBet += s.bet || 0;
      netPnl   += r.profit;

      // Avg odds
      const co = parseFloat(s.combined_odds);
      if (co > 0) { totalOdds += co; oddsCount++; }

      // Bet timing: hours between submission and earliest kickoff in slip
      const slipMatches = (s.picks || [])
        .map(p => (state.matchById || {})[p.match_id] || MATCHES.find(m => m.id === p.match_id))
        .filter(Boolean)
        .sort((a, b) => new Date(a.date) - new Date(b.date));
      if (slipMatches.length && s.timestamp) {
        const kickoff   = etToThai(slipMatches[0].date).getTime();
        const submitted = new Date(s.timestamp).getTime();
        const hrs       = (kickoff - submitted) / 3600000;
        if (hrs > 0 && hrs < 24 * 30) { totalTimingHours += hrs; timingCount++; }
      }

      // Single vs Step counts + win rates
      if (isStep) {
        steps++;
        if (r.status === 'won')  stepWins++;
        else if (r.status === 'lost') stepLosses++;
      } else {
        singles++;
        if (r.status === 'won')  singleWins++;
        else if (r.status === 'lost') singleLosses++;
      }

      // Pick-type breakdown (AH vs O/U)
      (s.picks || []).forEach(p => {
        if (p.type === 'ou') ouCount++; else ahCount++;
        const k = p.type === 'ou' ? (p.pick === 'over' ? 'สูง' : 'ต่ำ') : (p.pick || '?');
        pickFreq[k] = (pickFreq[k] || 0) + 1;
        // Win rate per type: singles only (steps can't be attributed per pick)
        if (!isStep) {
          if (p.type === 'ou') { if (r.status === 'won') ouWins++; else if (r.status === 'lost') ouLosses++; }
          else                 { if (r.status === 'won') ahWins++; else if (r.status === 'lost') ahLosses++; }
        }
      });

      // P&L by round (also used for daily streak)
      const rk = getRoundKey(s);
      if (rk) {
        if (!byRound[rk]) byRound[rk] = { net: 0, hasPending: false };
        if (r.status === 'pending') byRound[rk].hasPending = true;
        else byRound[rk].net += r.profit;
      }

      if (r.status === 'won') wins++;
      else if (r.status === 'lost') losses++;
    });

    // Daily streak (net+ / net- per day, skip days with pending)
    Object.keys(byRound).sort().forEach(dk => {
      const day = byRound[dk];
      if (day.hasPending) return;
      if (day.net > 0) {
        if (streakDir === 1) streakVal++; else { streakDir = 1; streakVal = 1; }
      } else if (day.net < 0) {
        if (streakDir === -1) streakVal++; else { streakDir = -1; streakVal = 1; }
      }
    });

    // Flatten byRound to net values for chart
    const byRoundNet = {};
    Object.keys(byRound).forEach(k => { byRoundNet[k] = byRound[k].net; });

    const settled        = wins + losses;
    const winRate        = settled > 0 ? Math.round(wins / settled * 100) : null;
    const roi            = totalBet > 0 ? Math.round(netPnl / totalBet * 100) : null;
    const avgBet         = mine.length ? Math.round(totalBet / mine.length) : 0;
    const avgOdds        = oddsCount > 0 ? (totalOdds / oddsCount).toFixed(2) : null;
    const avgTimingHours = timingCount > 0 ? totalTimingHours / timingCount : null;

    const singleSettled  = singleWins + singleLosses;
    const stepSettled    = stepWins   + stepLosses;
    const singleWinRate  = singleSettled > 0 ? Math.round(singleWins / singleSettled * 100) : null;
    const stepWinRate    = stepSettled   > 0 ? Math.round(stepWins   / stepSettled   * 100) : null;

    const ahSettled = ahWins + ahLosses;
    const ouSettled = ouWins + ouLosses;
    const ahWinRate = ahSettled > 0 ? Math.round(ahWins / ahSettled * 100) : null;
    const ouWinRate = ouSettled > 0 ? Math.round(ouWins / ouSettled * 100) : null;

    const topPicks  = Object.entries(pickFreq).sort((a, b) => b[1] - a[1]).slice(0, 3);
    const roundKeys = Object.keys(byRoundNet).sort();

    return { player, mine, wins, losses, settled, winRate, roi, totalBet, netPnl, avgBet,
             avgOdds, avgTimingHours,
             singles, steps, singleWinRate, stepWinRate,
             ahCount, ouCount, ahWinRate, ouWinRate,
             topPicks, byRound: byRoundNet, roundKeys,
             streakVal, streakDir, total: mine.length };
  }

  const insights = players.map(computeInsight).filter(x => x.total > 0);
  if (!insights.length) {
    container.innerHTML = `<div style="text-align:center;padding:40px;color:var(--text-muted)">ยังไม่มีสลิป</div>`;
    return;
  }

  const sorted     = [...insights].sort((a, b) => b.netPnl - a.netPnl);
  const maxAbsPnl  = Math.max(...insights.map(x => Math.abs(x.netPnl)), 1);

  let html = `<div style="padding:12px 14px 80px">`;

  // ── Section 1: Overview P&L bar chart ──────────────────────────────
  html += `<div style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius-lg);padding:12px 14px;margin-bottom:12px">`;
  html += `<div style="font-size:0.78rem;font-weight:700;color:var(--text-muted);margin-bottom:12px">${lang === 'th' ? 'กำไร/ขาดทุน · รายคน' : 'P&L · Per Player'}</div>`;
  sorted.forEach(x => {
    const isPos  = x.netPnl >= 0;
    const barW   = Math.round(Math.abs(x.netPnl) / maxAbsPnl * 120);
    const color  = isPos ? 'var(--accent)' : 'var(--secondary)';
    const amtStr = (isPos ? '+' : '') + x.netPnl + '';
    const roiStr = x.roi !== null ? ` (${x.roi > 0 ? '+' : ''}${x.roi}%)` : '';
    html += `<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">`;
    html += `<span style="font-size:0.78rem;color:var(--text-primary);width:64px;flex-shrink:0;font-weight:600">${getDisplayName(x.player)}</span>`;
    html += `<div style="flex:1;height:14px;background:var(--bg-input);border-radius:3px;overflow:hidden">`;
    html += `<div style="width:${barW}px;max-width:100%;height:100%;background:${color};border-radius:3px"></div>`;
    html += `</div>`;
    html += `<span style="font-size:0.78rem;font-weight:700;color:${color};width:80px;text-align:right;flex-shrink:0">${amtStr}<span style="font-size:0.65rem;font-weight:500">${roiStr}</span></span>`;
    html += `</div>`;
  });
  html += `</div>`;

  // ── Section 1b: Balance overview (only when initial_balance set) ───
  const balanceRows = players.map(p => {
    const pd  = state.players.find(x => x.player_id === p);
    const ini = pd && pd.initial_balance !== '' && pd.initial_balance != null ? parseFloat(pd.initial_balance) || 0 : null;
    if (ini === null) return null;
    const approvedPnl = allSlips
      .filter(s => s.player === p && s.status === 'approved')
      .reduce((sum, s) => sum + resolveSlip(s).profit, 0);
    return { player: p, ini, current: ini + approvedPnl };
  }).filter(Boolean);

  if (balanceRows.length > 0) {
    const maxBal = Math.max(...balanceRows.map(r => Math.abs(r.current - r.ini)), 1);
    html += `<div style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius-lg);padding:12px 14px;margin-bottom:12px">`;
    html += `<div style="font-size:0.78rem;font-weight:700;color:var(--text-muted);margin-bottom:12px">${lang === 'th' ? 'ยอดเงินปัจจุบัน (ยืนยันแล้ว)' : 'Current Balance (settled)'}</div>`;
    balanceRows.sort((a, b) => b.current - a.current).forEach(r => {
      const diff    = r.current - r.ini;
      const isPos   = diff >= 0;
      const color   = isPos ? 'var(--accent)' : 'var(--secondary)';
      const barW    = Math.round(Math.abs(diff) / maxBal * 80);
      html += `<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">`;
      html += `<span style="font-size:0.78rem;color:var(--text-primary);width:64px;flex-shrink:0;font-weight:600">${getDisplayName(r.player)}</span>`;
      html += `<div style="flex:1;height:14px;background:var(--bg-input);border-radius:3px;overflow:hidden">`;
      html += `<div style="width:${barW}px;max-width:100%;height:100%;background:${color};border-radius:3px"></div>`;
      html += `</div>`;
      html += `<span style="font-size:0.78rem;font-weight:700;color:var(--text-primary);width:88px;text-align:right;flex-shrink:0">${r.current.toLocaleString()} <span style="font-size:0.65rem;color:${color}">${isPos ? '+' : ''}${diff}</span></span>`;
      html += `</div>`;
    });
    html += `</div>`;
  }

  // ── Section 2: Group stats grid ─────────────────────────────────────
  const totalSlipsAll = insights.reduce((s, x) => s + x.total, 0);
  const totalWonAll   = insights.reduce((s, x) => s + x.wins, 0);
  const totalLostAll  = insights.reduce((s, x) => s + x.losses, 0);
  const groupWinRate  = (totalWonAll + totalLostAll) > 0
    ? Math.round(totalWonAll / (totalWonAll + totalLostAll) * 100) : 0;

  const matchSlipCount = {};
  allSlips.filter(s => s.status !== 'cancelled').forEach(s => {
    (s.picks || []).forEach(p => { matchSlipCount[p.match_id] = (matchSlipCount[p.match_id] || 0) + 1; });
  });
  const topMatchId  = Object.entries(matchSlipCount).sort((a, b) => b[1] - a[1])[0];
  const topMatchObj = topMatchId && ((state.matchById || {})[topMatchId[0]] || MATCHES.find(m => m.id === topMatchId[0]));

  const allPickFreq = {};
  allSlips.filter(s => s.status !== 'cancelled').forEach(s => {
    (s.picks || []).forEach(p => {
      const k = p.type === 'ou' ? (p.pick === 'over' ? 'สูง' : 'ต่ำ') : (p.pick || '?');
      allPickFreq[k] = (allPickFreq[k] || 0) + 1;
    });
  });
  const topTeam = Object.entries(allPickFreq).sort((a, b) => b[1] - a[1])[0];

  const gridItems = [
    { label: lang === 'th' ? 'สลิปรวม' : 'Total Slips', val: totalSlipsAll,              color: 'var(--text-primary)' },
    { label: lang === 'th' ? 'Win Rate' : 'Win Rate',   val: groupWinRate + '%',          color: groupWinRate >= 50 ? 'var(--accent)' : 'var(--secondary)' },
    { label: lang === 'th' ? 'ถูก/ผิด'  : 'Won/Lost',   val: `${totalWonAll}/${totalLostAll}`, color: 'var(--text-primary)' },
    { label: lang === 'th' ? 'ทีมฮิต'   : 'Top Pick',   val: topTeam ? topTeam[0] : '-', color: 'var(--text-primary)', small: true },
  ];
  html += `<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-bottom:12px">`;
  gridItems.forEach(({ label, val, color, small }) => {
    html += `<div style="text-align:center;padding:8px 4px;background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius)">`;
    html += `<div style="font-size:0.65rem;color:var(--text-muted);margin-bottom:3px">${label}</div>`;
    html += `<div style="font-size:${small ? '0.82rem' : '1.1rem'};font-weight:700;color:${color}">${val}</div>`;
    html += `</div>`;
  });
  html += `</div>`;

  if (topMatchObj) {
    html += `<div style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);padding:8px 12px;margin-bottom:12px;font-size:0.8rem;color:var(--text-muted)">`;
    html += `⚽ ${lang === 'th' ? 'แมตช์ฮิตสุด' : 'Most bet match'}: <span style="color:var(--text-primary);font-weight:700">${topMatchObj.team1} vs ${topMatchObj.team2}</span> (${topMatchId[1]} picks)`;
    html += `</div>`;
  }

  // ── Section 3: Per-player cards ─────────────────────────────────────
  html += `<div style="font-size:0.78rem;font-weight:700;color:var(--text-muted);margin-bottom:10px">${lang === 'th' ? 'รายคน' : 'Per Player'}</div>`;

  sorted.forEach(x => {
    const isPos     = x.netPnl >= 0;
    const pnlColor  = isPos ? 'var(--accent)' : 'var(--secondary)';
    const pnlStr    = (isPos ? '+' : '') + x.netPnl + '';
    const roiStr    = x.roi !== null ? ` ${x.roi > 0 ? '+' : ''}${x.roi}%` : '';
    const streak    = x.streakVal > 0 ? (x.streakDir === 1 ? `🔥 ${x.streakVal} วัน` : `🧊 ${x.streakVal} วัน`) : '-';
    const wrStr     = x.winRate !== null ? x.winRate + '%' : '-';
    const wrColor   = x.winRate !== null ? (x.winRate >= 50 ? 'var(--accent)' : 'var(--secondary)') : 'var(--text-muted)';
    const roiColor  = x.roi !== null ? (x.roi >= 0 ? 'var(--accent)' : 'var(--secondary)') : 'var(--text-muted)';

    html += `<div style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius-lg);padding:12px 14px;margin-bottom:10px">`;

    // Header
    html += `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">`;
    html += `<span style="font-size:1rem;font-weight:700;color:var(--text-primary)">${getDisplayName(x.player)}</span>`;
    html += `<span style="text-align:right"><span style="font-size:1rem;font-weight:700;color:${pnlColor}">${pnlStr}</span><span style="font-size:0.72rem;color:${roiColor};margin-left:4px">${roiStr}</span></span>`;
    html += `</div>`;

    // Stat grid 4×2
    const stats = [
      { label: lang === 'th' ? 'สลิป'    : 'Slips',    val: x.total,                                    color: 'var(--text-primary)' },
      { label: 'Win Rate',                               val: wrStr,                                      color: wrColor },
      { label: 'ROI',                                    val: x.roi !== null ? (x.roi > 0 ? '+' : '') + x.roi + '%' : '-', color: roiColor },
      { label: lang === 'th' ? 'Avg Bet' : 'Avg Bet',  val: x.avgBet + '',                             color: 'var(--text-primary)' },
      { label: 'Single/Step',                            val: `${x.singles}/${x.steps}`,                 color: 'var(--text-primary)' },
      { label: 'AH/O·U picks',                          val: `${x.ahCount}/${x.ouCount}`,               color: 'var(--text-primary)' },
      { label: 'Avg Odds',                               val: x.avgOdds || '-',                           color: 'var(--text-primary)' },
      { label: 'Streak',                                 val: streak,                                     color: 'var(--text-primary)' },
    ];
    html += `<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-bottom:10px">`;
    stats.forEach(({ label, val, color }) => {
      html += `<div style="text-align:center;padding:7px 4px;background:var(--bg-input);border-radius:var(--radius)">`;
      html += `<div style="font-size:0.6rem;color:var(--text-muted);margin-bottom:2px">${label}</div>`;
      html += `<div style="font-size:0.85rem;font-weight:700;color:${color}">${val}</div>`;
      html += `</div>`;
    });
    html += `</div>`;

    // Win rate breakdown: Single vs Step
    const hasWrBreakdown = x.singleWinRate !== null || x.stepWinRate !== null;
    if (hasWrBreakdown) {
      html += `<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:8px">`;
      const bkItems = [
        { label: `Single WR (${x.singles})`, val: x.singleWinRate !== null ? x.singleWinRate + '%' : '-', color: x.singleWinRate !== null ? (x.singleWinRate >= 50 ? 'var(--accent)' : 'var(--secondary)') : 'var(--text-muted)' },
        { label: `Step WR (${x.steps})`,     val: x.stepWinRate   !== null ? x.stepWinRate   + '%' : '-', color: x.stepWinRate   !== null ? (x.stepWinRate   >= 50 ? 'var(--accent)' : 'var(--secondary)') : 'var(--text-muted)' },
      ];
      bkItems.forEach(({ label, val, color }) => {
        html += `<div style="text-align:center;padding:7px 4px;background:var(--bg-input);border-radius:var(--radius)">`;
        html += `<div style="font-size:0.6rem;color:var(--text-muted);margin-bottom:2px">${label}</div>`;
        html += `<div style="font-size:0.88rem;font-weight:700;color:${color}">${val}</div>`;
        html += `</div>`;
      });
      html += `</div>`;
    }

    // Win rate breakdown: AH vs O/U (singles only)
    const hasTypeWr = x.ahWinRate !== null || x.ouWinRate !== null;
    if (hasTypeWr) {
      html += `<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:8px">`;
      const typeItems = [
        { label: `AH WR (singles, ${x.ahCount})`, val: x.ahWinRate !== null ? x.ahWinRate + '%' : '-', color: x.ahWinRate !== null ? (x.ahWinRate >= 50 ? 'var(--accent)' : 'var(--secondary)') : 'var(--text-muted)' },
        { label: `O/U WR (singles, ${x.ouCount})`, val: x.ouWinRate !== null ? x.ouWinRate + '%' : '-', color: x.ouWinRate !== null ? (x.ouWinRate >= 50 ? 'var(--accent)' : 'var(--secondary)') : 'var(--text-muted)' },
      ];
      typeItems.forEach(({ label, val, color }) => {
        html += `<div style="text-align:center;padding:7px 4px;background:var(--bg-input);border-radius:var(--radius)">`;
        html += `<div style="font-size:0.6rem;color:var(--text-muted);margin-bottom:2px">${label}</div>`;
        html += `<div style="font-size:0.88rem;font-weight:700;color:${color}">${val}</div>`;
        html += `</div>`;
      });
      html += `</div>`;
    }

    // Bet timing chip
    if (x.avgTimingHours !== null) {
      const timingLabel = fmtHours(x.avgTimingHours);
      const timingDesc  = x.avgTimingHours < 1
        ? (lang === 'th' ? 'แทงนาทีสุดท้าย' : 'last-minute')
        : x.avgTimingHours < 3
        ? (lang === 'th' ? 'แทงก่อนเตะไม่นาน' : 'close to kickoff')
        : (lang === 'th' ? 'แทงล่วงหน้า' : 'plans ahead');
      html += `<div style="margin-bottom:10px;font-size:0.72rem;color:var(--text-muted)">`;
      html += `⏰ ${lang === 'th' ? 'แทงก่อนเตะ avg' : 'Avg bet timing'} <span style="color:var(--text-primary);font-weight:700">${timingLabel}</span> — ${timingDesc}`;
      html += `</div>`;
    }

    // Mini P&L by round bars
    if (x.roundKeys.length > 0) {
      const recentRounds = x.roundKeys.slice(-5);
      const maxRoundAbs  = Math.max(...recentRounds.map(k => Math.abs(x.byRound[k])), 1);
      html += `<div style="margin-bottom:10px">`;
      html += `<div style="font-size:0.68rem;color:var(--text-muted);margin-bottom:5px">${lang === 'th' ? 'P&L รายวัน' : 'Daily P&L'}</div>`;
      recentRounds.forEach(key => {
        const net  = x.byRound[key];
        const barW = Math.round(Math.abs(net) / maxRoundAbs * 100);
        const isP  = net >= 0;
        const col  = isP ? 'var(--accent)' : 'var(--secondary)';
        const [yr, mo, dy] = key.split('-').map(Number);
        const dlabel = new Date(Date.UTC(yr, mo - 1, dy)).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
        html += `<div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">`;
        html += `<span style="font-size:0.65rem;color:var(--text-muted);width:44px;flex-shrink:0">${dlabel}</span>`;
        html += `<div style="flex:1;height:10px;background:var(--bg-deep);border-radius:2px;overflow:hidden">`;
        html += `<div style="width:${barW}%;height:100%;background:${col};border-radius:2px"></div>`;
        html += `</div>`;
        html += `<span style="font-size:0.68rem;font-weight:700;color:${col};width:44px;text-align:right;flex-shrink:0">${isP ? '+' : ''}${fmtM(net)}</span>`;
        html += `</div>`;
      });
      html += `</div>`;
    }

    // Top picks chips
    if (x.topPicks.length > 0) {
      html += `<div style="display:flex;gap:6px;flex-wrap:wrap">`;
      x.topPicks.forEach(([pick, count]) => {
        const team  = typeof TEAMS !== 'undefined' && TEAMS[pick];
        const label = team ? (lang === 'th' ? team.nameTh : team.name) : pick;
        html += `<span style="font-size:0.72rem;background:var(--bg-input);border:1px solid var(--border);border-radius:100px;padding:3px 10px;color:var(--text-muted)">${label} ×${count}</span>`;
      });
      html += `</div>`;
    }

    html += `</div>`; // end player card
  });

  html += `</div>`; // end page padding
  container.innerHTML = html;
}
