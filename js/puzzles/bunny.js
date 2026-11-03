/* Station 4: Bunny Evolution. A stealth game: cross the field without being seen by the wolves,
   hiding only in places that match your bunny's fur colour. Camouflage = survival = natural selection. */
ER.register({
  id: 'bunny',
  title: 'Bunny Evolution',
  icon: '🐰',
  kind: 'game',
  tagline: 'Sneak bunnies past hungry wolves using camouflage',
  code: { letter: 'Y', number: 4 },
  fact: 'Natural selection: animals with traits that suit their environment survive and reproduce more, so those traits become more common over generations. A bunny that matches its surroundings is harder for wolves to spot, so it lives to have young that inherit the same fur colour. Nobody chooses the colour: the environment does the selecting.',
  hints: [
    'A bunny is only hidden while it stands inside a hiding spot that MATCHES its fur: white in ❄️ snow drifts, brown in 🌿 leaf piles, grey among ⛰️ rocks. Wolves hunt you ANYWHERE on the map the moment you step out of cover, but lose you as soon as you are hidden again. Wait inside a spot until every wolf has wandered far away, then dash to the next one.',
    'Meadow: each colour has its own stepping stones that zigzag across the big map. Use the MAP in the corner (snow drifts are white, leaf piles brown, rocks grey, wolves red) to plan a route and to see where the wolves are before you dash. Wolves run faster than you, so only leave cover when they are far away or heading the other way.',
  ],
  answerKey() {
    return ER.keyList([
      'Snowfield: choose the WHITE bunny and hop between the snow drifts. Forest: choose the BROWN bunny and hop between the leaf piles.',
      'Meadow: cross three times, once as white (snow drifts), once as brown (leaf piles) and once as grey (rocks). Wait in each hiding spot until the wolf has turned away.',
      'Mission C: matching fur hides the bunny, hidden bunnies survive to pass on their fur colour, and if the environment changes the colour that suits it changes too.',
    ]);
  },
  build(body, api) {
    const { el } = ER;
    const W = 640, H = 360;               // the visible window (the meadow is bigger and scrolls)
    let SPEED = 112, WOLF_ROAM = 62, WOLF_CHASE = 150;
    const CATCH = 15, SAFE_X = 58;

    const COLOURS = {
      white: { name: 'white', icon: '⚪', fur: '#ffffff', hides: 'snow' },
      brown: { name: 'brown', icon: '🟤', fur: '#7a4a22', hides: 'leaf' },
      grey: { name: 'grey', icon: '🔘', fur: '#8d9199', hides: 'rock' },
    };
    const SPOTS = {
      snow: { fill: '#ffffff', icon: '❄️', label: 'Snow drift' },
      leaf: { fill: '#7a4a22', icon: '🌿', label: 'Leaf pile' },
      rock: { fill: '#8d9199', icon: '⛰️', label: 'Rocks' },
    };
    const sp = (type, x, y) => ({ type, x, y, rx: 38, ry: 26 });

    // tiny seeded random numbers, so a run can be saved and replayed exactly (used by the test bot)
    function rnd(o) {
      o.seed = (o.seed + 0x6D2B79F5) | 0;
      let t = Math.imul(o.seed ^ (o.seed >>> 15), 1 | o.seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }
    // Cover for the small maps: columns of hiding spots of ONE type, 2 of 3 lanes per column,
    // re-rolled until there is a route of neighbouring spots from the start to the burrow.
    function chainField(type, cols, x0, dx, seed0) {
      const lanes = [70, 180, 290];
      for (let seed = seed0; ; seed++) {
        const o = { seed }, grid = [];
        for (let c = 0; c < cols; c++) { const skip = Math.floor(rnd(o) * 3); grid.push([0, 1, 2].filter((l) => l !== skip)); }
        let reach = grid[0].slice();
        for (let c = 1; c < cols && reach.length; c++) reach = grid[c].filter((l) => reach.some((r) => Math.abs(r - l) <= 1));
        if (reach.length) return grid.flatMap((ls, c) => ls.map((l) => sp(type, x0 + c * dx, lanes[l] + (c % 2 ? 12 : -12))));
      }
    }
    // the big meadow: 11 columns x 5 lanes. Each colour has its own stepping stones that wander up and down the lanes.
    function meadowSpots() {
      const o = { seed: 11 }, lanes = [90, 225, 360, 495, 630], types = ['snow', 'leaf', 'rock'], out = [];
      let lane = { snow: 1, leaf: 2, rock: 3 };
      for (let c = 0; c < 11; c++) {
        let pick = null;
        for (let tries = 0; tries < 400 && !pick; tries++) {
          const taken = new Set(), p = {};
          let okc = true;
          for (const t of types.slice().sort(() => rnd(o) - 0.5)) {
            const opts = [lane[t] - 1, lane[t], lane[t] + 1].filter((l) => l >= 0 && l <= 4 && !taken.has(l));
            if (!opts.length) { okc = false; break; }
            p[t] = opts[Math.floor(rnd(o) * opts.length)]; taken.add(p[t]);
          }
          if (okc) pick = p;
        }
        lane = pick || lane;
        types.forEach((t) => out.push(sp(t, 125 + c * 100, lanes[lane[t]])));
      }
      return out;
    }

    const LEVELS = {
      snow: {
        name: '❄️ Snowfield', ground: '#d9e6f2', deco: 'snow', w: 640, h: 360, wolves: 2,
        spots: chainField('snow', 7, 105, 72, 5),
        blurb: 'Two wolves. Which colour can hide in snow?',
      },
      forest: {
        name: '🌲 Forest floor', ground: '#4f6b40', deco: 'forest', w: 640, h: 360, wolves: 2,
        spots: chainField('leaf', 7, 105, 72, 9),
        blurb: 'Two wolves. Choose your bunny!',
      },
      meadow: {
        name: '🌄 Mountain meadow', ground: '#7f9b5e', deco: 'meadow', w: 1280, h: 720, wolves: 4,
        spots: meadowSpots(),
        blurb: 'FOUR wolves! White, brown and grey each need their own route.',
      },
    };
    const ORDER = ['snow', 'forest', 'meadow'];

    // progress and the "wolf's field notebook" (data collected from every run)
    const done = { a: false, b: false, c: false };
    const won = { snow: false, forest: false, meadow: { white: false, brown: false, grey: false } };
    const book = {};
    ORDER.forEach((l) => { book[l] = {}; Object.keys(COLOURS).forEach((c) => { book[l][c] = { tries: 0, escaped: 0 }; }); });

    let level = 'snow', colour = 'white';
    let g = null;      // current run state
    let raf = 0, last = 0, alive = true;
    const keys = {};
    let target = null;

    const canvas = el('canvas', { width: W, height: H, class: 'bunny-canvas bunny-game', tabindex: '0', 'aria-label': 'Bunny stealth game: use arrow keys or tap to move the bunny to the burrow on the right' });
    const cx = canvas.getContext('2d');
    const info = el('div', { class: 'live-line' });
    const notebook = el('div', { class: 'log-scroll' });

    const levelC = ER.choice({ label: '🗺️ Level', value: 'snow', options: ORDER.map((l) => ({ v: l, t: LEVELS[l].name })), onChange: (v) => { level = v; newRun(); } });
    const colourC = ER.choice({ label: '🐰 Your bunny', value: 'white', options: Object.keys(COLOURS).map((c) => ({ v: c, t: `${COLOURS[c].icon} ${c[0].toUpperCase() + c.slice(1)}` })), onChange: (v) => { colour = v; newRun(); } });

    function newRun(seed) {
      const L = LEVELS[level];
      g = { state: 'ready', x: 34, y: L.h / 2, hidden: true, t: 0, msg: '', seed: seed == null ? Math.floor(Math.random() * 1e9) : seed, wolves: [] };
      for (let i = 0; i < L.wolves; i++) {
        const w = { x: L.w * (0.4 + 0.55 * rnd(g)), y: L.h * (0.1 + 0.8 * rnd(g)), mode: 'roam', tx: 0, ty: 0, timer: 0 };
        newRoam(w, L); g.wolves.push(w);
      }
      target = null;
      info.textContent = L.blurb;
    }
    function newRoam(w, L) { w.tx = 20 + rnd(g) * (L.w - 40); w.ty = 20 + rnd(g) * (L.h - 40); w.timer = 2 + rnd(g) * 3; }
    const goalX = () => LEVELS[level].w - 44;

    function isHidden() {
      if (g.x < SAFE_X) return true; // the start burrow is safe
      const need = COLOURS[colour].hides;
      return LEVELS[level].spots.some((p) => p.type === need && ((g.x - p.x) / p.rx) ** 2 + ((g.y - p.y) / p.ry) ** 2 <= 1);
    }

    function finish(ok, why) {
      g.state = ok ? 'won' : 'caught';
      const rec = book[level][colour];
      rec.tries++;
      if (ok) rec.escaped++;
      if (ok) ER.sfx.good(); else ER.sfx.bad();
      g.msg = ok ? '🏠 Made it to the burrow!' : '🐺 Caught!';
      if (ok) {
        if (level === 'meadow') won.meadow[colour] = true; else won[level] = true;
        info.textContent = `🎉 Your ${colour} bunny escaped in ${g.t.toFixed(1)} s. ` + (level === 'meadow' ? 'Press "Play again" and try a different colour.' : 'Try another colour or level to see what changes.');
      } else {
        info.textContent = why;
      }
      renderBook();
      progress();
    }

    function progress() {
      const m = won.meadow;
      const a = won.snow && won.forest;
      const b = m.white && m.brown && m.grey;
      if (a && !done.a) { done.a = true; }
      if (b && !done.b) { done.b = true; }
      check();
    }

    function update(dt) {
      if (!g || g.state === 'won' || g.state === 'caught') return;
      // movement
      let dx = 0, dy = 0;
      if (keys.ArrowLeft || keys.a) dx -= 1;
      if (keys.ArrowRight || keys.d) dx += 1;
      if (keys.ArrowUp || keys.w) dy -= 1;
      if (keys.ArrowDown || keys.s) dy += 1;
      if (dx || dy) { target = null; } else if (target) {
        const tx = target[0] - g.x, ty = target[1] - g.y, d = Math.hypot(tx, ty);
        if (d < 4) target = null; else { dx = tx / d; dy = ty / d; }
      }
      const L = LEVELS[level];
      if ((dx || dy) && g.state === 'ready') { g.state = 'playing'; info.textContent = 'Wolves hunt you anywhere when you are NOT hidden!'; }
      const idle = g.state === 'ready'; // wolves keep roaming while you wait in the start burrow
      const n = Math.hypot(dx, dy) || 1;
      const step = Math.min(SPEED * dt, target ? Math.hypot(target[0] - g.x, target[1] - g.y) : 1e9);
      if ((dx || dy) && !idle) { g.x += (dx / n) * step; g.y += (dy / n) * step; }
      g.x = Math.max(10, Math.min(L.w - 8, g.x)); g.y = Math.max(16, Math.min(L.h - 10, g.y));
      if (!idle) g.t += dt;
      g.hidden = isHidden();

      for (const w of g.wolves) {
        const d = Math.hypot(g.x - w.x, g.y - w.y) || 1;
        if (!g.hidden) {
          if (w.mode !== 'chase') { w.mode = 'chase'; if (d < 400) ER.sfx.tap(); }
          w.x += ((g.x - w.x) / d) * WOLF_CHASE * dt; w.y += ((g.y - w.y) / d) * WOLF_CHASE * dt;
        } else {
          if (w.mode === 'chase') { w.mode = 'search'; w.tx = g.x; w.ty = g.y; w.timer = 2.5; }
          const rd = Math.hypot(w.tx - w.x, w.ty - w.y);
          w.timer -= dt;
          if (w.mode === 'search') {
            // hunt around the place where you were last seen, then give up and roam again
            if (rd > 6) { w.x += ((w.tx - w.x) / rd) * WOLF_ROAM * 1.6 * dt; w.y += ((w.ty - w.y) / rd) * WOLF_ROAM * 1.6 * dt; }
            if (w.timer <= 0) { w.mode = 'roam'; newRoam(w, L); }
          } else if (rd < 8 || w.timer <= 0) newRoam(w, L);
          else { w.x += ((w.tx - w.x) / rd) * WOLF_ROAM * dt; w.y += ((w.ty - w.y) / rd) * WOLF_ROAM * dt; }
        }
        if (!g.hidden && Math.hypot(g.x - w.x, g.y - w.y) < CATCH) {
          const matching = L.spots.some((p) => p.type === COLOURS[colour].hides);
          finish(false, matching
            ? `Caught in the open! Dash between matching spots only when the wolves are far away.`
            : `Your ${colour} bunny had nowhere to hide here. Try a different colour!`);
          return;
        }
      }
      if (g.x >= goalX()) finish(true);
    }

    /* ---------- drawing ---------- */
    function ellipse(x, y, rx, ry, fill, stroke) {
      cx.beginPath(); cx.ellipse(x, y, rx, ry, 0, 0, 7); cx.fillStyle = fill; cx.fill();
      if (stroke) { cx.strokeStyle = stroke; cx.lineWidth = 1.2; cx.stroke(); }
    }
    function drawBunny(x, y, fur, alpha) {
      cx.globalAlpha = alpha;
      const ol = 'rgba(11,26,51,0.55)';
      ellipse(x - 1, y, 11, 8, fur, ol);
      ellipse(x + 9, y - 3, 6, 5.5, fur, ol);
      ellipse(x + 9, y - 13, 2.6, 7, fur, ol);
      ellipse(x + 4, y - 13, 2.6, 7, fur, ol);
      ellipse(x - 12, y + 1, 3.2, 3.2, '#ffffff', ol);
      ellipse(x + 12, y - 4, 1.2, 1.2, '#0b1a33');
      cx.globalAlpha = 1;
    }
    let cam = { x: 0, y: 0 };
    function drawScene() {
      const L = LEVELS[level], WW = L.w, HH = L.h, GOAL = goalX();
      cam.x = Math.max(0, Math.min(WW - W, g.x - W / 2));
      cam.y = Math.max(0, Math.min(HH - H, g.y - H / 2));
      cx.save();
      cx.translate(-cam.x, -cam.y);
      cx.fillStyle = L.ground; cx.fillRect(0, 0, WW, HH);
      if (L.deco === 'snow') {
        for (let i = 0; i < 40; i++) ellipse((i * 71) % WW, (i * 37) % HH, 14 + (i % 4) * 4, 4, 'rgba(255,255,255,0.7)');
        for (let i = 0; i < 16; i++) ellipse((i * 113) % WW, (i * 61) % HH, 9, 2.5, 'rgba(160,190,220,0.55)');
      } else if (L.deco === 'forest') {
        for (let i = 0; i < 24; i++) ellipse((i * 97) % WW, 24 + ((i * 53) % (HH - 48)), 16 + (i % 3) * 5, 5, 'rgba(25,45,25,0.35)');
        cx.fillStyle = '#243b22';
        for (let i = 0; i < 11; i++) { const x = 14 + i * 58; cx.beginPath(); cx.moveTo(x, 4); cx.lineTo(x - 15, 34); cx.lineTo(x + 15, 34); cx.fill(); cx.beginPath(); cx.moveTo(x + 22, HH - 4); cx.lineTo(x + 7, HH - 34); cx.lineTo(x + 37, HH - 34); cx.fill(); }
      } else {
        for (let i = 0; i < 260; i++) { const x = (i * 83) % WW, y = 12 + ((i * 47) % (HH - 24)); cx.strokeStyle = 'rgba(40,70,30,0.45)'; cx.lineWidth = 1.5; cx.beginPath(); cx.moveTo(x, y); cx.lineTo(x - 2, y - 7); cx.moveTo(x, y); cx.lineTo(x + 3, y - 6); cx.stroke(); }
      }
      // start burrow and goal burrow
      cx.fillStyle = 'rgba(255,214,102,0.30)'; cx.fillRect(0, 0, SAFE_X, HH);
      cx.fillStyle = 'rgba(255,214,102,0.35)'; cx.fillRect(GOAL, 0, WW - GOAL, HH);
      cx.setLineDash([6, 5]); cx.strokeStyle = '#b9811b'; cx.lineWidth = 2;
      cx.beginPath(); cx.moveTo(GOAL, 0); cx.lineTo(GOAL, HH); cx.moveTo(SAFE_X, 0); cx.lineTo(SAFE_X, HH); cx.stroke(); cx.setLineDash([]);
      cx.font = '30px "Segoe UI Emoji","Apple Color Emoji",sans-serif'; cx.textAlign = 'center'; cx.fillStyle = '#000';
      cx.fillText('🏠', (GOAL + WW) / 2, HH / 2 + 10);
      cx.font = 'bold 15px Fredoka, sans-serif'; cx.fillStyle = '#5a3d05';
      cx.fillText('SAFE', (GOAL + WW) / 2, HH / 2 + 34);
      cx.fillText('START', SAFE_X / 2, HH / 2 - 8); cx.fillText('(safe)', SAFE_X / 2, HH / 2 + 10);
      // hiding spots
      L.spots.forEach((p) => {
        if (p.x + 60 < cam.x || p.x - 60 > cam.x + W || p.y + 50 < cam.y || p.y - 50 > cam.y + H) return;
        const s = SPOTS[p.type];
        ellipse(p.x, p.y, p.rx, p.ry, s.fill, 'rgba(11,26,51,0.5)');
        cx.setLineDash([4, 4]); cx.beginPath(); cx.ellipse(p.x, p.y, p.rx + 4, p.ry + 4, 0, 0, 7); cx.strokeStyle = 'rgba(11,26,51,0.25)'; cx.stroke(); cx.setLineDash([]);
        cx.font = '14px "Segoe UI Emoji","Apple Color Emoji",sans-serif'; cx.globalAlpha = 0.7; cx.fillText(s.icon, p.x - p.rx + 10, p.y - p.ry + 12); cx.globalAlpha = 1;
      });
      // wolves: a red line shows who is hunting you
      g.wolves.forEach((w) => {
        if (w.mode === 'chase' && g.state !== 'caught') {
          cx.setLineDash([5, 6]); cx.strokeStyle = 'rgba(220,38,38,0.55)'; cx.lineWidth = 2; cx.beginPath(); cx.moveTo(w.x, w.y); cx.lineTo(g.x, g.y); cx.stroke(); cx.setLineDash([]);
        }
        cx.font = '32px "Segoe UI Emoji","Apple Color Emoji",sans-serif'; cx.fillStyle = '#000'; cx.fillText('🐺', w.x, w.y + 11);
        if (w.mode === 'chase') { cx.font = 'bold 22px Fredoka, sans-serif'; cx.fillStyle = '#dc2626'; cx.fillText('!', w.x + 16, w.y - 14); }
        else if (w.mode === 'search') { cx.font = 'bold 22px Fredoka, sans-serif'; cx.fillStyle = '#e08a00'; cx.fillText('?', w.x + 16, w.y - 14); }
      });
      // bunny
      if (g.state !== 'caught') drawBunny(g.x, g.y, COLOURS[colour].fur, g.hidden ? 0.8 : 1);
      if (g.hidden && g.state !== 'won') { cx.font = 'bold 15px Fredoka, sans-serif'; cx.fillStyle = level === 'forest' ? '#c9f7c0' : '#15803d'; cx.fillText('hidden ✓', g.x, g.y - 24); }
      if (target) { cx.beginPath(); cx.arc(target[0], target[1], 5, 0, 7); cx.strokeStyle = '#7c5cff'; cx.lineWidth = 2; cx.stroke(); }
      cx.restore();
      // minimap on the big map, and edge arrows for wolves that are off screen
      if (WW > W) minimap(L);
      // warning when any wolf is hunting
      if (g.state === 'playing' && g.wolves.some((w) => w.mode === 'chase')) {
        cx.font = 'bold 15px Fredoka, sans-serif'; cx.textAlign = 'center'; cx.fillStyle = '#fff'; cx.fillStyle = 'rgba(220,38,38,0.92)'; cx.fillRect(W / 2 - 92, 6, 184, 24);
        cx.fillStyle = '#fff'; cx.fillText('🐺 HUNTED: find cover!', W / 2, 23);
      }
      // overlay messages
      if (g.state === 'ready') banner('Arrow keys / WASD, or tap to hop');
      else if (g.state === 'caught' || g.state === 'won') banner(g.msg + '   (Play again ↻)');
      cx.textAlign = 'start';
    }
    function minimap(L) {
      const mw = 176, mh = 99, mx = W - mw - 8, my = 8, k = mw / L.w;
      cx.fillStyle = 'rgba(11,26,51,0.65)'; cx.fillRect(mx - 2, my - 2, mw + 4, mh + 4);
      cx.fillStyle = L.ground; cx.fillRect(mx, my, mw, mh);
      cx.fillStyle = 'rgba(255,214,102,0.6)'; cx.fillRect(mx + goalX() * k, my, (L.w - goalX()) * k, mh);
      L.spots.forEach((p) => { cx.fillStyle = SPOTS[p.type].fill; cx.fillRect(mx + p.x * k - 3, my + p.y * k - 2, 6, 4); cx.strokeStyle = 'rgba(11,26,51,0.8)'; cx.lineWidth = 0.8; cx.strokeRect(mx + p.x * k - 3, my + p.y * k - 2, 6, 4); });
      cx.strokeStyle = 'rgba(255,255,255,0.9)'; cx.lineWidth = 1; cx.strokeRect(mx + cam.x * k, my + cam.y * k, W * k, H * k);
      g.wolves.forEach((w) => { cx.beginPath(); cx.arc(mx + w.x * k, my + w.y * k, 3.2, 0, 7); cx.fillStyle = w.mode === 'chase' ? '#ff2a2a' : '#7a1f1f'; cx.fill(); });
      cx.beginPath(); cx.arc(mx + g.x * k, my + g.y * k, 3.5, 0, 7); cx.fillStyle = '#7c5cff'; cx.fill(); cx.strokeStyle = '#fff'; cx.stroke();
      cx.font = 'bold 11px Fredoka, sans-serif'; cx.textAlign = 'left'; cx.fillStyle = '#fff'; cx.fillText('MAP (hiding spots by colour)', mx, my + mh + 14);
    }
    function banner(t) {
      cx.fillStyle = 'rgba(11,26,51,0.78)'; cx.fillRect(40, H - 54, W - 80, 36);
      cx.font = 'bold 18px Fredoka, sans-serif'; cx.fillStyle = '#fff'; cx.textAlign = 'center'; cx.fillText(t, W / 2, H - 30);
    }

    function loop(ts) {
      if (!alive) return;
      const dt = Math.min(0.05, last ? (ts - last) / 1000 : 0.016);
      last = ts;
      if (g && canvas.isConnected) { update(dt); drawScene(); }
      raf = requestAnimationFrame(loop);
    }

    function renderBook() {
      notebook.innerHTML = '';
      const rows = ORDER.map((l) => el('tr', {}, el('th', {}, LEVELS[l].name),
        ...Object.keys(COLOURS).map((c) => {
          const r = book[l][c];
          return el('td', {}, r.tries ? `${r.escaped} / ${r.tries}` : '–');
        })));
      notebook.append(el('table', { class: 'log-table' },
        el('thead', {}, el('tr', {}, el('th', {}, 'Where'), ...Object.keys(COLOURS).map((c) => el('th', {}, `${COLOURS[c].icon} ${c}`)))),
        el('tbody', {}, rows)));
    }

    /* ---------- input ---------- */
    function onKey(e) {
      if (!canvas.isConnected) return;
      const tag = (e.target && e.target.tagName) || '';
      if (/INPUT|SELECT|TEXTAREA/.test(tag)) return;
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'a', 'd', 'w', 's'].includes(k)) return;
      if (/^Arrow/.test(k)) e.preventDefault();
      keys[k] = e.type === 'keydown';
    }
    function pointer(e) {
      const r = canvas.getBoundingClientRect();
      target = [((e.clientX - r.left) / r.width) * W + cam.x, ((e.clientY - r.top) / r.height) * H + cam.y];
      if (g && (g.state === 'won' || g.state === 'caught')) { newRun(); target = null; }
    }
    canvas.addEventListener('pointerdown', (e) => { canvas.focus({ preventScroll: true }); pointer(e); canvas._down = true; });
    canvas.addEventListener('pointermove', (e) => { if (canvas._down) pointer(e); });
    window.addEventListener('pointerup', () => { canvas._down = false; });
    window.addEventListener('keydown', onKey);
    window.addEventListener('keyup', onKey);

    const againBtn = el('button', { class: 'btn btn-aqua btn-big', onclick: () => { ER.sfx.tap(); newRun(); canvas.focus({ preventScroll: true }); } }, '↻ Play again');

    const legend = el('div', { class: 'chart-legend' },
      el('span', {}, '⚪ white fur hides in ❄️ snow drifts'),
      el('span', {}, '🟤 brown fur hides in 🌿 leaf piles'),
      el('span', {}, '🔘 grey fur hides among ⛰️ rocks'));

    const sim = el('div', { class: 'card sim-card' },
      el('h4', {}, '🎮 Cross the field without being seen'),
      el('div', { class: 'controls-grid' }, levelC.node, colourC.node),
      info, canvas, legend,
      el('div', { class: 'row-center' }, againBtn),
      el('h4', { class: 'ref-sub' }, '📒 The wolf\'s field notebook (escapes / tries)'),
      notebook,
      el('p', { class: 'muted small' }, 'Every run is recorded. Look for the pattern: which colour escapes in which place?'));

    const quiz = ER.quizSeq([
      { q: 'Why can a WHITE bunny hide in a snow drift but a BROWN bunny cannot?',
        opts: ['White fur matches the snow, so wolves cannot see it', 'White bunnies simply run a lot faster than brown ones', 'Snow makes every bunny completely invisible', 'Wolves are scared of anything that is white'],
        a: 'White fur matches the snow, so wolves cannot see it' },
      { q: 'Why would brown fur become MORE common in a forest over many generations?',
        opts: ['Camouflaged brown bunnies survive and pass on brown fur', 'Bunnies choose to change their own colour to brown', 'The forest slowly paints the bunnies brown', 'Wolves prefer to eat only the white bunnies'],
        a: 'Camouflaged brown bunnies survive and pass on brown fur' },
      { q: 'The snow in a valley melts and becomes forest. What would you PREDICT about white bunnies there over many generations?',
        opts: ['They become less common because they now stand out', 'They become more common because they are special', 'Nothing changes because colour never matters', 'They all turn brown overnight to match the trees'],
        a: 'They become less common because they now stand out' },
    ], () => { done.c = true; check(); }, '🔮 Mission C: explain and predict');

    let check = () => { if (done.a && done.b && done.c) api.solve(); };

    const tabs = ER.missionTabs([
      { id: 'a', icon: '❄️', label: 'Snow and forest', goal: 'Get a bunny across the Snowfield and the Forest floor.', done: () => done.a, onSelect: () => { if (level === 'meadow') { level = 'snow'; levelC.set('snow'); newRun(); } } },
      { id: 'b', icon: '🌄', label: 'Mountain meadow', goal: 'Cross the big meadow once as white, once as brown and once as grey.', done: () => done.b, onSelect: () => { if (level !== 'meadow') { level = 'meadow'; levelC.set('meadow'); newRun(); } } },
      { id: 'c', icon: '🧠', label: 'Explain it', goal: 'Explain what the game showed you.', node: quiz, done: () => done.c },
    ]);
    check = ((orig) => () => { orig(); try { tabs.refresh(); } catch (e) { console.error(e); } })(check);
    body.append(el('p', { class: 'lead' }, '🐺 Hide from the wolves in spots that match your fur. Reach the burrow!'), tabs.tabs, sim, tabs.panel);

    if (ER.DEBUG) ER._bunnyGame = { // test hook (only with ?debug)
      update, newRun, get g() { return g; }, get level() { return level; }, get colour() { return colour; }, won, book, LEVELS,
      setLevel(l) { level = l; levelC.set(l); newRun(); }, setColour(c) { colour = c; colourC.set(c); newRun(); },
      setTarget(x, y) { target = [x, y]; },
      snapshot() { return { g: JSON.parse(JSON.stringify(g)), target: target && target.slice() }; },
      restore(s) { g = JSON.parse(JSON.stringify(s.g)); target = s.target && s.target.slice(); }, tune(o) { if (o.chase) WOLF_CHASE = o.chase; if (o.roam) WOLF_ROAM = o.roam; }, get constants() { return { SPEED, WOLF_CHASE, CATCH, goalX }; },
    };

    renderBook();
    progress();
    newRun();
    raf = requestAnimationFrame(loop);
    return () => {
      alive = false; cancelAnimationFrame(raf);
      window.removeEventListener('keydown', onKey); window.removeEventListener('keyup', onKey);
    };
  },
});
