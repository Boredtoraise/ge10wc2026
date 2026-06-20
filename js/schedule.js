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
    // Round cutoff: 14:00 Thai time (local). If before 14:00 today, use yesterday 14:00.
    const cutoff = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 14, 0, 0);
    if (now < cutoff) cutoff.setDate(cutoff.getDate() - 1);
    const hasOdds = m => !!(state.ahLines[m.id] || state.ouLines[m.id]);

    const allSorted = [...MATCHES].sort((a, b) => new Date(a.date) - new Date(b.date));
    const cutoffEnd = new Date(cutoff.getTime() + 24 * 3600 * 1000);
    const allUpcoming = allSorted.filter(m => etToThai(m.date) >= cutoff);
    const past        = allSorted.filter(m => etToThai(m.date) < cutoff).reverse();

    const oddsSort = (a, b) => {
      if (hasOdds(a) && !hasOdds(b)) return -1;
      if (!hasOdds(a) && hasOdds(b)) return 1;
      return new Date(a.date) - new Date(b.date);
    };
    allUpcoming.sort(oddsSort);
    const todayOnly = allUpcoming.filter(m => etToThai(m.date) < cutoffEnd);

    const tabOn  = 'padding:6px 14px;font-size:0.82rem;background:var(--primary);border:1px solid var(--primary);color:#fff;border-radius:var(--radius);font-weight:700;cursor:pointer';
    const tabOff = 'padding:6px 14px;font-size:0.82rem;background:var(--bg-input);border:1px solid var(--border);color:var(--text-primary);border-radius:var(--radius);font-weight:700;cursor:pointer';

    let html = `<div style="display:flex;gap:8px;margin-bottom:12px">`;
    html += `<button class="sch-time-btn" data-time="today" style="${tabOn}">${lang === 'th' ? 'วันนี้' : 'Today'} (${todayOnly.length})</button>`;
    html += `<button class="sch-time-btn" data-time="upcoming" style="${tabOff}">${lang === 'th' ? 'ทั้งหมด' : 'All'} (${allUpcoming.length})</button>`;
    html += `<button class="sch-time-btn" data-time="past" style="${tabOff}">${lang === 'th' ? 'ผลบอล' : 'Results'} (${past.length})</button>`;
    html += `</div>`;

    html += `<div id="sch-today">`;
    todayOnly.forEach(m => { html += renderScheduleMatchCard(m); });
    if (!todayOnly.length) html += `<div style="text-align:center;padding:32px;color:var(--text-muted);font-size:0.85rem">${lang === 'th' ? 'ไม่มีแมตช์วันนี้' : 'No matches today'}</div>`;
    html += `</div>`;

    html += `<div id="sch-upcoming" style="display:none">`;
    allUpcoming.forEach(m => { html += renderScheduleMatchCard(m); });
    html += `</div>`;

    html += `<div id="sch-past" style="display:none">`;
    past.forEach(m => { html += renderScheduleMatchCard(m); });
    html += `</div>`;

    content.innerHTML = html;

    content.querySelectorAll('.sch-time-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const time = btn.dataset.time;
        content.querySelectorAll('.sch-time-btn').forEach(b => { b.style.cssText = b.dataset.time === time ? tabOn : tabOff; });
        content.querySelector('#sch-today').style.display    = time === 'today'    ? '' : 'none';
        content.querySelector('#sch-upcoming').style.display = time === 'upcoming' ? '' : 'none';
        content.querySelector('#sch-past').style.display     = time === 'past'     ? '' : 'none';
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

function renderPendingSlipCard(slip) {
  return renderSlipCard(slip, { showPlayer: true });
}
