// Betting — unified single + step (AH + O/U)
// 1 pick = single, 3+ picks = step/parlay

const TAB_ON    = 'padding:8px 14px;font-size:0.85rem;background:var(--primary);border:1px solid var(--primary);color:#fff;border-radius:var(--radius);font-weight:700;cursor:pointer';
const TAB_OFF   = 'padding:8px 14px;font-size:0.85rem;background:var(--bg-input);border:1px solid var(--border);color:var(--text-primary);border-radius:var(--radius);font-weight:700;cursor:pointer';
const SUBTAB_ON  = 'padding:6px 12px;font-size:0.8rem;background:var(--primary);border:1px solid var(--primary);color:#fff;border-radius:var(--radius);font-weight:700;cursor:pointer';
const SUBTAB_OFF = 'padding:6px 12px;font-size:0.8rem;background:var(--bg-input);border:1px solid var(--border);color:var(--text-primary);border-radius:var(--radius);font-weight:700;cursor:pointer';

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

  const byKickoff = (a, b) => new Date(a.date) - new Date(b.date);

  const available = MATCHES.filter(m => (state.ahLines[m.id] || state.ouLines[m.id]) && !isMatchLocked(m)).sort(byKickoff);
  const locked    = MATCHES.filter(m => (state.ahLines[m.id] || state.ouLines[m.id]) && isMatchLocked(m)).sort((a, b) => new Date(b.date) - new Date(a.date));

  const slipSource  = getAllSlips();
  const allFiltered = slipSource.filter(s => s.status !== 'cancelled').sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  const mySlips     = allFiltered.filter(s => s.player === state.currentPlayer);

  // ── Friends' pending slips ────────────────────────────────────────
  const pendingFriendSlips = slipSource.filter(s =>
    s.player !== state.currentPlayer &&
    s.status !== 'approved' &&
    s.status !== 'cancelled'
  ).sort((a, b) => {
    const aResolved = typeof resolveSlip === 'function' && resolveSlip(a).status !== 'pending';
    const bResolved = typeof resolveSlip === 'function' && resolveSlip(b).status !== 'pending';
    if (aResolved !== bResolved) return aResolved ? -1 : 1;
    return new Date(b.timestamp) - new Date(a.timestamp);
  });

  const friendPlayers = [...new Set(pendingFriendSlips.map(s => s.player))];

  const tabOn = TAB_ON, tabOff = TAB_OFF;

  // ── Admin view: house dashboard + friend slips + ราคาบอล tab ───────
  if (state.isAdmin) {
    let html = '';
    html += `<div class="user-bar"><span class="user-name">${getDisplayName(state.currentPlayer)}</span><button class="logout-btn" id="bet-logout">${t('logout')}</button></div>`;
    html += renderHouseDashboard();

    // ── Slips: split into ready-to-approve vs still-pending ──
    const allSlipsAll = getAllSlips();
    const readySlips   = pendingFriendSlips.filter(s => { const r = resolveSlip(s); return r.status === 'won' || r.status === 'lost'; });
    const waitingSlips = pendingFriendSlips.filter(s => resolveSlip(s).status === 'pending');

    // Section A: พร้อมยืนยัน — bulk buttons + slip cards
    html += `<div style="margin:16px 0 8px;font-size:0.85rem;color:var(--text-muted);font-weight:700">${lang === 'th' ? 'พร้อมยืนยัน' : 'Ready to Approve'} (${readySlips.length})</div>`;
    if (!readySlips.length) {
      html += `<div style="color:var(--text-muted);text-align:center;padding:16px">${lang === 'th' ? 'ยังไม่มีสลิปที่รู้ผล' : 'No resolved slips yet'}</div>`;
    } else {
      // Bulk approve buttons grouped by match
      const scoredMatches = MATCHES.filter(m => {
        const r = state.matches[m.id];
        return r && typeof r.team1_score === 'number' && typeof r.team2_score === 'number';
      });
      if (scoredMatches.length) {
        const btnStyle = 'background:var(--accent);color:#000;border:none;padding:5px 12px;border-radius:var(--radius);font-size:0.8rem;font-weight:700;cursor:pointer';
        html += `<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px">`;
        scoredMatches.forEach(m => {
          [m.team1, m.team2].forEach(code => {
            const info = TEAMS[code];
            const count = allSlipsAll.filter(s =>
              s.status !== 'approved' && s.status !== 'cancelled' &&
              (resolveSlip(s).status === 'won' || resolveSlip(s).status === 'lost') &&
              s.picks.some(p => p.type === 'ah' && p.pick === code)
            ).length;
            if (!count) return;
            const name = info ? (lang === 'th' ? info.nameTh : info.name) : code;
            const flag = info ? info.flag : '';
            html += `<button class="bulk-approve-btn" data-team="${code}" style="${btnStyle}">${flag} ${name} ✓ ทั้งหมด (${count})</button>`;
          });
        });
        html += `</div>`;
      }
      // Individual slip cards
      readySlips.forEach(s => { html += renderSlipCard(s, { showPlayer: true }); });
    }

    // Section B: รอผล — slips still pending
    if (waitingSlips.length) {
      html += `<div style="margin:16px 0 8px;font-size:0.85rem;color:var(--text-muted);font-weight:700">${lang === 'th' ? 'รอผลบอล' : 'Awaiting Results'} (${waitingSlips.length})</div>`;
      waitingSlips.forEach(s => { html += renderSlipCard(s, { showPlayer: true }); });
    }

    container.innerHTML = html;
    container.querySelector('#bet-logout')?.addEventListener('click', () => {
      state.currentPlayer = null;
      sessionStorage.removeItem('wc2026_player');
      sessionStorage.removeItem('wc2026_pin');
      renderBetting();
    });
    container.querySelectorAll('.slip-approve-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const ts = btn.dataset.ts;
        const result = await approveSlip(ts);
        if (result && result.success) {
          const allSlips = getAllSlips();
          const slip = allSlips.find(s => String(s.timestamp) === String(ts));
          if (slip) slip.status = 'approved';
          updateTabBadges();
          showToast(lang === 'th' ? 'ยืนยันแล้ว' : 'Approved');
          renderBetting();
        } else {
          showToast('Error');
        }
      });
    });
    container.querySelectorAll('.bulk-approve-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const teamCode = btn.dataset.team;
        const toApprove = getAllSlips().filter(s =>
          s.status !== 'approved' && s.status !== 'cancelled' &&
          (resolveSlip(s).status === 'won' || resolveSlip(s).status === 'lost') &&
          s.picks.some(p => p.type === 'ah' && p.pick === teamCode)
        );
        if (!toApprove.length) return;
        showLoading();
        for (const s of toApprove) { await approveSlip(s.timestamp); }
        await refreshData();
        hideLoading();
        showToast(lang === 'th' ? `ยืนยัน ${toApprove.length} สลิปแล้ว` : `Approved ${toApprove.length} slips`);
        renderBetting();
      });
    });
    return;
  }

  let html = '';

  // User bar
  html += `<div class="user-bar">`;
  html += `<span class="user-name">${getDisplayName(state.currentPlayer)}</span>`;
  html += `<button class="logout-btn" id="bet-logout">${t('logout')}</button>`;
  html += `</div>`;

  // Top tabs: แทงบอล | สลิปเพื่อน (N)
  html += `<div style="display:flex;gap:8px;margin-bottom:16px">`;
  html += `<button class="bet-main-tab" data-main="bet" style="${tabOn}">${lang === 'th' ? 'แทงบอล' : 'Betting'}</button>`;
  html += `<button class="bet-main-tab" data-main="friends" style="${tabOff}">${lang === 'th' ? 'สลิปเพื่อน' : 'Friends'}${pendingFriendSlips.length ? ` (${pendingFriendSlips.length})` : ''}</button>`;
  html += `</div>`;

  // ── Tab: แทงบอล ──────────────────────────────────────────────────
  html += `<div id="bet-main-bet">`;
  html += `<h2 style="font-size:1.1rem;margin-bottom:12px">${lang === 'th' ? 'แทงบอล' : 'Place Bets'}</h2>`;

  const todayLocked = locked.filter(m => getTodayMatches().some(t => t.id === m.id));
  const todayAll = [...available, ...todayLocked].sort((a, b) => etToThai(a.date) - etToThai(b.date));
  if (todayAll.length === 0) {
    html += `<div style="color:var(--text-muted);text-align:center;padding:20px">${lang === 'th' ? 'ยังไม่มีคู่ที่เปิดรับแทง' : 'No open matches with lines'}</div>`;
  } else {
    const chipStyle = 'font-size:0.82rem;font-weight:700;background:var(--secondary);color:#fff;border:none;padding:5px 12px;border-radius:var(--radius);cursor:pointer';
    if (available.length) html += `<div style="margin-bottom:12px"><div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap"><button id="bet-rules-toggle" style="font-size:0.8rem;color:var(--text-muted);background:none;border:none;cursor:pointer;padding:0;text-decoration:underline">${lang === 'th' ? 'กติกา ▸' : 'Rules ▸'}</button><button class="bet-random-chip" data-count="4" style="${chipStyle}">🎲 4</button><button class="bet-random-chip" data-count="6" style="${chipStyle}">🎲 6</button><button class="bet-random-chip" data-count="8" style="${chipStyle}">🎲 8</button><button class="bet-random-chip" data-count="all" style="${chipStyle}">🎲 ทั้งหมด</button></div><p id="bet-rules-text" style="display:none;font-size:0.85rem;color:var(--text-muted);margin:6px 0 0">${lang === 'th' ? 'กดเลือก กดอีกที=ยกเลิก<br>1 pick = single<br>2 คู่ = 4 picks (AH+O/U ทั้งคู่)<br>3 คู่+ = step (pick ละคู่ก็ได้)' : 'Tap to select, tap again to deselect<br>1 pick = single<br>2 matches = 4 picks (AH+O/U both)<br>3+ matches = step (1 pick/match ok)'}</p></div>`;
    todayAll.forEach(m => {
      if (isMatchLocked(m)) { html += renderBettingCardLocked(m); }
      else { html += renderBettingCard(m); }
    });
    if (available.length) {
      html += `<div style="margin-top:12px;padding:12px;background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius-lg)">`;
      html += `<div id="bet-summary" style="font-size:0.85rem;color:var(--text-muted)">${lang === 'th' ? 'เลือก' : 'Picks'}: 0</div>`;
      html += `<div style="margin-top:8px;display:flex;align-items:center;gap:8px">`;
      html += `<label style="font-size:0.85rem">${lang === 'th' ? 'จำนวนเงิน' : 'Amount'}</label>`;
      html += `<input type="number" id="bet-amount" min="50" step="10" value="50" style="width:100px;padding:6px 8px;background:var(--bg-input);border:1px solid var(--border);border-radius:var(--radius);color:var(--text-primary);font-size:0.9rem;text-align:right">`;
      html += `<span style="color:var(--accent)">฿</span>`;
      html += `</div>`;
      html += `<div id="bet-odds-display" style="margin-top:8px;font-size:0.85rem;color:var(--text-muted)">${lang === 'th' ? 'ราคารวม' : 'Odds'}: -</div>`;
      html += `<div id="bet-payout-display" style="margin-top:4px;font-size:1rem;font-weight:700;color:var(--accent)">${lang === 'th' ? 'จ่าย' : 'Payout'}: -</div>`;
      html += `<button class="btn btn-primary" id="bet-save-btn" style="margin-top:10px" disabled>${lang === 'th' ? 'ลงเงิน' : 'Place Bet'}</button>`;
      html += `</div>`;
      html += `<div style="height:20px"></div>`;
    }
  }

  // My slips — subtabs: รอผล / ประวัติ
  html += `<div id="slip-list">`;
  html += `<h3 style="font-size:0.95rem;color:var(--primary);margin:20px 0 8px">${lang === 'th' ? 'สลิปของฉัน' : 'My Slips'}</h3>`;
  if (mySlips.length === 0) {
    html += `<div style="color:var(--text-muted);font-size:0.85rem;padding:8px 0">${lang === 'th' ? 'ยังไม่มีสลิป' : 'No slips yet'}</div>`;
  } else {
    const totalBet = mySlips.reduce((s, sl) => s + (sl.bet || 0), 0);
    const myResolved = mySlips.map(s => ({ slip: s, st: (typeof resolveSlip === 'function' ? resolveSlip(s) : { status: s.status, profit: 0 }) }));
    const nWon  = myResolved.filter(({st}) => st.status === 'won' || st.status === 'approved').length;
    const nLost = myResolved.filter(({st}) => st.status === 'lost').length;
    const nPend = myResolved.filter(({st}) => st.status === 'pending').length;
    const pendPayout = myResolved.filter(({st}) => st.status === 'pending').reduce((s, {slip}) => s + (slip.payout || 0), 0);
    html += `<div style="display:flex;flex-wrap:wrap;gap:12px;padding:10px 12px;background:var(--bg-input);border-radius:var(--radius);margin-bottom:12px;font-size:0.82rem">`;
    html += `<span style="color:var(--text-muted)">${lang === 'th' ? 'ลงไป' : 'Bet'} <b style="color:var(--text-primary)">${totalBet}฿</b></span>`;
    html += `<span style="color:var(--text-muted)">${lang === 'th' ? 'ถูก' : 'Won'} <b style="color:var(--accent)">${nWon}</b> · ${lang === 'th' ? 'ผิด' : 'Lost'} <b style="color:var(--wrong)">${nLost}</b> · ${lang === 'th' ? 'รอ' : 'Pend'} <b>${nPend}</b></span>`;
    if (pendPayout > 0) html += `<span style="color:var(--text-muted)">${lang === 'th' ? 'รอรับ' : 'Pend payout'} <b style="color:var(--accent)">${pendPayout}฿</b></span>`;
    html += `</div>`;

    const myTabOn = SUBTAB_ON, myTabOff = SUBTAB_OFF;
    const myPending = mySlips.filter((s, i) => myResolved[i].st.status === 'pending');
    const myHistory = mySlips.filter((s, i) => myResolved[i].st.status !== 'pending');
    const myDefaultTab = myPending.length > 0 ? 'mypend' : 'myhist';

    html += `<div style="display:flex;gap:6px;margin-bottom:12px">`;
    html += `<button class="my-tab-btn" data-mytab="mypend" style="${myDefaultTab === 'mypend' ? myTabOn : myTabOff}">${lang === 'th' ? 'รอผล' : 'Pending'} (${myPending.length})</button>`;
    html += `<button class="my-tab-btn" data-mytab="myhist" style="${myDefaultTab === 'myhist' ? myTabOn : myTabOff}">${lang === 'th' ? 'ประวัติ' : 'History'} (${myHistory.length})</button>`;
    html += `</div>`;

    html += `<div class="my-tab-pane" data-mytab="mypend" style="${myDefaultTab === 'mypend' ? '' : 'display:none'}">`;
    if (myPending.length === 0) {
      html += `<div style="color:var(--text-muted);font-size:0.85rem;padding:8px 0">${lang === 'th' ? 'ไม่มีสลิปรอผล' : 'No pending slips'}</div>`;
    } else {
      myPending.forEach((slip, idx) => { html += renderSlip(slip, idx); });
    }
    html += `</div>`;

    html += `<div class="my-tab-pane" data-mytab="myhist" style="${myDefaultTab === 'myhist' ? '' : 'display:none'}">`;
    if (myHistory.length === 0) {
      html += `<div style="color:var(--text-muted);font-size:0.85rem;padding:8px 0">${lang === 'th' ? 'ยังไม่มีประวัติ' : 'No history yet'}</div>`;
    } else {
      myHistory.forEach((slip, idx) => { html += renderSlip(slip, myPending.length + idx); });
    }
    html += `</div>`;
  }

  html += `</div>`; // slip-list
  html += `</div>`; // bet-main-bet

  // ── Tab: สลิปเพื่อน (nested player sub-tabs) ─────────────────────
  html += `<div id="bet-main-friends" style="display:none">`;
  if (!pendingFriendSlips.length) {
    html += `<div style="color:var(--text-muted);text-align:center;padding:40px">${lang === 'th' ? 'ยังไม่มีสลิปเพื่อน' : "No friends' slips yet"}</div>`;
  } else {
    const stOn = SUBTAB_ON, stOff = SUBTAB_OFF;
    html += `<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px">`;
    html += `<button class="fplayer-tab" data-fp="all" style="${stOn}">${lang === 'th' ? 'ทั้งหมด' : 'All'} (${pendingFriendSlips.length})</button>`;
    friendPlayers.forEach(p => {
      const n = pendingFriendSlips.filter(s => s.player === p).length;
      html += `<button class="fplayer-tab" data-fp="${p}" style="${stOff}">${getDisplayName(p)} (${n})</button>`;
    });
    html += `</div>`;
    html += `<div class="fplayer-pane" data-fp="all">`;
    pendingFriendSlips.forEach(s => { html += renderSlipCard(s, { showPlayer: true, showCopy: true }); });
    html += `</div>`;
    friendPlayers.forEach(p => {
      html += `<div class="fplayer-pane" data-fp="${p}" style="display:none">`;
      pendingFriendSlips.filter(s => s.player === p).forEach(s => { html += renderSlipCard(s, { showPlayer: true, showCopy: true }); });
      html += `</div>`;
    });
  }
  html += `</div>`; // bet-main-friends

  container.innerHTML = html;

  // Rules toggle
  container.querySelector('#bet-rules-toggle')?.addEventListener('click', () => {
    const txt = container.querySelector('#bet-rules-text');
    const btn = container.querySelector('#bet-rules-toggle');
    const open = txt.style.display === 'none';
    txt.style.display = open ? '' : 'none';
    btn.textContent = open ? (currentLang === 'th' ? 'กติกา ▾' : 'Rules ▾') : (currentLang === 'th' ? 'กติกา ▸' : 'Rules ▸');
  });

  // Random pick chips — สุ่ม N picks จาก slot pool (AH slot + O/U slot ต่อคู่)
  container.querySelectorAll('.bet-random-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const countRaw = chip.dataset.count;
      const matchIds = [...new Set(
        [...container.querySelectorAll('.bet-pick:not([disabled])')].map(b => b.dataset.match)
      )].filter(Boolean);
      const slots = [];
      matchIds.forEach(id => {
        const ahBtns = [...container.querySelectorAll(`.ah-btn.bet-pick:not(.ou-btn)[data-match="${id}"]`)];
        const ouBtns = [...container.querySelectorAll(`.ou-btn.bet-pick[data-match="${id}"]`)];
        if (ahBtns.length) slots.push(ahBtns);
        if (ouBtns.length) slots.push(ouBtns);
      });
      slots.sort(() => Math.random() - 0.5);
      const n = countRaw === 'all' ? slots.length : Math.min(parseInt(countRaw), slots.length);
      [...container.querySelectorAll('.bet-pick.selected')].forEach(btn => btn.click());
      slots.slice(0, n).forEach(btns => {
        btns[Math.floor(Math.random() * btns.length)].click();
      });
    });
  });

  // Copy friend slip → pre-fill bet picks
  container.querySelectorAll('.slip-copy-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const ts = btn.dataset.ts;
      const allSlips = getAllSlips();
      const slip = allSlips.find(s => String(s.timestamp) === String(ts));
      if (!slip) return;

      const validPicks = (slip.picks || []).filter(p => {
        const m = (state.matchById && state.matchById[p.match_id]) || MATCHES.find(x => x.id === p.match_id);
        return m && !isMatchLocked(m);
      });

      if (!validPicks.length) {
        showToast(currentLang === 'th' ? 'ทุก match ล็อคแล้ว copy ไม่ได้' : 'All matches locked');
        return;
      }

      // Switch to แทงบอล tab
      container.querySelectorAll('.bet-main-tab').forEach(b => {
        b.style.cssText = b.dataset.main === 'bet' ? tabOn : tabOff;
      });
      container.querySelector('#bet-main-bet').style.display     = '';
      container.querySelector('#bet-main-friends').style.display = 'none';

      // Click matching bet-pick buttons to select them
      validPicks.forEach(p => {
        const isOu = p.type === 'ou';
        const sel = isOu
          ? `.bet-pick.ou-btn[data-match="${p.match_id}"][data-pick="${p.pick}"]`
          : `.bet-pick:not(.ou-btn)[data-match="${p.match_id}"][data-pick="${p.pick}"]`;
        const pickBtn = container.querySelector(sel);
        if (pickBtn && !pickBtn.classList.contains('selected')) pickBtn.click();
      });

      showToast(currentLang === 'th' ? `Copy ${validPicks.length} picks แล้ว` : `Copied ${validPicks.length} picks`);
      container.querySelector('#bet-main-bet')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  // Follow bet (แทงตามเลย)
  container.querySelectorAll('.slip-follow-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const ts = btn.dataset.ts;
      const allSlips = getAllSlips();
      const slip = allSlips.find(s => String(s.timestamp) === String(ts));
      if (!slip) return;

      const validPicks = (slip.picks || []).filter(p => {
        const m = (state.matchById && state.matchById[p.match_id]) || MATCHES.find(x => x.id === p.match_id);
        return m && !isMatchLocked(m);
      });

      if (!validPicks.length) {
        showToast(currentLang === 'th' ? 'ทุก match ล็อคแล้ว' : 'All matches locked');
        return;
      }

      const pickSummary = validPicks.map(p => {
        const m = (state.matchById && state.matchById[p.match_id]) || MATCHES.find(x => x.id === p.match_id);
        const t1 = TEAMS[m?.team1], t2 = TEAMS[m?.team2];
        const name1 = t1 ? (currentLang === 'th' ? t1.nameTh : t1.name) : m?.team1;
        const name2 = t2 ? (currentLang === 'th' ? t2.nameTh : t2.name) : m?.team2;
        const isOu = p.type === 'ou';
        const pickName = isOu
          ? (p.pick === 'over' ? 'สูง' : 'ต่ำ') + ' ' + (p.line || '')
          : (TEAMS[p.pick] ? (currentLang === 'th' ? TEAMS[p.pick].nameTh : TEAMS[p.pick].name) : p.pick);
        return `${name1}-${name2}: ${pickName} @${p.odds}`;
      }).join('\n');

      const msg = `แทงตาม ${getDisplayName(slip.player)}\n${pickSummary}\nจำนวน: ${slip.bet}฿\n\nยืนยัน?`;
      if (!window.confirm(msg)) return;

      const combinedOdds = validPicks.reduce((a, p) => a * p.odds, 1);
      const newSlip = {
        bet: slip.bet,
        combined_odds: Math.round(combinedOdds * 1000) / 1000,
        payout: Math.round(slip.bet * combinedOdds),
        picks: validPicks.map(p => ({
          match_id: p.match_id,
          pick: p.pick,
          odds: p.odds,
          type: p.type,
          line: p.line,
        })),
      };

      btn.disabled = true;
      btn.textContent = '...';
      const result = await submitSlip(newSlip);
      if (result && result.success) {
        showToast(currentLang === 'th' ? 'แทงตามแล้ว!' : 'Bet placed!');
        renderBetting();
      } else {
        showToast(currentLang === 'th' ? 'เกิดข้อผิดพลาด' : 'Error');
        btn.disabled = false;
        btn.textContent = 'แทงตาม';
      }
    });
  });

  // Top tab switching (แทงบอล / สลิปเพื่อน / ภาพรวม)
  container.querySelectorAll('.bet-main-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      const key = btn.dataset.main;
      container.querySelectorAll('.bet-main-tab').forEach(b => { b.style.cssText = b.dataset.main === key ? tabOn : tabOff; });
      container.querySelector('#bet-main-bet').style.display     = key === 'bet'     ? '' : 'none';
      container.querySelector('#bet-main-friends').style.display = key === 'friends' ? '' : 'none';
    });
  });

  // Nested player sub-tabs
  container.querySelectorAll('.fplayer-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      const key = btn.dataset.fp;
      container.querySelectorAll('.fplayer-tab').forEach(b => { b.style.cssText = b.dataset.fp === key ? SUBTAB_ON : SUBTAB_OFF; });
      container.querySelectorAll('.fplayer-pane').forEach(p => { p.style.display = p.dataset.fp === key ? '' : 'none'; });
    });
  });

  // My slips subtab switching
  container.querySelectorAll('.my-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const key = btn.dataset.mytab;
      container.querySelectorAll('.my-tab-btn').forEach(b => { b.style.cssText = b.dataset.mytab === key ? SUBTAB_ON : SUBTAB_OFF; });
      container.querySelectorAll('.my-tab-pane').forEach(p => { p.style.display = p.dataset.mytab === key ? '' : 'none'; });
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
        const allSlips = getAllSlips();
        const slip = allSlips.find(s => String(s.timestamp) === String(ts));
        if (slip) slip.status = 'approved';
        updateTabBadges();
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
  html += `<span style="font-size:0.75rem">${t1.flag} ${t1Name} vs ${t2.flag} ${t2Name}</span>`;
  html += `<span style="font-size:0.8rem;font-weight:700;color:var(--text-muted)">${scoreLabel}</span>`;
  html += `</div>`;

  if (ahLine) {
    const ahH = formatAhFav(ahLine, true);
    const ahA = formatAhFav(ahLine, false);
    html += `<div style="display:flex;align-items:center;gap:4px;margin-bottom:6px">`;
    html += `<span style="background:var(--secondary);color:#fff;padding:2px 8px;border-radius:4px;font-size:0.75rem;font-weight:700;white-space:nowrap">AH</span>`;
    html += `<button ${btnStyle(ahWinSide === 'team1')} class="ah-btn">${t1Name} <span style="font-weight:700">${ahH}</span> <span class="odds-tag">@${ahOddsH}</span></button>`;
    html += `<button ${btnStyle(ahWinSide === 'team2')} class="ah-btn">${t2Name} <span style="font-weight:700">${ahA}</span> <span class="odds-tag">@${ahOddsA}</span></button>`;
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
  html += `<span style="font-size:0.75rem">${t1.flag} ${t1Name} vs ${t2.flag} ${t2Name}</span>`;
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
  return renderSlipCard(slip, { idx, showPlayer: state.isAdmin, showDelete: true, showDetails: true });
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

function renderSlipCard(slip, opts) {
  opts = opts || {};
  const lang        = currentLang;
  const showPlayer  = !!opts.showPlayer;
  const showDelete  = !!opts.showDelete;
  const showDetails = !!opts.showDetails;

  const resolved     = typeof resolveSlip === 'function' ? resolveSlip(slip) : { status: slip.status, profit: 0 };
  const st           = resolved.status;
  const picks        = slip.picks || [];
  const isStep       = picks.length >= 3;
  const isApproved   = slip.status === 'approved';
  const needsApprove = state.isAdmin && (st === 'won' || st === 'lost') && slip.status !== 'approved' && slip.status !== 'cancelled';

  const statusColors = { pending: 'var(--secondary)', won: 'var(--accent)', lost: 'var(--secondary)', approved: 'var(--accent)' };
  const statusLabels = { pending: lang === 'th' ? 'รอผล' : 'Pending', won: lang === 'th' ? 'ถูก' : 'Won', lost: lang === 'th' ? 'ผิด' : 'Lost', approved: lang === 'th' ? 'ยืนยันแล้ว' : 'Approved' };

  let cardStyle = 'border:1px solid var(--border);background:var(--bg-card)';
  if      (st === 'lost')              cardStyle = 'border:3px solid var(--secondary);box-shadow:0 0 0 3px rgba(46,134,171,0.20);background:rgba(46,134,171,0.10)';
  else if (st === 'won' || isApproved) cardStyle = 'border:3px solid var(--accent);box-shadow:0 0 0 3px rgba(240,201,41,0.25);background:rgba(240,201,41,0.10)';

  let html = `<div class="card" style="padding:10px;margin-bottom:8px;${cardStyle}">`;

  // Header
  html += `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">`;
  html += `<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">`;
  if (showPlayer) html += `<span style="font-size:0.88rem;font-weight:700;color:var(--primary)">${getDisplayName(slip.player)}</span>`;
  if (opts.idx != null) html += `<span style="font-size:0.75rem;color:var(--text-muted)">#${opts.idx + 1} · ${new Date(slip.timestamp).toLocaleDateString('th-TH')}</span>`;
  html += `<span style="font-size:0.72rem;color:var(--text-muted);background:var(--bg-input);padding:2px 7px;border-radius:4px">${isStep ? 'STEP' : 'SINGLE'}</span>`;
  html += `</div>`;
  html += `<div style="display:flex;align-items:center;gap:8px">`;
  if (showDelete) {
    const ownPending = slip.player === state.currentPlayer && slip.status === 'pending';
    const noLocked   = !picks.some(p => { const m = (state.matchById && state.matchById[p.match_id]) || MATCHES.find(x => x.id === p.match_id); return m && isMatchLocked(m); });
    if (ownPending && (state.isAdmin || noLocked)) {
      html += `<button class="slip-delete-btn" data-ts="${slip.timestamp}" style="background:var(--wrong);border:none;color:#fff;padding:5px 14px;border-radius:6px;font-size:0.85rem;font-weight:700;cursor:pointer">🗑 ${lang === 'th' ? 'ลบสลิป' : 'Delete'}</button>`;
    }
  }
  if (opts.showCopy) {
    html += `<button class="slip-copy-btn" data-ts="${slip.timestamp}" style="background:var(--secondary);border:none;color:#fff;padding:5px 12px;border-radius:6px;font-size:0.82rem;font-weight:700;cursor:pointer">Copy</button>`;
    html += `<button class="slip-follow-btn" data-ts="${slip.timestamp}" style="background:var(--accent);border:none;color:#000;padding:5px 12px;border-radius:6px;font-size:0.82rem;font-weight:700;cursor:pointer">แทงตาม</button>`;
  }
  if (needsApprove) {
    html += `<button class="slip-approve-btn" data-ts="${slip.timestamp}" style="background:var(--accent);color:#000;border:none;padding:4px 12px;border-radius:4px;font-size:0.78rem;font-weight:700;cursor:pointer">${lang === 'th' ? '✓ ยืนยัน' : '✓ Approve'}</button>`;
  }
  if (isApproved) {
    html += `<span style="background:var(--secondary);color:#fff;padding:2px 8px;border-radius:4px;font-size:0.75rem;font-weight:700">✓ ${lang === 'th' ? 'ยืนยันแล้ว' : 'Approved'}</span>`;
  }
  html += `<span style="font-size:0.8rem;font-weight:700;color:${statusColors[st]}">${statusLabels[st]}</span>`;
  html += `</div></div>`;

  // Picks
  html += `<div style="margin-bottom:6px">`;
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
      pickLabel = `${match.team1}-${match.team2} ${p.pick === 'over' ? (lang === 'th' ? 'สูง' : 'Over') : (lang === 'th' ? 'ต่ำ' : 'Under')} ${lineLabel}`;
    } else {
      const picked = TEAMS[p.pick];
      const lineLabel = p.line || state.ahLines[match.id] || '';
      const isHome = p.pick === match.team1;
      pickLabel = `${picked ? (lang === 'th' ? picked.nameTh : picked.name) : p.pick} ${lineLabel ? formatAhFav(lineLabel, isHome) : ''}`;
    }

    const badge = typeof getPickResultBadge === 'function' ? getPickResultBadge(p, match) : '';

    if (showDetails) {
      const pickOutcome = typeof getPickOutcome === 'function' ? getPickOutcome(p, state.matches[match.id]) : null;
      let pickBg = '';
      if      (pickOutcome === 'full')                               pickBg = 'background:rgba(212,160,23,0.12);border-left:3px solid var(--accent);border-radius:4px;padding:4px 6px;margin:2px 0;';
      else if (pickOutcome === 'half')                               pickBg = 'background:rgba(212,160,23,0.06);border-left:3px solid var(--accent);border-radius:4px;padding:4px 6px;margin:2px 0;';
      else if (pickOutcome === 'loss' || pickOutcome === 'half_loss') pickBg = 'background:rgba(46,134,171,0.10);border-left:3px solid var(--secondary);border-radius:4px;padding:4px 6px;margin:2px 0;';
      else if (pickOutcome === 'push')                               pickBg = 'border-left:3px solid var(--text-muted);border-radius:4px;padding:4px 6px;margin:2px 0;';
      const result = state.matches[match.id];
      const hasResult = result && typeof result.team1_score === 'number' && typeof result.team2_score === 'number';
      const scoreStr = hasResult ? ` <span style="font-weight:700">${result.team1_score}-${result.team2_score}</span>` : '';
      html += `<div style="font-size:0.8rem;display:flex;justify-content:space-between;align-items:center;${pickBg}">`;
      html += `<span>· ${pickLabel} ${p.odds ? '<span class="odds-tag">@' + p.odds + '</span>' : ''} ${badge}</span>`;
      html += `<span style="color:var(--text-muted)">${t1Name} vs ${t2Name}${scoreStr}</span>`;
      html += `</div>`;
    } else {
      html += `<div style="font-size:0.78rem;color:var(--text-muted);line-height:1.5">· ${pickLabel} <span class="odds-tag">@${p.odds}</span> ${badge}</div>`;
    }
  });
  html += `</div>`;

  // Footer
  const displayOdds = slip.combined_odds || slip.odds || (picks.length ? picks.reduce((a, p) => a * (p.odds || 1), 1).toFixed(3) : '-');
  html += `<div style="padding-top:6px;border-top:1px solid var(--border);display:flex;justify-content:space-between;align-items:center;font-size:0.85rem">`;
  html += `<span style="color:var(--text-muted)">${slip.bet}฿ × ${displayOdds}`;
  if (st === 'won' || isApproved) html += ` → <b style="color:var(--accent)">+${resolved.profit}฿</b>`;
  else if (st === 'lost')          html += ` → <b style="color:var(--secondary)">-${slip.bet}฿</b>`;
  else                             html += ` → <b style="color:var(--accent)">${lang === 'th' ? 'จ่าย' : 'Payout'} ${slip.payout}฿</b>`;
  html += `</span></div>`;

  html += `</div>`;
  return html;
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
