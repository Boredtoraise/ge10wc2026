// Google Apps Script API wrapper
const API_BASE_URL = 'https://script.google.com/macros/s/AKfycbypN7DNZoHY2q2WNjHviVqn67LHjJ9a7GYcpBwg6l9ez83hN8Z1B5BUtkXIoopJXH_Udg/exec';

async function fetchAPI(params) {
  if (!API_BASE_URL) return null;
  try {
    const res = await fetch(API_BASE_URL + '?action=' + params + '&t=' + Date.now());
    if (!res.ok) throw new Error('API error: ' + res.status);
    return await res.json();
  } catch (e) {
    console.error('fetchAPI error:', e);
    return null;
  }
}

async function loginPlayer(playerId, pin) {
  if (!API_BASE_URL) {
    state.currentPlayer = playerId;
    localStorage.setItem('wc2026_player', playerId);
    localStorage.setItem('wc2026_pin', pin);
    return { success: true };
  }
  try {
    const res = await fetch(API_BASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ action: 'login', player: playerId, pin: pin }),
    });
    const result = await res.json();
    if (result.success) {
      state.currentPlayer = playerId;
      state.isAdmin = result.is_admin || false;
      localStorage.setItem('wc2026_player', playerId);
      localStorage.setItem('wc2026_pin', pin);
      localStorage.setItem('wc2026_admin', state.isAdmin ? 'true' : 'false');
    }
    return result;
  } catch (e) {
    return { success: false, error: e.message };
  }
}


async function submitSlip(slip) {
  if (!API_BASE_URL) {
    const ticket = {
      timestamp: new Date().toISOString(),
      player: state.currentPlayer,
      bet: slip.bet,
      combined_odds: slip.combined_odds,
      payout: slip.payout,
      picks: slip.picks,
      status: 'pending',
    };
    state.slips.push(ticket);
    return { success: true };
  }
  try {
    const res = await fetch(API_BASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({
        action: 'submit_slip',
        player: state.currentPlayer,
        pin: localStorage.getItem('wc2026_pin'),
        slip: slip,
      }),
    });
    if (!res.ok) throw new Error('Submit slip error: ' + res.status);
    const result = await res.json();
    if (result.success) {
      // Optimistic update: add slip locally instead of re-fetching
      const newSlip = typeof parsePicks === 'function'
        ? parsePicks({ timestamp: result.timestamp || Date.now(), player: state.currentPlayer, bet: slip.bet, combined_odds: slip.combined_odds, payout: slip.payout, picks_json: JSON.stringify(slip.picks), picks: slip.picks, status: 'pending' })
        : { timestamp: result.timestamp || Date.now(), player: state.currentPlayer, bet: slip.bet, combined_odds: slip.combined_odds, payout: slip.payout, picks: slip.picks, status: 'pending' };
      state.slips.unshift(newSlip);
      if (state.allSlips.length) state.allSlips.unshift(newSlip);
    }
    return result;
  } catch (e) {
    console.error('submitSlip error:', e);
    return { success: false, error: e.message };
  }
}

async function cancelSlip(slipTimestamp) {
  if (!API_BASE_URL) {
    state.slips = state.slips.filter(s => s.timestamp !== slipTimestamp);
    return { success: true };
  }
  try {
    const res = await fetch(API_BASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({
        action: 'cancel_slip',
        player: state.currentPlayer,
        pin: localStorage.getItem('wc2026_pin'),
        slip_id: slipTimestamp,
      }),
    });
    const result = await res.json();
    if (result.success) {
      state.slips = state.slips.filter(s => s.timestamp !== slipTimestamp);
    }
    return result;
  } catch (e) {
    console.error('cancelSlip error:', e);
    return { success: false, error: e.message };
  }
}

async function approveSlip(slipTimestamp) {
  try {
    const res = await fetch(API_BASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({
        action: 'approve_slip',
        player: state.currentPlayer,
        pin: localStorage.getItem('wc2026_pin'),
        slip_id: slipTimestamp,
      }),
    });
    return await res.json();
  } catch (e) {
    return { success: false, error: e.message };
  }
}

async function updateLines(updates) {
  try {
    const res = await fetch(API_BASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({
        action: 'update_lines',
        player: state.currentPlayer,
        pin: localStorage.getItem('wc2026_pin'),
        updates: updates,
      }),
    });
    return await res.json();
  } catch (e) {
    return { success: false, error: e.message };
  }
}

async function updateScores(updates) {
  try {
    const res = await fetch(API_BASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({
        action: 'update_scores',
        player: state.currentPlayer,
        pin: localStorage.getItem('wc2026_pin'),
        updates: updates,
      }),
    });
    return await res.json();
  } catch (e) {
    return { success: false, error: e.message };
  }
}
