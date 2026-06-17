// Schedule — main tab (was overlay)

function renderSchedule() {
  const container = document.getElementById('view-schedule');
  if (!container) return;
  const lang = currentLang;

  const groups = Object.keys(GROUPS);

  let html = '';

  html += '<div style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:12px">';
  html += `<button class="sch-group-btn btn active" data-group="ALL" style="padding:6px 12px;font-size:0.8rem;background:var(--primary);border:1px solid var(--primary);color:#fff;border-radius:var(--radius);font-weight:700">${currentLang === 'th' ? 'ทั้งหมด' : 'All'}</button>`;
  groups.forEach(g => {
    html += `<button class="sch-group-btn btn" data-group="${g}" style="padding:6px 12px;font-size:0.8rem;background:var(--bg-input);border:1px solid var(--border);color:var(--text-primary);border-radius:var(--radius);font-weight:700">${g}</button>`;
  });
  html += '<button class="sch-group-btn btn" data-group="KO" style="padding:6px 12px;font-size:0.8rem;background:var(--bg-input);border:1px solid var(--border);color:var(--text-primary);border-radius:var(--radius);font-weight:700">KO</button>';
  html += '</div>';

  html += '<div id="sch-groups-content"></div>';
  container.innerHTML = html;

  showScheduleGroup('ALL');

  container.querySelectorAll('.sch-group-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      showScheduleGroup(btn.dataset.group);
    });
  });
}

function showScheduleGroup(groupKey) {
  const content = document.getElementById('sch-groups-content');
  if (!content) return;
  const lang = currentLang;

  // Highlight active tab
  const container = document.getElementById('view-schedule');
  container.querySelectorAll('.sch-group-btn').forEach(b => {
    if (b.dataset.group === groupKey) {
      b.style.background = 'var(--primary)';
      b.style.borderColor = 'var(--primary)';
      b.style.color = '#fff';
    } else {
      b.style.background = 'var(--bg-input)';
      b.style.borderColor = 'var(--border)';
      b.style.color = 'var(--text-primary)';
    }
  });

  if (groupKey === 'ALL') {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const hasOdds = m => !!(state.ahLines[m.id] || state.ouLines[m.id]);

    const allSorted = [...MATCHES].sort((a, b) => new Date(a.date) - new Date(b.date));
    const upcoming = allSorted.filter(m => etToThai(m.date) >= todayStart);
    const past = allSorted.filter(m => etToThai(m.date) < todayStart).reverse();

    upcoming.sort((a, b) => {
      if (hasOdds(a) && !hasOdds(b)) return -1;
      if (!hasOdds(a) && hasOdds(b)) return 1;
      return new Date(a.date) - new Date(b.date);
    });

    const tabOn  = 'padding:6px 14px;font-size:0.82rem;background:var(--primary);border:1px solid var(--primary);color:#fff;border-radius:var(--radius);font-weight:700;cursor:pointer';
    const tabOff = 'padding:6px 14px;font-size:0.82rem;background:var(--bg-input);border:1px solid var(--border);color:var(--text-primary);border-radius:var(--radius);font-weight:700;cursor:pointer';

    let html = `<div style="display:flex;gap:8px;margin-bottom:12px">`;
    html += `<button class="sch-time-btn" data-time="upcoming" style="${tabOn}">${lang === 'th' ? 'วันนี้เป็นต้นไป' : 'Upcoming'} (${upcoming.length})</button>`;
    html += `<button class="sch-time-btn" data-time="past" style="${tabOff}">${lang === 'th' ? 'ผลบอล' : 'Results'} (${past.length})</button>`;
    html += `</div>`;

    html += `<div id="sch-upcoming">`;
    upcoming.forEach(m => { html += renderScheduleMatchCard(m); });
    html += `</div>`;

    html += `<div id="sch-past" style="display:none">`;
    past.forEach(m => { html += renderScheduleMatchCard(m); });
    html += `</div>`;

    content.innerHTML = html;

    content.querySelectorAll('.sch-time-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const time = btn.dataset.time;
        content.querySelectorAll('.sch-time-btn').forEach(b => { b.style.cssText = b.dataset.time === time ? tabOn : tabOff; });
        content.querySelector('#sch-upcoming').style.display = time === 'upcoming' ? '' : 'none';
        content.querySelector('#sch-past').style.display   = time === 'past'     ? '' : 'none';
      });
    });
    return;
  }

  if (groupKey === 'KO') {
    renderKnockoutSchedule(content);
    return;
  }

  const teams = GROUPS[groupKey];
  const matches = MATCHES.filter(m => m.group === groupKey);

  let html = '';

  // Group standings — calculated from real scores
  const st = {};
  teams.forEach(c => { st[c] = { mp:0, w:0, d:0, l:0, gf:0, ga:0, pts:0 }; });
  matches.forEach(m => {
    const r = state.matches[m.id];
    if (!r || typeof r.team1_score !== 'number' || typeof r.team2_score !== 'number') return;
    const s1 = r.team1_score, s2 = r.team2_score;
    const a = st[m.team1], b = st[m.team2];
    if (!a || !b) return;
    a.mp++; a.gf += s1; a.ga += s2;
    b.mp++; b.gf += s2; b.ga += s1;
    if (s1 > s2)      { a.w++; a.pts += 3; b.l++; }
    else if (s1 < s2) { b.w++; b.pts += 3; a.l++; }
    else              { a.d++; a.pts++;     b.d++; b.pts++; }
  });
  const sorted = teams
    .map(c => ({ c, ...st[c], gd: st[c].gf - st[c].ga }))
    .sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf);

  html += '<table class="group-table"><thead><tr>';
  html += '<th></th><th>' + (lang === 'th' ? 'ทีม' : 'Team') + '</th>';
  html += '<th>MP</th><th>W</th><th>D</th><th>L</th><th>GD</th><th>Pts</th>';
  html += '</tr></thead><tbody>';
  sorted.forEach(({ c, mp, w, d, l, gd, pts }) => {
    const team = TEAMS[c];
    const gdStr = gd > 0 ? '+' + gd : String(gd);
    html += `<tr><td>${lang === 'th' ? team.nameTh : team.name}</td>`;
    html += `<td>${mp}</td><td>${w}</td><td>${d}</td><td>${l}</td><td>${gdStr}</td><td class="pts">${pts}</td></tr>`;
  });
  html += '</tbody></table>';

  // Matches
  matches.forEach(m => {
    html += renderScheduleMatchCard(m);
  });

  content.innerHTML = html;
}

function renderKnockoutSchedule(content) {
  const lang = currentLang;
  const stages = ['R32', 'R16', 'QF', 'SF', '3rd', 'final'];
  let html = '';

  stages.forEach(stage => {
    const matches = MATCHES.filter(m => m.stage === stage);
    if (!matches.length) return;
    html += `<div class="group-section">`;
    html += `<div class="group-title">${STAGE_LABELS[lang][stage]}</div>`;
    matches.forEach(m => {
      html += renderScheduleMatchCard(m);
    });
    html += '</div>';
  });

  content.innerHTML = html;
}

function renderScheduleMatchCard(match) {
  const lang = currentLang;
  const t1 = TEAMS[match.team1];
  const t2 = TEAMS[match.team2];
  const t1Label = t1 ? `<span class="team-name">${lang === 'th' ? t1.nameTh : t1.name}</span>` : getTeamLabel(match.team1, lang);
  const t2Label = t2 ? `<span class="team-name">${lang === 'th' ? t2.nameTh : t2.name}</span>` : getTeamLabel(match.team2, lang);

  const result = state.matches[match.id];
  const score1 = result ? result.team1_score : '';
  const score2 = result ? result.team2_score : '';
  const ahLine = state.ahLines[match.id] || '';
  const ouLine = state.ouLines[match.id] || '';
  const ahOddsH = state.ahOddsH[match.id] || '';
  const ahOddsA = state.ahOddsA[match.id] || '';
  const ouOddsO = state.ouOddsO[match.id] || '';
  const ouOddsU = state.ouOddsU[match.id] || '';

  const kickoff = etToThai(match.date);
  const now = new Date();
  const isLive = now >= kickoff && now < new Date(kickoff.getTime() + 115 * 60 * 1000);

  let scoreDisplay = '';
  if (typeof score1 === 'number' && typeof score2 === 'number') {
    scoreDisplay = `<span class="badge badge-exact">${score1} - ${score2}</span>`;
  } else if (isLive) {
    scoreDisplay = `<span class="live-badge">LIVE</span>`;
  } else {
    scoreDisplay = '<span style="color:var(--text-muted)">vs</span>';
  }

  let html = `<div class="card match-card${isLive ? ' match-card-live' : ''}">`;
  html += `<div class="match-header">`;
  html += `<span>${formatMatchDate(match, lang)}</span>`;
  html += `<span class="match-stage">${match.stage === 'group' ? match.group : STAGE_LABELS[lang][match.stage]}</span>`;
  html += `</div>`;
  html += `<div class="match-teams">`;
  html += `<div class="team team-home">${t1Label}</div>`;
  html += `<div class="match-score">${scoreDisplay}</div>`;
  html += `<div class="team team-away">${t2Label}</div>`;
  html += `</div>`;

  // Lines + odds
  if (ahLine || ouLine) {
    html += `<div class="match-ah">`;
    if (ahLine) {
      const t1Name = t1 ? (lang === 'th' ? t1.nameTh : t1.name) : '';
      const t2Name = t2 ? (lang === 'th' ? t2.nameTh : t2.name) : '';
      html += `<div class="ah-line">AH ${t1Name} <span style="font-weight:700">${formatAhFav(ahLine, true)}</span> <span class="odds-tag">@${ahOddsH}</span> / ${t2Name} <span style="font-weight:700">${formatAhFav(ahLine, false)}</span> <span class="odds-tag">@${ahOddsA}</span></div>`;
    }
    if (ouLine) {
      html += `<div class="ah-line">${lang === 'th' ? 'สูงต่ำ' : 'O/U'} ${ouLine} <span class="odds-tag">${lang === 'th' ? 'สูง' : 'O'} @${ouOddsO}</span> / <span class="odds-tag">${lang === 'th' ? 'ต่ำ' : 'U'} @${ouOddsU}</span></div>`;
    }
    html += `</div>`;
  }

  html += `<div class="match-venue">${match.venue}</div>`;
  html += `</div>`;
  return html;
}

function renderPendingSlipCard(slip, lang) {
  const resolved = typeof resolveSlip === 'function' ? resolveSlip(slip) : { status: slip.status, profit: 0 };
  const st = resolved.status;
  const isStep = (slip.picks || []).length >= 3;
  const needsApprove = state.isAdmin && (st === 'won' || st === 'lost') && slip.status !== 'approved';

  let borderStyle, bgStyle;
  if (st === 'won' || st === 'approved') {
    borderStyle = 'border:2px solid var(--accent)';
    bgStyle = 'background:rgba(212,160,23,0.07)';
  } else if (st === 'lost') {
    borderStyle = 'border:2px dashed var(--secondary)';
    bgStyle = 'background:rgba(46,134,171,0.05)';
  } else {
    borderStyle = 'border:1px solid var(--border)';
    bgStyle = 'background:var(--bg-card)';
  }

  const statusLabels = {
    pending: lang === 'th' ? 'รอผล' : 'Pending',
    won:     lang === 'th' ? 'ถูก'  : 'Won',
    lost:    lang === 'th' ? 'ผิด'  : 'Lost',
    approved: lang === 'th' ? 'ยืนยันแล้ว' : 'Approved',
  };
  const statusColors = {
    pending:  'var(--text-muted)',
    won:      'var(--accent)',
    lost:     'var(--secondary)',
    approved: 'var(--accent)',
  };

  let s = `<div style="padding:10px 12px;margin-bottom:8px;border-radius:var(--radius-lg);${borderStyle};${bgStyle}">`;

  // Header row
  s += `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">`;
  s += `<div style="display:flex;align-items:center;gap:8px">`;
  s += `<span style="font-size:0.9rem;font-weight:700;color:var(--primary)">${slip.player}</span>`;
  s += `<span style="font-size:0.72rem;color:var(--text-muted);background:var(--bg-input);padding:2px 7px;border-radius:4px">${isStep ? 'STEP' : 'SINGLE'}</span>`;
  s += `</div>`;
  s += `<span style="font-size:0.8rem;font-weight:700;color:${statusColors[st]}">${statusLabels[st] || st}</span>`;
  s += `</div>`;

  // Picks
  const picks = slip.picks || [];
  if (picks.length > 0) {
    s += `<div style="font-size:0.78rem;color:var(--text-muted);margin-bottom:6px;line-height:1.6">`;
    picks.forEach(p => {
      const match = MATCHES.find(m => m.id === p.match_id);
      if (!match) return;
      const isOu = p.type === 'ou';
      let pickLabel = '';
      if (isOu) {
        pickLabel = `${p.pick === 'over' ? (lang === 'th' ? 'สูง' : 'Over') : (lang === 'th' ? 'ต่ำ' : 'Under')} ${p.line || ''}`;
      } else {
        const picked = TEAMS[p.pick];
        const isHome = p.pick === match.team1;
        const ahLabel = p.line ? formatAhFav(p.line, isHome) : '';
        pickLabel = `${picked ? (lang === 'th' ? picked.nameTh : picked.name) : p.pick} ${ahLabel}`;
      }
      const badge = typeof getPickResultBadge === 'function' ? getPickResultBadge(p, match) : '';
      s += `<div>· ${pickLabel} <span class="odds-tag">@${p.odds}</span> ${badge}</div>`;
    });
    s += `</div>`;
  }

  // Footer: bet × odds → payout/result + approve button
  s += `<div style="display:flex;justify-content:space-between;align-items:center;padding-top:6px;border-top:1px solid var(--border)">`;
  s += `<span style="font-size:0.82rem;color:var(--text-muted)">${slip.bet}฿ × ${slip.combined_odds || '-'}`;
  if (st === 'won' || st === 'approved') {
    s += ` → <b style="color:var(--accent)">+${resolved.profit}฿</b>`;
  } else if (st === 'lost') {
    s += ` → <b style="color:var(--secondary)">-${slip.bet}฿</b>`;
  } else {
    s += ` → <b style="color:var(--accent)">${lang === 'th' ? 'จ่าย' : 'Payout'} ${slip.payout}฿</b>`;
  }
  s += `</span>`;
  if (needsApprove) {
    s += `<button class="slip-approve-btn" data-ts="${slip.timestamp}" style="background:var(--accent);color:#000;border:none;padding:4px 12px;border-radius:4px;font-size:0.78rem;font-weight:700;cursor:pointer">${lang === 'th' ? '✓ ยืนยัน' : '✓ Approve'}</button>`;
  }
  s += `</div></div>`;
  return s;
}
