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

  // ── Compute per-player insight ──────────────────────────────────────
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

  function computeInsight(player) {
    const mine = allSlips
      .filter(s => s.player === player && s.status !== 'cancelled')
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    let wins = 0, losses = 0, totalBet = 0, netPnl = 0;
    let streakVal = 0, streakDir = 0;
    let singles = 0, steps = 0, ahCount = 0, ouCount = 0;
    const pickFreq = {};
    const byRound = {};

    mine.forEach(s => {
      const r = resolveSlip(s);
      totalBet += s.bet || 0;
      netPnl   += r.profit;
      if ((s.picks || []).length >= 3) steps++; else singles++;

      (s.picks || []).forEach(p => {
        if (p.type === 'ou') ouCount++; else ahCount++;
        const k = p.type === 'ou' ? (p.pick === 'over' ? 'สูง' : 'ต่ำ') : (p.pick || '?');
        pickFreq[k] = (pickFreq[k] || 0) + 1;
      });

      const rk = getRoundKey(s);
      if (rk) {
        if (!byRound[rk]) byRound[rk] = 0;
        byRound[rk] += r.profit;
      }

      if (r.status === 'won') {
        wins++;
        if (streakDir === 1) streakVal++; else { streakDir = 1; streakVal = 1; }
      } else if (r.status === 'lost') {
        losses++;
        if (streakDir === -1) streakVal++; else { streakDir = -1; streakVal = 1; }
      }
    });

    const settled   = wins + losses;
    const winRate   = settled > 0 ? Math.round(wins / settled * 100) : null;
    const avgBet    = mine.length ? Math.round(totalBet / mine.length) : 0;
    const topPicks  = Object.entries(pickFreq).sort((a, b) => b[1] - a[1]).slice(0, 3);
    const roundKeys = Object.keys(byRound).sort();

    return { player, mine, wins, losses, settled, winRate, totalBet, netPnl, avgBet,
             singles, steps, ahCount, ouCount, topPicks, byRound, roundKeys,
             streakVal, streakDir, total: mine.length };
  }

  const insights = players.map(computeInsight).filter(x => x.total > 0);
  if (!insights.length) {
    container.innerHTML = `<div style="text-align:center;padding:40px;color:var(--text-muted)">ยังไม่มีสลิป</div>`;
    return;
  }

  const sorted = [...insights].sort((a, b) => b.netPnl - a.netPnl);
  const maxAbsPnl = Math.max(...insights.map(x => Math.abs(x.netPnl)), 1);

  let html = `<div style="padding:12px 14px 80px">`;

  // ── Section 1: Overview P&L bar chart ──────────────────────────────
  html += `<div style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius-lg);padding:12px 14px;margin-bottom:12px">`;
  html += `<div style="font-size:0.78rem;font-weight:700;color:var(--text-muted);margin-bottom:12px">${lang === 'th' ? 'กำไร/ขาดทุน · รายคน' : 'P&L · Per Player'}</div>`;
  sorted.forEach(x => {
    const isPos  = x.netPnl >= 0;
    const barW   = Math.round(Math.abs(x.netPnl) / maxAbsPnl * 120);
    const color  = isPos ? 'var(--accent)' : 'var(--secondary)';
    const amtStr = (isPos ? '+' : '') + x.netPnl + '฿';
    html += `<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">`;
    html += `<span style="font-size:0.78rem;color:var(--text-primary);width:64px;flex-shrink:0;font-weight:600">${getDisplayName(x.player)}</span>`;
    html += `<div style="flex:1;height:14px;background:var(--bg-input);border-radius:3px;overflow:hidden">`;
    html += `<div style="width:${barW}px;max-width:100%;height:100%;background:${color};border-radius:3px"></div>`;
    html += `</div>`;
    html += `<span style="font-size:0.78rem;font-weight:700;color:${color};width:56px;text-align:right;flex-shrink:0">${amtStr}</span>`;
    html += `</div>`;
  });
  html += `</div>`;

  // ── Section 2: Group stats grid ─────────────────────────────────────
  const totalSlipsAll = insights.reduce((s, x) => s + x.total, 0);
  const totalWonAll   = insights.reduce((s, x) => s + x.wins, 0);
  const totalLostAll  = insights.reduce((s, x) => s + x.losses, 0);

  const matchSlipCount = {};
  allSlips.filter(s => s.status !== 'cancelled').forEach(s => {
    (s.picks || []).forEach(p => { matchSlipCount[p.match_id] = (matchSlipCount[p.match_id] || 0) + 1; });
  });
  const topMatchId   = Object.entries(matchSlipCount).sort((a, b) => b[1] - a[1])[0];
  const topMatchObj  = topMatchId && ((state.matchById || {})[topMatchId[0]] || MATCHES.find(m => m.id === topMatchId[0]));
  const topMatchLabel = topMatchObj ? `${topMatchObj.team1} vs ${topMatchObj.team2}` : '-';

  const allPickFreq = {};
  allSlips.filter(s => s.status !== 'cancelled').forEach(s => {
    (s.picks || []).forEach(p => {
      const k = p.type === 'ou' ? (p.pick === 'over' ? 'สูง' : 'ต่ำ') : (p.pick || '?');
      allPickFreq[k] = (allPickFreq[k] || 0) + 1;
    });
  });
  const topTeam = Object.entries(allPickFreq).sort((a, b) => b[1] - a[1])[0];

  const gridItems = [
    { label: lang === 'th' ? 'สลิปรวม'  : 'Total Slips', val: totalSlipsAll,         color: 'var(--text-primary)' },
    { label: lang === 'th' ? 'ถูกรวม'   : 'Total Won',   val: totalWonAll,            color: 'var(--accent)'       },
    { label: lang === 'th' ? 'ผิดรวม'   : 'Total Lost',  val: totalLostAll,           color: 'var(--secondary)'    },
    { label: lang === 'th' ? 'ทีมฮิต'   : 'Top Pick',    val: topTeam ? topTeam[0] : '-', color: 'var(--text-primary)', small: true },
  ];
  html += `<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-bottom:12px">`;
  gridItems.forEach(({ label, val, color, small }) => {
    html += `<div style="text-align:center;padding:8px 4px;background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius)">`;
    html += `<div style="font-size:0.65rem;color:var(--text-muted);margin-bottom:3px">${label}</div>`;
    html += `<div style="font-size:${small ? '0.82rem' : '1.1rem'};font-weight:700;color:${color}">${val}</div>`;
    html += `</div>`;
  });
  html += `</div>`;

  // Most popular match callout
  if (topMatchObj) {
    html += `<div style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);padding:8px 12px;margin-bottom:12px;font-size:0.8rem;color:var(--text-muted)">`;
    html += `⚽ ${lang === 'th' ? 'แมตช์ฮิตสุด' : 'Most bet match'}: <span style="color:var(--text-primary);font-weight:700">${topMatchLabel}</span> (${topMatchId[1]} ${lang === 'th' ? 'picks' : 'picks'})`;
    html += `</div>`;
  }

  // ── Section 3: Per-player cards ─────────────────────────────────────
  html += `<div style="font-size:0.78rem;font-weight:700;color:var(--text-muted);margin-bottom:10px">${lang === 'th' ? 'รายคน' : 'Per Player'}</div>`;

  sorted.forEach(x => {
    const isPos    = x.netPnl >= 0;
    const pnlColor = isPos ? 'var(--accent)' : 'var(--secondary)';
    const pnlStr   = (isPos ? '+' : '') + x.netPnl + '฿';
    const streak   = x.streakVal > 0 ? (x.streakDir === 1 ? `🔥 ${x.streakVal}` : `🧊 ${x.streakVal}`) : '-';
    const winRateStr = x.winRate !== null ? x.winRate + '%' : '-';

    html += `<div style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius-lg);padding:12px 14px;margin-bottom:10px">`;

    // Header
    html += `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">`;
    html += `<span style="font-size:1rem;font-weight:700;color:var(--text-primary)">${getDisplayName(x.player)}</span>`;
    html += `<span style="font-size:1rem;font-weight:700;color:${pnlColor}">${pnlStr}</span>`;
    html += `</div>`;

    // Stat grid 3×2
    const stats = [
      { label: lang === 'th' ? 'สลิป'      : 'Slips',     val: x.total },
      { label: lang === 'th' ? 'Win Rate'  : 'Win Rate',  val: winRateStr, color: x.winRate !== null ? (x.winRate >= 50 ? 'var(--accent)' : 'var(--secondary)') : 'var(--text-muted)' },
      { label: lang === 'th' ? 'Avg Bet'   : 'Avg Bet',   val: x.avgBet + '฿' },
      { label: 'Single/Step', val: `${x.singles}/${x.steps}` },
      { label: 'AH/O·U',     val: `${x.ahCount}/${x.ouCount}` },
      { label: lang === 'th' ? 'Streak'    : 'Streak',    val: streak },
    ];
    html += `<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-bottom:10px">`;
    stats.forEach(({ label, val, color }) => {
      html += `<div style="text-align:center;padding:7px 4px;background:var(--bg-input);border-radius:var(--radius)">`;
      html += `<div style="font-size:0.65rem;color:var(--text-muted);margin-bottom:2px">${label}</div>`;
      html += `<div style="font-size:0.9rem;font-weight:700;color:${color || 'var(--text-primary)'}">${val}</div>`;
      html += `</div>`;
    });
    html += `</div>`;

    // Mini P&L by round bars
    if (x.roundKeys.length > 0) {
      const recentRounds = x.roundKeys.slice(-5);
      const maxRoundAbs  = Math.max(...recentRounds.map(k => Math.abs(x.byRound[k])), 1);
      html += `<div style="margin-bottom:10px">`;
      html += `<div style="font-size:0.68rem;color:var(--text-muted);margin-bottom:5px">${lang === 'th' ? 'P&L รายวัน' : 'Daily P&L'}</div>`;
      recentRounds.forEach(key => {
        const net    = x.byRound[key];
        const barW   = Math.round(Math.abs(net) / maxRoundAbs * 100);
        const isP    = net >= 0;
        const col    = isP ? 'var(--accent)' : 'var(--secondary)';
        const [yr, mo, dy] = key.split('-').map(Number);
        const dlabel = new Date(Date.UTC(yr, mo - 1, dy)).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
        html += `<div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">`;
        html += `<span style="font-size:0.65rem;color:var(--text-muted);width:44px;flex-shrink:0">${dlabel}</span>`;
        html += `<div style="flex:1;height:10px;background:var(--bg-deep);border-radius:2px;overflow:hidden">`;
        html += `<div style="width:${barW}%;height:100%;background:${col};border-radius:2px"></div>`;
        html += `</div>`;
        html += `<span style="font-size:0.68rem;font-weight:700;color:${col};width:44px;text-align:right;flex-shrink:0">${isP ? '+' : ''}${net}฿</span>`;
        html += `</div>`;
      });
      html += `</div>`;
    }

    // Top picks chips
    if (x.topPicks.length > 0) {
      html += `<div style="display:flex;gap:6px;flex-wrap:wrap">`;
      x.topPicks.forEach(([pick, count]) => {
        const team = typeof TEAMS !== 'undefined' && TEAMS[pick];
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
