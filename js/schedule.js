// Schedule — main tab (was overlay)

function renderSchedule() {
  const container = document.getElementById('view-schedule');
  if (!container) return;
  const lang = currentLang;

  const groups = Object.keys(GROUPS);

  let html = '<div style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:12px">';
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
    const sorted = [...MATCHES].sort((a, b) => new Date(a.date) - new Date(b.date));
    let html = '';
    sorted.forEach(m => { html += renderScheduleMatchCard(m); });
    content.innerHTML = html;
    return;
  }

  if (groupKey === 'KO') {
    renderKnockoutSchedule(content);
    return;
  }

  const teams = GROUPS[groupKey];
  const matches = MATCHES.filter(m => m.group === groupKey);

  let html = '';

  // Group table
  html += '<table class="group-table"><thead><tr>';
  html += '<th></th><th>' + (lang === 'th' ? 'ทีม' : 'Team') + '</th>';
  html += '<th>MP</th><th>W</th><th>D</th><th>L</th><th>GD</th><th>Pts</th>';
  html += '</tr></thead><tbody>';
  teams.forEach(code => {
    const team = TEAMS[code];
    html += `<tr><td>${team.flag}</td><td>${lang === 'th' ? team.nameTh : team.name}</td>`;
    html += '<td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td class="pts">0</td></tr>';
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
  const t1Label = t1 ? `${t1.flag} <span class="team-name">${lang === 'th' ? t1.nameTh : t1.name}</span>` : getTeamLabel(match.team1, lang);
  const t2Label = t2 ? `${t2.flag} <span class="team-name">${lang === 'th' ? t2.nameTh : t2.name}</span>` : getTeamLabel(match.team2, lang);

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
