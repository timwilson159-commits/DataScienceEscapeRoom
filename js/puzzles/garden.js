/* Station 7: Launch Pad. A projectile model: choose angle and power to deliver a payload, then use fair tests to find the rules.
   (The station id stays "garden" so the room layout and saved codes do not change.) */
ER.register({
  id: 'garden',
  title: 'Launch Pad',
  icon: '🚀',
  kind: 'game',
  tagline: 'Aim and fire payloads across planets, then test what really matters',
  code: { letter: 'X', number: 7 },
  fact: 'A fair test changes ONE variable at a time and keeps everything else the same, so you know what caused the result. Engineers fire thousands of simulated launches before a real rocket leaves the ground. This model leaves out air resistance, wind and fuel burning, and that is a limitation: real launches are messier.',
  hints: [
    'Angle Lab: pick a planet, then press L (or click the lock button) to LOCK the power so it stays identical. Only change the angle between shots with the up and down arrow keys: try 15, 30, 45, 60 and 75 degrees. Look for the angle with the longest range.',
    'Missions 2 to 6: if you land short, charge a bit longer next time. If you land long, release sooner. To clear a wall or asteroid, aim HIGHER (a bigger angle) and then adjust the power to land on the pad. Change one thing at a time so you know what caused the change. The white tick on the meter shows your last power.',
  ],
  answerKey() {
    if (ER._launchSolve) ER._launchSolve();
    const sol = ER._launchSolutions || {};
    const rows = Object.keys(sol).map((k) => `${sol[k].name}: for example angle ${sol[k].angle}°, power ${sol[k].power}${sol[k].note || ''}`);
    return ER.keyList([
      'Mission 1: lock the power and planet (e.g. Earth, power 60) and fire at about 15°, 30°, 45°, 60° and 75°. The range is longest at about 45° and equal for angles that add up to 90° (30° and 60°).',
      ...(rows.length ? ['Missions 2 to 6, example settings (many others also work): ' + rows.join('; ') + '.'] : []),
    ]);
  },
  build(body, api) {
    const { el } = ER;
    const M = ER.models;
    const W = 640, H = 360, X0 = 40, GY = 322, SPAN = 592;
    const done = { a: false, b: false };

    const PLANETS = {
      earth: { name: '🌍 Earth', g: 9.8, sky: ['#7cc4ff', '#dff2ff'], ground: '#5aa05a', stars: false },
      moon: { name: '🌙 Moon', g: 1.62, sky: ['#05070f', '#141a33'], ground: '#a7a7b2', stars: true },
      mars: { name: '🔴 Mars', g: 3.71, sky: ['#b9714f', '#f2c7a2'], ground: '#b5532f', stars: false },
    };
    const wall = (x0, x1, h, id = 'wall') => ({ type: 'rect', x0, x1, y0: 0, y1: h, id });
    // each contract: planet, xmax (metres across the screen), solids, target pad {x0,x1,id,y}
    const CONTRACTS = [
      { id: 'c1', name: '1. Training Pad', planet: 'earth', xmax: 150, solids: [], pad: { x0: 84, x1: 96, id: 'ground', y: 0 }, brief: 'Deliver the payload to the landing pad. Land anywhere on the striped pad.' },
      { id: 'c2', name: '2. Over the Wall', planet: 'earth', xmax: 150, solids: [wall(48, 54, 30)], pad: { x0: 104, x1: 118, id: 'ground', y: 0 }, brief: 'A wall blocks a flat shot. Aim higher to clear it, then land on the pad.' },
      { id: 'c3', name: '3. Moon Drop', planet: 'moon', xmax: 600, solids: [wall(150, 175, 60)], pad: { x0: 395, x1: 435, id: 'ground', y: 0 }, brief: 'Gravity is weak on the Moon, so a little power goes a long way. Clear the ridge and hit the pad.' },
      { id: 'c4', name: '4. Mars Plateau', planet: 'mars', xmax: 300, solids: [{ type: 'rect', x0: 150, x1: 250, y0: 0, y1: 25, id: 'plat' }], pad: { x0: 205, x1: 245, id: 'plat', y: 25 }, brief: 'Land on top of the plateau, on the striped pad. Hitting the cliff side is a crash.' },
      { id: 'c5', name: '5. Asteroid Alley', planet: 'mars', xmax: 300, solids: [{ type: 'circle', x: 90, y: 75, r: 9, ay: 65, period: 10, phase: 0 }, { type: 'circle', x: 150, y: 75, r: 9, ay: 65, period: 13, phase: 2 }, { type: 'circle', x: 205, y: 75, r: 9, ay: 65, period: 9, phase: 4 }, { type: 'circle', x: 232, y: 75, r: 9, ay: 60, period: 11, phase: 1 }], pad: { x0: 245, x1: 275, id: 'ground', y: 0 }, maxPower: 90, brief: 'Asteroids sweep all the way up and down the sky, and this launcher is limited to power 90, so you cannot lob over them. Watch their rhythm and time your release!', moving: true },
    ];
    const byId = {}; CONTRACTS.forEach((c) => { byId[c.id] = c; });

    function levelFor(id) {
      if (id === 'range') return { id: 'range', name: 'Test Range', xmax: 200, solids: [], pad: null };
      return byId[id];
    }
    function padSolids(c) { return c.solids; }
    function shot(c, planet, angle, power, t0 = 0) {
      const r = M.projectile(PLANETS[planet].g, angle, power, padSolids(c), t0);
      let hit = false, msg = '';
      if (r.end && r.end.type === 'crash') msg = '💥 Crashed into an obstacle!';
      else if (c.pad) {
        if (r.end && r.end.id === c.pad.id && r.end.x >= c.pad.x0 && r.end.x <= c.pad.x1) { hit = true; msg = '🎯 Direct hit! Payload delivered.'; }
        else {
          const mid = (c.pad.x0 + c.pad.x1) / 2;
          const off = r.end ? r.end.x - mid : 0;
          msg = r.end && r.end.id !== 'ground' && r.end.id !== c.pad.id ? '💥 Hit an obstacle.' : `Missed: landed ${Math.abs(off).toFixed(0)} m ${off < 0 ? 'SHORT of' : 'PAST'} the middle of the pad.`;
        }
      } else msg = `Landed ${r.range.toFixed(1)} m away.`;
      return { r, hit, msg };
    }

    // find working settings so the reveal key can quote them, and check each contract is not fickle
    // Working settings for the reveal key. Computed only when first asked for, because it runs thousands of simulated shots.
    ER._launchSolutions = {};
    let solved = false;
    ER._launchSolve = function () {
      if (solved) return; solved = true;
      CONTRACTS.forEach((c) => {
        const phases = c.moving ? [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22] : [0];
        const wins = []; let best = null;
        for (let a = 10; a <= 85; a += c.moving ? 3 : 2) for (let p = 10; p <= (c.maxPower || 100); p += c.moving ? 3 : 2) {
          let n = 0; phases.forEach((t0) => { if (shot(c, c.planet, a, p, t0).hit) n++; });
          if (n) wins.push([a, p, n]);
          if (n && (!best || n >= best[2])) best = [a, p, n, phases.length];
        }
        c.winCount = wins.length; c.bestShare = best ? best[2] / phases.length : 0;
        if (wins.length) { const m = c.moving ? best : wins[Math.floor(wins.length / 2)]; ER._launchSolutions[c.id] = { name: c.name.replace(/^\d\.\s*/, ''), angle: m[0], power: m[1], note: c.moving ? ' (the asteroids move: release when the gaps line up, so you may need a few tries to get the timing)' : '' }; }
      });
    };

    /* ---------- missions (picked from the board inside the simulation) ---------- */
    const MISSIONS = [
      { id: 'range', no: 1, icon: '🧪', name: 'Angle Lab', blurb: 'Fair-test the launch angle on the Test Range', view: 'game' },
      ...CONTRACTS.map((c, i) => ({ id: c.id, no: i + 2, icon: ['🎯', '🧱', '🌙', '🔴', '☄️'][i], name: c.name.replace(/^\d\.\s*/, ''), blurb: c.brief.split('.')[0], view: 'game' })),
    ];
    const missionById = {}; MISSIONS.forEach((m) => { missionById[m.id] = m; });

    let place = 'range', planet = 'earth';
    const stars = {}; const shotsHere = {};
    const log = [];
    let ghost = null, flight = null, rafId = 0, alive = true, ts0 = 0, lastT = 0, clk = 0;
    const PLAY = 3; // simulated seconds per real second while asteroids are moving
    // controls: angle (keys / mouse), power (hold space or mouse to charge, or lock a precise value)
    let angleV = 45, charging = false, charge = 0, lockOn = false, lockedPower = 50, lastPower = null, spaceDown = false;

    const canvas = el('canvas', { width: W, height: H, class: 'bunny-canvas launch-canvas', tabindex: '0', 'aria-label': 'Launcher game: aim with the up and down arrow keys or the mouse, hold space or the mouse button to set power, release to fire' });
    const cx = canvas.getContext('2d');
    const info = el('div', { class: 'live-line' });
    const board = el('div', { class: 'mission-board' });
    const progressLine = el('div', { class: 'live-line' });
    const gameView = el('div');
    const panelView = el('div');
    const planetBtns = {};
    const planetRow = el('div', { class: 'seg', style: { marginBottom: '8px' } }, Object.keys(PLANETS).map((k) => {
      const b = el('button', { type: 'button', class: 'seg-btn' + (k === planet ? ' on' : ''), onclick: () => { if (flight && flight.n < flight.r.pts.length) return; planet = k; ghost = null; flight = null; syncUI(); draw(); } }, PLANETS[k].name);
      planetBtns[k] = b; return b;
    }));
    const planetBox = el('div', {}, el('span', { class: 'muted small' }, '🪐 Planet (Test Range only): '), planetRow);
    const clearBtn = el('button', { class: 'btn btn-light', onclick: () => { log.length = 0; renderLog(); evaluate(); } }, '🧹 Clear logbook');
    const logBody = el('tbody');
    const logTable = el('table', { class: 'answer-table log-table' },
      el('thead', {}, el('tr', {}, ...['#', 'Where', 'Angle (°)', 'Power', 'Result'].map((t) => el('th', {}, t)))), logBody);
    const chartHost = el('div', { class: 'card', hidden: true });

    const cur = () => levelFor(place);
    const curPlanet = () => (place === 'range' ? planet : byId[place].planet);
    function scale() { return SPAN / cur().xmax; }
    const PX = (m) => X0 + m * scale(), PY = (m) => GY - m * scale();

    function syncUI() {
      const c = cur(), m = missionById[place];
      planetBox.style.display = place === 'range' ? '' : 'none';
      Object.keys(planetBtns).forEach((k) => planetBtns[k].classList.toggle('on', k === planet));
      info.textContent = place === 'range'
        ? `🧪 Angle Lab on ${PLANETS[planet].name}: lock the power, then fire at 5 or more angles (one 25° or less, one 65° or more, one in the middle).`
        : `🎯 ${m.name} on ${PLANETS[c.planet].name}. ${c.brief}`;
    }

    function drawScene() {
      const p = PLANETS[curPlanet()], c = cur();
      const grd = cx.createLinearGradient(0, 0, 0, GY); grd.addColorStop(0, p.sky[0]); grd.addColorStop(1, p.sky[1]);
      cx.fillStyle = grd; cx.fillRect(0, 0, W, H);
      if (p.stars) { cx.fillStyle = '#fff'; for (let i = 0; i < 60; i++) cx.fillRect((i * 97) % W, (i * 53) % (GY - 10), 1.5, 1.5); }
      // distance ruler
      cx.font = '14px Fredoka, sans-serif'; cx.textAlign = 'center';
      const step = c.xmax <= 200 ? 25 : (c.xmax <= 300 ? 50 : 100);
      for (let m = 0; m <= c.xmax; m += step) {
        cx.strokeStyle = 'rgba(255,255,255,0.22)'; cx.beginPath(); cx.moveTo(PX(m), 0); cx.lineTo(PX(m), GY); cx.stroke();
        cx.fillStyle = p.stars || curPlanet() === 'mars' ? 'rgba(255,255,255,0.85)' : 'rgba(11,26,51,0.7)'; cx.fillText(m + ' m', PX(m), GY + 14);
      }
      cx.fillStyle = p.ground; cx.fillRect(0, GY, W, H - GY);
      cx.fillStyle = 'rgba(0,0,0,0.2)'; cx.fillRect(0, GY, W, 3);
      // solids
      (c.solids || []).forEach((s) => {
        if (s.type === 'circle') {
          const pos = M.circleAt(s, clk);
          if (s.period) {
            cx.setLineDash([3, 5]); cx.strokeStyle = 'rgba(255,255,255,0.55)'; cx.lineWidth = 2; cx.beginPath();
            cx.moveTo(PX(s.x - (s.ax || 0)), PY(s.y - (s.ay || 0))); cx.lineTo(PX(s.x + (s.ax || 0)), PY(s.y + (s.ay || 0))); cx.stroke(); cx.setLineDash([]);
          }
          const rr = Math.max(6, s.r * scale());
          cx.beginPath(); cx.arc(PX(pos[0]), PY(pos[1]), rr, 0, 7); cx.fillStyle = '#6b5b4e'; cx.fill(); cx.strokeStyle = '#3a2f27'; cx.lineWidth = 2; cx.stroke();
          cx.beginPath(); cx.arc(PX(pos[0]) - rr * 0.3, PY(pos[1]) - rr * 0.3, rr * 0.28, 0, 7); cx.fillStyle = '#8a776a'; cx.fill();
        } else {
          cx.fillStyle = s.id === 'plat' ? '#9c4a29' : '#6b7280'; cx.fillRect(PX(s.x0), PY(s.y1), PX(s.x1) - PX(s.x0), PY(s.y0) - PY(s.y1));
          cx.strokeStyle = 'rgba(0,0,0,0.45)'; cx.lineWidth = 2; cx.strokeRect(PX(s.x0), PY(s.y1), PX(s.x1) - PX(s.x0), PY(s.y0) - PY(s.y1));
        }
      });
      // target pad
      if (c.pad) {
        const x0 = PX(c.pad.x0), x1 = PX(c.pad.x1), y = PY(c.pad.y);
        for (let i = 0; i < 8; i++) { cx.fillStyle = i % 2 ? '#111' : '#ffd23f'; cx.fillRect(x0 + (x1 - x0) * i / 8, y - 5, (x1 - x0) / 8 + 0.5, 6); }
        cx.font = '22px "Segoe UI Emoji","Apple Color Emoji",sans-serif'; cx.fillStyle = '#000'; cx.fillText('🚩', (x0 + x1) / 2, y - 10);
        cx.font = 'bold 15px Fredoka, sans-serif'; cx.fillStyle = '#fff'; cx.strokeStyle = 'rgba(0,0,0,0.6)'; cx.lineWidth = 3; cx.strokeText('TARGET', (x0 + x1) / 2, y - 36); cx.fillText('TARGET', (x0 + x1) / 2, y - 36);
      }
    }
    function drawLauncher() {
      const th = angleV * Math.PI / 180;
      cx.save(); cx.translate(X0, GY - 6); cx.rotate(-th);
      cx.fillStyle = '#44557a'; cx.fillRect(-4, -6, 38, 12); cx.fillStyle = '#ffd23f'; cx.fillRect(30, -7, 6, 14);
      cx.restore();
      cx.beginPath(); cx.arc(X0, GY - 6, 12, 0, 7); cx.fillStyle = '#2a3a55'; cx.fill(); cx.strokeStyle = '#0b1a33'; cx.lineWidth = 2; cx.stroke();
      cx.fillStyle = '#2a3a55'; cx.fillRect(X0 - 16, GY - 4, 32, 6);
    }
    function pathPts(pts, upto) { const n = Math.max(1, Math.min(pts.length, upto)); cx.beginPath(); for (let i = 0; i < n; i++) { const q = pts[i]; if (i) cx.lineTo(PX(q[0]), PY(q[1])); else cx.moveTo(PX(q[0]), PY(q[1])); } }
    function draw() {
      if (!canvas.isConnected) return;
      drawScene();
      if (ghost) { pathPts(ghost.r.pts, 1e9); cx.setLineDash([5, 5]); cx.strokeStyle = 'rgba(255,255,255,0.65)'; cx.lineWidth = 2; cx.stroke(); cx.setLineDash([]); }
      if (flight) {
        const n = flight.n;
        pathPts(flight.r.pts, n); cx.strokeStyle = '#ff6b4a'; cx.lineWidth = 3; cx.stroke();
        const q = flight.r.pts[Math.min(n, flight.r.pts.length) - 1];
        cx.beginPath(); cx.arc(PX(q[0]), PY(q[1]), 6, 0, 7); cx.fillStyle = '#ffd23f'; cx.fill(); cx.strokeStyle = '#7a3b00'; cx.lineWidth = 2; cx.stroke();
        if (flight.n >= flight.r.pts.length) { cx.font = 'bold 22px Fredoka, sans-serif'; cx.textAlign = 'center'; cx.fillStyle = flight.hit ? '#16a34a' : '#dc2626'; cx.fillText(flight.hit ? '🎯 HIT!' : '✖', PX(q[0]), PY(q[1]) - 18); }
      }
      drawLauncher();
      cx.font = 'bold 17px Fredoka, sans-serif'; cx.textAlign = 'left'; cx.fillStyle = curPlanet() === 'earth' ? '#0b1a33' : '#fff';
      cx.fillText(`angle ${angleV}°   power ${lockOn ? lockedPower : (charging ? Math.round(charge) : (lastPower || '–'))}`, 10, 18);
      drawMeter();
    }

    function drawMeter() {
      const mx = W - 34, my = 36, mh = 200, p = lockOn ? lockedPower : (charging ? charge : 0);
      cx.fillStyle = 'rgba(11,26,51,0.65)'; cx.fillRect(mx - 3, my - 3, 24, mh + 6);
      const grd = cx.createLinearGradient(0, my + mh, 0, my); grd.addColorStop(0, '#22c55e'); grd.addColorStop(0.6, '#ffd23f'); grd.addColorStop(1, '#ef4444');
      cx.fillStyle = grd; cx.fillRect(mx, my + mh - (mh * p) / 100, 18, (mh * p) / 100);
      if (powerCap() < 100) { cx.fillStyle = 'rgba(239,68,68,0.55)'; cx.fillRect(mx, my, 18, (mh * (100 - powerCap())) / 100); cx.font = 'bold 10px Fredoka, sans-serif'; cx.fillStyle = '#fff'; cx.textAlign = 'right'; cx.fillText('MAX ' + powerCap(), mx - 5, my + (mh * (100 - powerCap())) / 100 + 4); cx.textAlign = 'start'; }
      if (lastPower) { cx.fillStyle = '#fff'; cx.fillRect(mx - 6, my + mh - (mh * lastPower) / 100 - 1, 30, 2); }
      cx.font = 'bold 13px Fredoka, sans-serif'; cx.textAlign = 'center'; cx.fillStyle = '#fff'; cx.fillText('POWER', mx + 9, my - 8);
      cx.fillText(lockOn ? '🔒' + lockedPower : (charging ? String(Math.round(charge)) : ''), mx + 9, my + mh + 20);
      cx.textAlign = 'start';
    }

    function setAngle(a) { angleV = Math.max(5, Math.min(85, Math.round(a))); refreshControls(); draw(); }
    const powerCap = () => (cur().maxPower || 100);
    function setLocked(p) { lockedPower = Math.max(10, Math.min(powerCap(), Math.round(p))); lockOn = true; refreshControls(); draw(); }
    const angleReadout = el('b', { class: 'slider-val' });
    const powerReadout = el('b', { class: 'slider-val' });
    const lockBtn = el('button', { class: 'btn btn-light', type: 'button', onclick: () => toggleLock() });
    function toggleLock() { lockOn = !lockOn; if (lockOn && lastPower) lockedPower = lastPower; ER.sfx.tap(); refreshControls(); draw(); }
    function refreshControls() {
      angleReadout.textContent = angleV + '°';
      powerReadout.textContent = lockOn ? String(lockedPower) : (charging ? String(Math.round(charge)) : (lastPower ? lastPower + ' (last shot)' : 'hold Space'));
      lockBtn.textContent = lockOn ? `🔒 Power locked at ${lockedPower} (click to unlock)` : '🔓 Lock the power (for fair tests)';
      lockBtn.classList.toggle('btn-sun', lockOn);
    }
    const holdBtn = el('button', { class: 'btn btn-coral btn-big', type: 'button' }, '🚀 HOLD to charge, RELEASE to fire');
    const upBtn = el('button', { class: 'btn btn-light', type: 'button', onclick: () => setAngle(angleV + 1) }, '▲ Angle');
    const downBtn = el('button', { class: 'btn btn-light', type: 'button', onclick: () => setAngle(angleV - 1) }, '▼ Angle');
    const minusBtn = el('button', { class: 'btn btn-light', type: 'button', onclick: () => setLocked((lockOn ? lockedPower : (lastPower || 50)) - 1) }, '− Power');
    const plusBtn = el('button', { class: 'btn btn-light', type: 'button', onclick: () => setLocked((lockOn ? lockedPower : (lastPower || 50)) + 1) }, '+ Power');

    // "press" and "release" are shared by Space, the mouse on the field, and the big button
    function pressFire() {
      if (flight && flight.n < flight.r.pts.length) return false;
      if (lockOn) return true;            // a locked power fires on release
      if (!charging) { charging = true; charge = 0; ER.sfx.tap(); }
      return true;
    }
    function releaseFire() {
      if (lockOn) { fire(lockedPower); return; }
      if (!charging) return;
      charging = false;
      fire(Math.max(10, Math.round(charge)));
    }

    function fire(pw) {
      if (flight && flight.n < flight.r.pts.length) return;
      const c = cur(), a = angleV, pl = curPlanet();
      pw = Math.min(pw, powerCap());
      const res = shot(c, pl, a, pw, clk);
      if (flight) ghost = { r: flight.r };
      flight = { r: res.r, n: 1, hit: res.hit, res, a, pw, pl, c, t0: clk };
      lastPower = pw; ts0 = 0;
      ER.sfx.tap();
      refreshControls();
    }
    function land(f) {
      const { res, a, pw, pl, c } = f;
      shotsHere[c.id] = (shotsHere[c.id] || 0) + 1;
      const rangeTxt = c.id === 'range' ? `${res.r.range.toFixed(1)} m` : (res.hit ? '🎯 hit' : '✖ miss');
      log.push({ where: c.id === 'range' ? '🧪 ' + PLANETS[pl].name : c.name, place: c.id, planet: pl, a, pw, range: res.r.range, hit: res.hit, text: rangeTxt });
      renderLog();
      let extra = '';
      if (c.id === 'range') extra = ` Highest point ${res.r.maxH.toFixed(1)} m, flight time ${res.r.time.toFixed(1)} s.`;
      info.textContent = `${a}°, power ${pw}: ${res.msg}${extra}`;
      if (res.hit) {
        ER.sfx.good();
        const n = shotsHere[c.id], st = n <= 3 ? 3 : n <= 6 ? 2 : 1;
        if (!stars[c.id] || st > stars[c.id]) stars[c.id] = st;
        info.textContent += `  ${'⭐'.repeat(st)} (${n} shot${n === 1 ? '' : 's'}) Mission complete! Pick your next mission from the board.`;
        shotsHere[c.id] = 0;
      } else ER.sfx.bad();
      evaluate();
    }

    function renderLog() {
      logBody.innerHTML = '';
      log.slice(-40).forEach((r, i, arr) => logBody.append(el('tr', {}, el('td', {}, String(log.length - arr.length + i + 1)), el('td', {}, r.where), el('td', {}, String(r.a)), el('td', {}, String(r.pw)), el('td', {}, el('b', {}, r.text)))));
    }
    const isDone = (id) => (id === 'range' ? done.a : !!stars[id]);
    function renderBoard() {
      const n = MISSIONS.filter((m) => isDone(m.id)).length;
      progressLine.textContent = n === MISSIONS.length ? '🏆 ALL MISSIONS COMPLETE!' : `Mission progress: ${n} of ${MISSIONS.length} complete. Pick any mission below.`;
      board.replaceChildren(...MISSIONS.map((m) => el('button', {
        type: 'button', class: 'mission-card' + (m.id === place ? ' on' : '') + (isDone(m.id) ? ' done' : ''),
        onclick: () => { ER.sfx.tap(); select(m.id); },
      }, el('span', { class: 'mc-icon' }, isDone(m.id) ? '✅' : m.icon),
        el('span', { class: 'mc-body' }, el('b', {}, `${m.no}. ${m.name}`), el('small', {}, m.blurb), stars[m.id] ? el('small', {}, '⭐'.repeat(stars[m.id])) : ''))));
    }
    function select(id) {
      if (flight && flight.n < flight.r.pts.length) return; // let a shot finish first
      place = id; ghost = null; flight = null; charging = false; lockOn = false; lastPower = null;
      lockedPower = Math.min(lockedPower, powerCap());
      const m = missionById[id];
      gameView.hidden = m.view !== 'game';
      panelView.hidden = m.view === 'game';
      chartHost.style.display = id === 'range' ? '' : 'none';
      if (m.view === 'game') { syncUI(); refreshControls(); draw(); }
      renderBoard();
    }
    function evaluate() {
      // Mission 1: a fair test of angle on the Test Range: same planet and power, >= 4 different angles incl. <=25 and >=65
      const groups = {};
      log.filter((r) => r.place === 'range').forEach((r) => { const k = r.planet + '|' + r.pw; (groups[k] = groups[k] || []).push(r); });
      let best = null;
      Object.values(groups).forEach((g) => {
        const byA = {}; g.forEach((r) => { byA[r.a] = r; });
        const arr = Object.values(byA).sort((x, y) => x.a - y.a);
        if (arr.length >= 5 && arr[0].a <= 25 && arr[arr.length - 1].a >= 65 && arr.some((r) => r.a >= 35 && r.a <= 55) && (!best || arr.length > best.length)) best = arr;
      });
      if (best) {
        const top = Math.max(...best.map((r) => r.range));
        const ymax = Math.max(50, Math.ceil(top / 50) * 50 + 50);
        const ch = ER.liveChart({ w: 520, h: 240, xmin: 0, xmax: 90, xstep: 10, ymax, ystep: ymax / 5, digits: 1, xlabel: 'Launch angle (degrees)', ylabel: 'Range (m)' });
        ch.show([{ name: 'Range', color: '#d94a2b', pts: best.map((r) => [r.a, r.range]), dots: true }], Infinity);
        chartHost.replaceChildren(el('h4', {}, '📈 Your fair test: launch angle vs range'), ch.node);
        chartHost.hidden = false;
        if (!done.a) { done.a = true; ER.sfx.good(); info.textContent += ' 🧪 Mission 1 complete! See your chart below.'; }
      }
      if (CONTRACTS.every((c) => stars[c.id])) done.b = true;
      renderBoard();
      check();
    }

    function loop(t) {
      if (!alive) return;
      const dt = Math.min(0.05, lastT ? (t - lastT) / 1000 : 0.016); lastT = t;
      if (charging) { charge = Math.min(powerCap(), charge + dt * 55); refreshControls(); }
      if (flight && flight.n < flight.r.pts.length) {
        if (!ts0) ts0 = t;
        let n;
        if (flight.c.moving) {
          // constant playback speed, the same speed the asteroids drift at while you aim, so their motion never changes pace
          n = Math.min(flight.r.pts.length, Math.floor(((t - ts0) / 1000) * PLAY / 0.02) + 1);
          clk = flight.t0 + (n - 1) * 0.02;
        } else {
          const dur = Math.min(3200, Math.max(1100, flight.r.time * 380));
          n = Math.min(flight.r.pts.length, Math.floor(((t - ts0) / dur) * flight.r.pts.length) + 1);
        }
        if (n !== flight.n) { flight.n = n; if (n >= flight.r.pts.length) land(flight); }
      } else clk += dt * PLAY;
      if (canvas.isConnected && !gameView.hidden) draw();
      rafId = requestAnimationFrame(loop);
    }

    function check() { if (isDone('range') && done.b) api.solve(); }

    /* ---------- input: keys and mouse ---------- */
    function onKey(e) {
      if (!canvas.isConnected || gameView.hidden) return;
      const tag = (e.target && e.target.tagName) || '';
      if (/INPUT|SELECT|TEXTAREA/.test(tag)) return;
      const down = e.type === 'keydown';
      if (e.code === 'Space') {
        e.preventDefault();
        if (down) { if (!e.repeat) spaceDown = pressFire(); } else if (spaceDown) { spaceDown = false; releaseFire(); }
        return;
      }
      if (!down) return;
      const k = e.key, big = e.shiftKey ? 5 : 1;
      if (k === 'ArrowUp' || k === 'ArrowDown') { e.preventDefault(); setAngle(angleV + (k === 'ArrowUp' ? big : -big)); }
      else if (k === 'ArrowRight' || k === 'ArrowLeft') { e.preventDefault(); setLocked((lockOn ? lockedPower : (lastPower || 50)) + (k === 'ArrowRight' ? big : -big)); }
      else if (k === 'l' || k === 'L') toggleLock();
    }
    window.addEventListener('keydown', onKey);
    window.addEventListener('keyup', onKey);
    let pointerHeld = false;
    function aimAt(e) {
      const r = canvas.getBoundingClientRect();
      const mx = ((e.clientX - r.left) / r.width) * W, my = ((e.clientY - r.top) / r.height) * H;
      setAngle((Math.atan2((GY - 6) - my, Math.max(1, mx - X0)) * 180) / Math.PI);
    }
    canvas.addEventListener('pointermove', (e) => { if (e.pointerType === 'mouse' || pointerHeld) aimAt(e); });
    canvas.addEventListener('pointerdown', (e) => { canvas.focus({ preventScroll: true }); aimAt(e); pointerHeld = pressFire(); });
    holdBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); pointerHeld = pressFire(); });
    window.addEventListener('pointerup', () => { if (pointerHeld) { pointerHeld = false; releaseFire(); } if (document.activeElement === holdBtn) holdBtn.blur(); });

    const controls = el('div', { class: 'launch-controls' },
      el('div', { class: 'lc-group' }, el('span', {}, '📐 Angle: '), angleReadout, el('div', { class: 'row-center' }, upBtn, downBtn)),
      el('div', { class: 'lc-group' }, el('span', {}, '🔥 Power: '), powerReadout, el('div', { class: 'row-center' }, minusBtn, plusBtn)),
      el('div', { class: 'row-center' }, lockBtn),
      el('div', { class: 'row-center' }, holdBtn));
    gameView.append(
      planetBox, info, canvas,
      el('p', { class: 'muted small' }, '⌨️ ↑ ↓ aim (or move the mouse) · HOLD Space to charge · RELEASE to fire · ← → and L set a locked power'),
      controls,
      el('p', { class: 'muted small' }, 'Dashed line = last shot. White tick = last power.'),
      chartHost,
      el('h4', { class: 'ref-sub' }, '📓 Logbook'), el('div', { class: 'table-scroll log-scroll' }, logTable), el('div', { class: 'row-center' }, clearBtn));

    body.append(
      el('p', { class: 'lead' }, '🚀 Aim, charge and launch the payload!'),
      el('div', { class: 'card sim-card' }, el('h4', {}, '🛰️ Mission board'), progressLine, board, gameView, panelView));

    if (ER.DEBUG) ER._launchGame = { // test hook (only with ?debug)
      shot, CONTRACTS, PLANETS, MISSIONS, log, stars, done, select,
      get flight() { return flight; }, get place() { return place; },
      launch(a, p) { angleV = a; flight = null; fire(p); }, setPlanet(v) { planet = v; syncUI(); draw(); },
      finish() { if (flight && flight.n < flight.r.pts.length) { flight.n = flight.r.pts.length; land(flight); } draw(); },
      get clk() { return clk; }, setAngle, setLocked, press: pressFire, release: releaseFire, get state() { return { angleV, charging, charge, lockOn, lockedPower, lastPower }; },
    };

    select('range');
    rafId = requestAnimationFrame(loop);
    return () => { alive = false; cancelAnimationFrame(rafId); window.removeEventListener('keydown', onKey); window.removeEventListener('keyup', onKey); };
  },
});
