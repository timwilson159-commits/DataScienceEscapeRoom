/* Storm Station: the room, movement, code log, mission timer, hint and reveal rules, scenes and modals. */
(function () {
  const { el, sfx } = ER;
  const W = 320, H = 224, S = 3;
  const HINT_PENALTY = 180;   // seconds added per hint (3 minutes)
  const REVEAL_PENALTY = 600; // seconds added for revealing a station's answers (10 minutes)
  const REVEAL_AFTER = 300;   // seconds a student must have spent on a station before answers can be revealed (5 minutes)

  const canvas = document.getElementById('room');
  const ctx = canvas.getContext('2d');
  const roomView = document.getElementById('room-view');
  const puzzleView = document.getElementById('puzzle-view');
  const promptEl = document.getElementById('prompt');
  const notesList = document.getElementById('notes-list');
  const hudCodes = document.getElementById('hud-codes');
  const hudTime = document.getElementById('hud-time');
  const hudTimer = document.getElementById('hud-timer');

  const state = {
    solved: [],
    timerOn: false,
    startTime: 0,
    elapsed: 0,
    penalty: 0,
    hintsUsed: 0,
    revealsUsed: 0,
    revealed: {},
    timeIn: {},
    escaped: false,
    current: null,
    cleanup: null,
  };

  // ---------- Modals ----------
  ER.modal = function ({ title, content, buttons = [], className = '', dismissable = true }) {
    const root = document.getElementById('modal-root');
    const box = el('div', { class: 'modal ' + className, role: 'dialog', 'aria-modal': 'true' });
    const overlay = el('div', { class: 'overlay' }, box);
    const onKey = (e) => { if (e.key === 'Escape' && dismissable) close(); };
    const close = () => {
      document.removeEventListener('keydown', onKey);
      overlay.classList.add('closing');
      setTimeout(() => overlay.remove(), 180);
    };
    if (title) box.append(el('h2', { class: 'modal-title' }, title));
    if (content) box.append(content.nodeType ? content : el('div', { html: content }));
    const row = el('div', { class: 'modal-buttons' });
    buttons.forEach((b) =>
      row.append(el('button', {
        class: 'btn ' + (b.class || ''),
        onclick: () => { if (b.close !== false) close(); if (b.onClick) b.onClick(); },
      }, b.label))
    );
    if (buttons.length) box.append(row);
    if (dismissable) overlay.addEventListener('pointerdown', (e) => { if (e.target === overlay) close(); });
    document.addEventListener('keydown', onKey);
    root.append(overlay);
    setTimeout(() => { const b = row.querySelector('button'); if (b) b.focus(); }, 60);
    return { close, box };
  };
  const modalOpen = () => !!document.querySelector('#modal-root .overlay:not(.closing)');

  // ---------- Layout of the station ----------
  const STATIONS = {
    footprint: { x: 48, y: 34, front: [64, 78] },
    hare: { x: 96, y: 34, front: [112, 78] },
    outbreak: { x: 208, y: 34, front: [224, 78] },
    bunny: { x: 256, y: 34, front: [250, 72] },
    popn: { x: 270, y: 76, front: [258, 94] },
    forecast: { x: 18, y: 140, front: [62, 158] },
    garden: { x: 18, y: 76, front: [62, 94] },
    market: { x: 270, y: 140, front: [258, 158] },
    museum: { x: 150, y: 172, front: [166, 166] },
  };
  const DOOR = { x: 136, y: 2, w: 48, h: 30, front: [160, 46] };
  const CONSOLE = { x: 140, y: 96, w: 40, h: 30, front: [160, 140] };
  const DECOR = [
    { type: 'crate', x: 20, y: 184, w: 26, h: 22 },
    { type: 'locker', x: 278, y: 180, w: 24, h: 26 },
    { type: 'lamp', x: 122, y: 36, w: 12, h: 14 },
    { type: 'lamp', x: 186, y: 36, w: 12, h: 14 },
  ];
  const SOLIDS = [
    ...Object.values(STATIONS).map((s) => ({ x: s.x, y: s.y, w: 32, h: 32 })),
    { x: CONSOLE.x, y: CONSOLE.y, w: CONSOLE.w, h: CONSOLE.h },
    ...DECOR,
  ];

  const player = { x: 160, y: 150, dir: 'down', moving: false, anim: 0, target: null, pendingOpen: null, stepT: 0 };

  function blocked(x, y) {
    const l = x - 5, r = x + 5, t = y - 6, b = y;
    if (l < 16 || r > 304 || t < 34 || b > 206) return true;
    for (const s of SOLIDS) {
      if (r > s.x && l < s.x + s.w && b > s.y && t < s.y + s.h) return true;
    }
    return false;
  }

  function rectDist(px, py, s, w = 32, h = 32) {
    const cx = Math.max(s.x, Math.min(px, s.x + w));
    const cy = Math.max(s.y, Math.min(py, s.y + h));
    return Math.hypot(px - cx, py - cy);
  }

  function nearest() {
    let best = null, bd = 1e9;
    for (const id in STATIONS) {
      const d = rectDist(player.x, player.y - 3, STATIONS[id]);
      if (d < 14 && d < bd) { bd = d; best = id; }
    }
    const dc = rectDist(player.x, player.y - 3, CONSOLE, CONSOLE.w, CONSOLE.h);
    if (dc < 14 && dc < bd) { bd = dc; best = 'console'; }
    const dd = Math.hypot(player.x - DOOR.front[0], player.y - DOOR.front[1]);
    if (dd < 18 && dd < bd) best = 'door';
    return best;
  }

  // ---------- Sprites ----------
  const PAL = { k: '#0b1020', h: '#6b4a2a', o: '#ff6b4a', m: '#8ff0ff', w: '#ffffff', s: '#f6c7a1', y: '#ffc233', Y: '#d99a00', b: '#1f3a6b', g: '#9aa7bd', c: '#22d3ee' };
  const TOP_DOWN = ['...kkkkkk...', '..khhhhhhk..', '.khhhhhhhhk.', '.kommmmmmok.', '.kmwmmmmwmk.', '.kssssssssk.', '..kssoossk..', '..kyyyyyyk..', '.kyycyycyyk.', 'kyyyyyyyyyyk', 'ksyyyYYyyysk', '.kkyyyyyykk.'];
  const TOP_UP = ['...kkkkkk...', '..khhhhhhk..', '.khhhhhhhhk.', '.kohhhhhhok.', '.khhhhhhhhk.', '.khhhhhhhhk.', '..kkhhhhkk..', '..kyggggyk..', '.kyyggggyyk.', 'kyyyggggyyyk', 'ksyyggggyysk', '.kkyyyyyykk.'];
  const TOP_SIDE = ['...kkkkkk...', '..khhhhhhk..', '.khhhhhhhhk.', '.khhoommmmk.', '.khhhsmwmmk.', '.khhssssssk.', '..khsssssok.', '..kkyyyyyk..', '..gkyycyyk..', '..gkyyysyk..', '..gkyyysyk..', '...kyyyyyk..'];
  const LEGS_A = ['..kbbkkbbk..', '..kbbkkbbk..', '.kbbbkkbbbk.', '.kkkkkkkkkk.'];
  const LEGS_B = ['..kbbkkbbk..', '..kbbkkbbk..', '.kbbbk.kbbk.', '.kkkkk.kkk..'];
  const SIDE_A = ['...kbbbbk...', '...kbbbbk...', '...kbbbbk...', '...kkkkkkk..'];
  const SIDE_B = ['...kbbbbk...', '..kbbkkbbk..', '.kbbk..kbbk.', '.kkk....kkk.'];
  const mirror = (rows) => rows.map((r) => r.split('').reverse().join(''));

  function makeSprite(rows) {
    const c = document.createElement('canvas');
    c.width = 12; c.height = 16;
    const x = c.getContext('2d');
    rows.forEach((r, j) => {
      for (let i = 0; i < 12; i++) {
        const ch = r[i];
        if (ch && ch !== '.') { x.fillStyle = PAL[ch]; x.fillRect(i, j, 1, 1); }
      }
    });
    return c;
  }
  const SPR = {
    down: [makeSprite([...TOP_DOWN, ...LEGS_A]), makeSprite([...TOP_DOWN, ...LEGS_B]), makeSprite([...TOP_DOWN, ...LEGS_A]), makeSprite([...TOP_DOWN, ...mirror(LEGS_B)])],
    up: [makeSprite([...TOP_UP, ...LEGS_A]), makeSprite([...TOP_UP, ...LEGS_B]), makeSprite([...TOP_UP, ...LEGS_A]), makeSprite([...TOP_UP, ...mirror(LEGS_B)])],
    right: [makeSprite([...TOP_SIDE, ...SIDE_A]), makeSprite([...TOP_SIDE, ...SIDE_B])],
    left: [makeSprite(mirror([...TOP_SIDE, ...SIDE_A])), makeSprite(mirror([...TOP_SIDE, ...SIDE_B]))],
  };

  // ---------- Drawing ----------
  const px = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), w, h); };
  const circle = (x, y, r, c) => { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); };

  function drawFloor(t) {
    px(16, 32, 288, 176, '#13233b');
    for (let ty = 2; ty < 13; ty++) {
      for (let tx = 1; tx < 19; tx++) {
        px(tx * 16, ty * 16, 15, 15, (tx + ty) % 2 ? '#183050' : '#142744');
      }
    }
    ctx.strokeStyle = 'rgba(255,194,51,0.14)';
    ctx.lineWidth = 0.5;
    for (let tx = 1; tx <= 19; tx++) { ctx.beginPath(); ctx.moveTo(tx * 16, 32); ctx.lineTo(tx * 16, 208); ctx.stroke(); }
    for (let ty = 2; ty <= 13; ty++) { ctx.beginPath(); ctx.moveTo(16, ty * 16); ctx.lineTo(304, ty * 16); ctx.stroke(); }
    for (let i = 0; i < 7; i++) {
      const a = 0.25 + 0.25 * Math.sin(t * 3 - i * 0.6);
      px(154, 40 + i * 8, 12, 3, `rgba(255,194,51,${a})`);
    }
    [[40, 116], [268, 118], [100, 150]].forEach(([x, y]) => {
      px(x, y, 18, 9, '#0d1729');
      for (let i = 0; i < 4; i++) px(x + 2 + i * 4, y + 2, 2, 5, '#1d3352');
    });
  }

  function drawWalls(t) {
    px(0, 0, W, 32, '#0a1224');
    px(0, 26, W, 6, '#060c18');
    for (let x = 0; x < W; x += 32) { px(x, 0, 1, 26, '#16223d'); circle(x + 4, 4, 1, '#2a3c63'); circle(x + 28, 4, 1, '#2a3c63'); }
    px(0, 32, 16, 176, '#0c1527');
    px(304, 32, 16, 176, '#0c1527');
    px(0, 208, W, 16, '#060c18');
    px(6, 32, 4, 176, '#ffc233');
    px(310, 32, 4, 176, '#22d3ee');
    for (let y = 48; y < 208; y += 40) { px(4, y, 8, 3, '#b8860b'); px(308, y, 8, 3, '#0e7f9b'); }
    for (let x = 0; x < W; x += 16) px(x, 212, 8, 3, '#1d3352');

    // storm windows: cloud, rain and the odd flash of lightning
    [[64, 14, 0], [256, 14, 40]].forEach(([cx, cy, off]) => {
      circle(cx, cy, 11, '#22354f');
      circle(cx, cy, 9, '#26374f');
      ctx.save();
      ctx.beginPath(); ctx.arc(cx, cy, 9, 0, Math.PI * 2); ctx.clip();
      const flash = Math.sin(t * 0.9 + off) > 0.985 ? 1 : 0;
      px(cx - 10, cy - 10, 20, 20, flash ? '#dfe9ff' : '#34455f');
      circle(cx - 4 + Math.sin(t * 0.4 + off) * 2, cy - 4, 5, flash ? '#ffffff' : '#1d2a40');
      circle(cx + 3 + Math.sin(t * 0.3 + off) * 2, cy - 3, 6, flash ? '#f1f5ff' : '#18243a');
      ctx.strokeStyle = 'rgba(160,210,255,0.85)'; ctx.lineWidth = 0.6;
      for (let i = 0; i < 7; i++) {
        const rx = cx - 8 + ((i * 5 + off) % 17), ry = cy - 9 + ((t * 40 + i * 9) % 20);
        ctx.beginPath(); ctx.moveTo(rx, ry); ctx.lineTo(rx - 1, ry + 3); ctx.stroke();
      }
      ctx.restore();
      circle(cx - 3, cy - 4, 2, 'rgba(255,255,255,0.25)');
    });

    // shelter hatch
    px(DOOR.x, DOOR.y, DOOR.w, DOOR.h, '#ffc233');
    for (let i = 0; i < 12; i += 2) { px(DOOR.x + i * 4, DOOR.y, 4, 3, '#0b1020'); px(DOOR.x + i * 4 + 4, DOOR.y + DOOR.h - 3, 4, 3, '#0b1020'); }
    px(DOOR.x + 4, DOOR.y + 4, DOOR.w - 8, DOOR.h - 7, '#26344f');
    const all = state.solved.length === ER.puzzles.length;
    const pulse = all ? 0.5 + 0.5 * Math.sin(t * 5) : 0;
    circle(160, 18, 11, all ? `rgb(${60 + pulse * 60},${200 + pulse * 55},${220 + pulse * 35})` : '#7c8aa8');
    circle(160, 18, 8, '#44557a');
    ctx.save();
    ctx.translate(160, 18);
    ctx.rotate(all ? t * 1.5 : 0);
    ctx.strokeStyle = '#cfe3ff'; ctx.lineWidth = 2;
    for (let i = 0; i < 3; i++) { ctx.rotate(Math.PI / 3); ctx.beginPath(); ctx.moveTo(-7, 0); ctx.lineTo(7, 0); ctx.stroke(); }
    ctx.restore();
    circle(160, 18, 2.5, all ? '#22d3ee' : '#ff4d6d');
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 5px Fredoka, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('SHELTER', 160, 31.5);

    const n = ER.puzzles.length;
    const lx = [88, 96, 104, 112, 120, 200, 208, 216, 224].slice(0, n);
    lx.forEach((x, i) => {
      const on = i < state.solved.length;
      if (on) circle(x, 12, 4, 'rgba(255,194,51,0.35)');
      circle(x, 12, 2.6, on ? '#ffc233' : '#3b4a6b');
      circle(x - 0.8, 11.2, 0.8, 'rgba(255,255,255,0.7)');
    });
  }

  function drawConsole(t) {
    const { x, y, w, h } = CONSOLE;
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(x + 2, y + h - 3, w - 4, 5);
    px(x, y + 8, w, h - 8, '#16263f');
    px(x, y + 8, w, 2, '#22405f');
    px(x + 3, y + 12, w - 6, h - 16, '#0a1526');
    const cx = x + w / 2, cy = y + 6;
    ctx.strokeStyle = `rgba(255,194,51,${0.5 + 0.2 * Math.sin(t * 2)})`;
    ctx.lineWidth = 0.8;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.ellipse(cx, cy, 10 - i * 2, 4 + i, t * 0.6 + i, 0, Math.PI * 2);
      ctx.stroke();
    }
    circle(cx, cy, 2.5, '#ffe08a');
    ctx.fillStyle = '#ffc233';
    ctx.font = 'bold 5px Fredoka, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('HANDBOOK', cx, y + h - 4);
    px(x + 5, y + h - 12, 6, 3, '#ff6b4a');
    px(x + w - 11, y + h - 12, 6, 3, '#22d3ee');
  }

  function drawDecor(d, t) {
    if (d.type === 'crate') {
      px(d.x, d.y + 6, d.w, d.h - 6, '#1d3352');
      px(d.x, d.y + 6, d.w, 2, '#2a4d7d');
      px(d.x + 2, d.y + 10, d.w - 4, 1, '#0f1c33');
      px(d.x + 4, d.y, 14, 8, '#ffc233');
      px(d.x + 6, d.y + 2, 10, 4, '#0a1526');
    } else if (d.type === 'locker') {
      px(d.x, d.y, d.w, d.h, '#1a2a44');
      px(d.x + d.w / 2, d.y, 1, d.h, '#0d1729');
      for (let i = 0; i < 3; i++) { px(d.x + 3, d.y + 4 + i * 3, 7, 1, '#2a4d7d'); px(d.x + 14, d.y + 4 + i * 3, 7, 1, '#2a4d7d'); }
      px(d.x + 9, d.y + 15, 2, 3, '#ffc233');
      px(d.x + 14, d.y + 15, 2, 3, '#ffc233');
    } else if (d.type === 'lamp') {
      px(d.x + 4, d.y, 4, 10, '#22354f');
      px(d.x + 1, d.y + 9, 10, 4, '#0d1729');
      const glow = 0.35 + 0.2 * Math.sin(t * 2 + d.x);
      ctx.fillStyle = `rgba(255,194,51,${glow})`;
      ctx.beginPath(); ctx.moveTo(d.x + 1, d.y + 13); ctx.lineTo(d.x + 11, d.y + 13); ctx.lineTo(d.x + 15, d.y + 26); ctx.lineTo(d.x - 3, d.y + 26); ctx.fill();
      px(d.x + 2, d.y + 11, 8, 2, '#ffe08a');
    }
  }

  const screen = (x, y, w, h, bg) => { px(x, y, w, h, '#0b1020'); px(x + 1, y + 1, w - 2, h - 2, bg || '#07213a'); };
  const base = (x, y) => { px(x + 1, y + 10, 30, 20, '#1b2a44'); px(x + 1, y + 10, 30, 2, '#2a4d7d'); };

  const STATION_ART = {
    footprint(x, y, t) {
      base(x, y);
      screen(x + 4, y + 2, 24, 11, '#04263a');
      [[8, 9], [12, 6], [16, 9], [20, 6], [24, 9]].forEach(([dx, dy], i) => { px(x + dx, y + dy, 2, 3, i % 2 ? '#ffc233' : '#22d3ee'); });
      px(x + 6, y + 16, 8, 2, '#22d3ee'); px(x + 6, y + 21, 12, 2, '#ffc233'); px(x + 6, y + 26, 6, 2, '#ff6b4a');
      if (Math.sin(t * 3) > 0.3) px(x + 24, y + 16, 3, 3, '#22c55e');
    },
    hare(x, y, t) {
      px(x + 1, y + 16, 30, 14, '#1f4a2f'); px(x + 1, y + 16, 30, 2, '#2f7a48');
      screen(x + 3, y + 2, 26, 13, '#04263a');
      ctx.strokeStyle = '#22d3ee'; ctx.lineWidth = 0.8;
      ctx.beginPath(); for (let i = 0; i < 22; i++) ctx.lineTo(x + 5 + i, y + 8 + Math.sin(i * 0.5 + t) * 3); ctx.stroke();
      ctx.strokeStyle = '#ff6b4a';
      ctx.beginPath(); for (let i = 0; i < 22; i++) ctx.lineTo(x + 5 + i, y + 8 + Math.sin(i * 0.5 + t - 1.2) * 2); ctx.stroke();
      circle(x + 10, y + 23, 3.5, '#f4f0e8'); px(x + 9, y + 17, 1, 4, '#f4f0e8'); px(x + 11, y + 17, 1, 4, '#f4f0e8');
      circle(x + 23, y + 23, 3.5, '#c98a4b'); px(x + 21, y + 19, 2, 2, '#c98a4b'); px(x + 24, y + 19, 2, 2, '#c98a4b');
    },
    outbreak(x, y, t) {
      px(x + 1, y + 10, 30, 20, '#1b2a44');
      circle(x + 16, y + 14, 12, '#e8f6ff'); circle(x + 16, y + 14, 10, '#1a3a52');
      for (let i = 0; i < 9; i++) {
        const a = i * 2.4 + t * 0.4, r = 3 + (i % 4) * 2;
        circle(x + 16 + Math.cos(a) * r, y + 14 + Math.sin(a) * r, 1.3, i % 3 === 0 ? '#ff4d6d' : i % 3 === 1 ? '#22c55e' : '#e8eefc');
      }
      px(x + 6, y + 27, 20, 3, '#22354f');
    },
    bunny(x, y, t) {
      px(x + 1, y + 6, 30, 24, '#e8f2ff'); px(x + 1, y + 6, 30, 2, '#ffffff');
      px(x + 1, y + 22, 30, 8, '#6d5a3f');
      circle(x + 11, y + 20, 5, '#ffffff'); px(x + 9, y + 11, 2, 6, '#ffffff'); px(x + 12, y + 11, 2, 6, '#ffffff');
      circle(x + 22, y + 24, 3.5, '#7a4a22'); px(x + 20, y + 18, 1, 3, '#7a4a22'); px(x + 23, y + 18, 1, 3, '#7a4a22');
      px(x + 11, y + 19, 1, 1, '#ff6b4a'); px(x + 25, y + 8, 4, 4, '#9aa7bd');
      if (Math.sin(t * 2) > 0.5) px(x + 4, y + 9, 2, 2, '#9aa7bd');
    },
    popn(x, y, t) {
      px(x + 1, y + 16, 30, 14, '#2a3a2a'); px(x + 1, y + 16, 30, 2, '#3a6a3a');
      [[3, 8], [12, 5], [21, 9]].forEach(([dx, dy], i) => {
        px(x + dx, y + dy + 6, 8, 8, i === 1 ? '#ff6b4a' : '#c3d0e8');
        ctx.fillStyle = '#7a3a2a'; ctx.beginPath(); ctx.moveTo(x + dx - 1, y + dy + 6); ctx.lineTo(x + dx + 4, y + dy + 1); ctx.lineTo(x + dx + 9, y + dy + 6); ctx.fill();
        px(x + dx + 3, y + dy + 9, 2, 5, '#0b1020');
      });
      const k = Math.floor(t * 2) % 4;
      for (let i = 0; i <= k; i++) px(x + 5 + i * 5, y + 26 - i * 2, 3, 2 + i * 2, '#ffc233');
    },
    forecast(x, y, t) {
      px(x + 1, y + 10, 30, 20, '#1b2a44');
      screen(x + 3, y + 2, 26, 22, '#03263a');
      ctx.save(); ctx.translate(x + 16, y + 13); ctx.rotate(t * 1.4);
      ctx.strokeStyle = '#7fe7ff'; ctx.lineWidth = 1.4;
      for (let k = 0; k < 3; k++) { ctx.rotate(Math.PI * 2 / 3); ctx.beginPath(); ctx.arc(4, 0, 4 + k, -1, 1.4); ctx.stroke(); }
      ctx.restore();
      circle(x + 16, y + 13, 1.6, '#ffc233');
      px(x + 6, y + 26, 20, 3, '#22354f');
    },
    garden(x, y, t) {
      px(x + 2, y + 24, 28, 6, '#2b3a55'); px(x + 4, y + 22, 24, 3, '#44557a');
      px(x + 14, y + 10, 5, 12, '#cfd8ea'); px(x + 15, y + 6, 3, 4, '#ff6b4a'); px(x + 13, y + 20, 7, 2, '#ffc233');
      px(x + 11, y + 16, 3, 6, '#ff6b4a'); px(x + 19, y + 16, 3, 6, '#ff6b4a');
      circle(x + 16, y + 14, 1.6, '#22d3ee');
      if (Math.sin(t * 5) > 0) px(x + 15, y + 23, 3, 3, '#ffc233');
      px(x + 24, y + 6, 1, 1, '#ffffff'); px(x + 6, y + 10, 1, 1, '#ffffff');
    },
    market(x, y, t) {
      px(x + 2, y + 14, 28, 16, '#3a2a55');
      for (let i = 0; i < 7; i++) px(x + 1 + i * 4, y + 4, 4, 9, i % 2 ? '#ff6b4a' : '#ffffff');
      px(x + 1, y + 13, 30, 2, '#0b1020');
      circle(x + 10, y + 21, 4, '#b36bff'); circle(x + 10, y + 21, 2, '#e6c4ff');
      px(x + 18, y + 18, 9, 8, '#e8eefc'); px(x + 20, y + 20, 5, 1, '#33456b'); px(x + 20, y + 22, 5, 1, '#33456b');
      if (Math.sin(t * 4) > 0.5) px(x + 8, y + 17, 1, 1, '#ffffff');
    },
    museum(x, y, t) {
      px(x + 1, y + 12, 30, 18, '#2a3a55'); px(x + 1, y + 12, 30, 2, '#5b78a8');
      px(x + 3, y + 4, 26, 9, '#cfe0f5'); px(x + 3, y + 3, 26, 2, '#8fa6cc');
      circle(x + 10, y + 21, 4, '#2fa05a'); circle(x + 9, y + 20, 2, '#1d5fb0');
      px(x + 17, y + 17, 4, 8, '#ffc233'); px(x + 22, y + 19, 6, 6, '#22d3ee');
      px(x + 5, y + 6, 3, 6, '#7c5cff'); px(x + 12, y + 6, 3, 6, '#7c5cff'); px(x + 20, y + 6, 3, 6, '#7c5cff');
    },
  };

  function drawStation(id, s, t, isNear) {
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(s.x + 2, s.y + 29, 28, 4);
    STATION_ART[id](s.x, s.y, t);
    if (isNear) {
      ctx.strokeStyle = `rgba(255,194,51,${0.6 + 0.4 * Math.sin(t * 8)})`;
      ctx.lineWidth = 1.2;
      ctx.strokeRect(s.x - 1, s.y - 1, 34, 34);
    }
  }

  function drawIcons(t, near) {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ER.puzzles.forEach((def, i) => {
      const s = STATIONS[def.id];
      if (!s) return;
      const bob = Math.sin(t * 2.4 + i) * 1.5;
      const cx = s.x + 16, cy = s.y - 5 + bob;
      const solved = state.solved.includes(def.id);
      circle(cx, cy, 6.5, solved ? '#22d3ee' : near === def.id ? '#ffc233' : '#e8eefc');
      ctx.strokeStyle = '#0b1020'; ctx.lineWidth = 0.8;
      ctx.beginPath(); ctx.arc(cx, cy, 6.5, 0, Math.PI * 2); ctx.stroke();
      ctx.font = '7px "Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif';
      ctx.fillStyle = '#000';
      ctx.fillText(solved ? '✅' : def.icon, cx, cy + 0.5);
    });
    const cbob = Math.sin(t * 2) * 1.2;
    const ccx = CONSOLE.x + CONSOLE.w / 2, ccy = CONSOLE.y - 6 + cbob;
    circle(ccx, ccy, 6.5, near === 'console' ? '#ffc233' : '#e8eefc');
    ctx.strokeStyle = '#0b1020'; ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.arc(ccx, ccy, 6.5, 0, Math.PI * 2); ctx.stroke();
    ctx.font = '7px "Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif';
    ctx.fillStyle = '#000';
    ctx.fillText('📖', ccx, ccy + 0.5);
    ctx.textBaseline = 'alphabetic';
  }

  function drawPlayer() {
    const p = player;
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath(); ctx.ellipse(p.x, p.y, 5, 2, 0, 0, Math.PI * 2); ctx.fill();
    const frames = SPR[p.dir];
    const f = p.moving ? Math.floor(p.anim * 8) % frames.length : 0;
    ctx.drawImage(frames[f], Math.round(p.x - 6), Math.round(p.y - 16));
  }

  function draw(t) {
    ctx.setTransform(S, 0, 0, S, 0, 0);
    ctx.imageSmoothingEnabled = false;
    const near = nearest();
    drawFloor(t);
    drawWalls(t);
    const ents = [];
    Object.entries(STATIONS).forEach(([id, s]) => ents.push({ y: s.y + 32, fn: () => drawStation(id, s, t, near === id) }));
    DECOR.forEach((d) => ents.push({ y: d.y + d.h, fn: () => drawDecor(d, t) }));
    ents.push({ y: CONSOLE.y + CONSOLE.h, fn: () => drawConsole(t) });
    ents.push({ y: player.y, fn: drawPlayer });
    ents.sort((a, b) => a.y - b.y).forEach((e) => e.fn());
    if (near === 'console') {
      ctx.strokeStyle = `rgba(255,194,51,${0.6 + 0.4 * Math.sin(t * 8)})`;
      ctx.lineWidth = 1.2;
      ctx.strokeRect(CONSOLE.x - 1, CONSOLE.y - 1, CONSOLE.w + 2, CONSOLE.h + 2);
    }
    if (near === 'door') {
      ctx.strokeStyle = `rgba(255,255,255,${0.6 + 0.4 * Math.sin(t * 8)})`;
      ctx.lineWidth = 1.2;
      ctx.strokeRect(DOOR.x - 1, DOOR.y - 1, DOOR.w + 2, DOOR.h + 2);
    }
    drawIcons(t, near);
    updatePrompt(near);
  }

  // ---------- Prompt ----------
  let lastPrompt = undefined;
  function updatePrompt(near) {
    if (near === lastPrompt) return;
    lastPrompt = near;
    promptEl.innerHTML = '';
    if (!near) { promptEl.hidden = true; return; }
    let icon = '📖', title = 'Handbook console';
    if (near !== 'console') {
      const def = near === 'door' ? ER.door : ER.get(near);
      icon = def.icon;
      title = (state.solved.includes(near) ? 'Replay ' : 'Open ') + def.title;
    }
    promptEl.append(
      el('button', { class: 'btn btn-sun prompt-btn', onclick: () => openScene(near) },
        el('span', { class: 'prompt-icon' }, icon),
        el('span', {}, title),
        el('kbd', {}, 'E'))
    );
    promptEl.hidden = false;
  }

  // ---------- Input ----------
  const held = new Set();
  const roomActive = () => !roomView.hidden && !modalOpen();
  const isTyping = (e) => e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement;

  window.addEventListener('keydown', (e) => {
    if (!roomActive() || isTyping(e)) return;
    const k = e.key.toLowerCase();
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'w', 'a', 's', 'd'].includes(k)) {
      held.add(k);
      player.target = null;
      player.pendingOpen = null;
      e.preventDefault();
    } else if (k === 'e' || ((k === ' ' || k === 'enter') && (e.target === document.body || e.target === canvas))) {
      const n = nearest();
      if (n) { e.preventDefault(); openScene(n); }
    }
  });
  window.addEventListener('keyup', (e) => held.delete(e.key.toLowerCase()));
  window.addEventListener('blur', () => held.clear());

  canvas.addEventListener('pointerdown', (e) => {
    if (!roomActive()) return;
    sfx.unlock();
    const r = canvas.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * W;
    const y = ((e.clientY - r.top) / r.height) * H;
    for (const id in STATIONS) {
      const s = STATIONS[id];
      if (x >= s.x - 2 && x <= s.x + 34 && y >= s.y - 14 && y <= s.y + 34) {
        if (nearest() === id) { openScene(id); return; }
        player.target = s.front.slice();
        player.pendingOpen = id;
        return;
      }
    }
    if (x >= CONSOLE.x - 2 && x <= CONSOLE.x + CONSOLE.w + 2 && y >= CONSOLE.y - 14 && y <= CONSOLE.y + CONSOLE.h + 2) {
      if (nearest() === 'console') { openScene('console'); return; }
      player.target = CONSOLE.front.slice();
      player.pendingOpen = 'console';
      return;
    }
    if (x >= DOOR.x && x <= DOOR.x + DOOR.w && y <= DOOR.y + DOOR.h + 6) {
      if (nearest() === 'door') { openScene('door'); return; }
      player.target = DOOR.front.slice();
      player.pendingOpen = 'door';
      return;
    }
    player.target = [x, y];
    player.pendingOpen = null;
  });

  // ---------- Update loop ----------
  function update(dt) {
    let vx = 0, vy = 0;
    if (held.has('arrowleft') || held.has('a')) vx -= 1;
    if (held.has('arrowright') || held.has('d')) vx += 1;
    if (held.has('arrowup') || held.has('w')) vy -= 1;
    if (held.has('arrowdown') || held.has('s')) vy += 1;
    const speed = 68;
    let arrived = false;
    if (!vx && !vy && player.target) {
      const dx = player.target[0] - player.x, dy = player.target[1] - player.y;
      const d = Math.hypot(dx, dy);
      if (d < 1.5) { arrived = true; }
      else { vx = dx / d; vy = dy / d; }
      if (d < speed * dt) { vx *= d / (speed * dt); vy *= d / (speed * dt); }
    } else if (vx && vy) { vx *= 0.7071; vy *= 0.7071; }

    let moved = false;
    if (vx || vy) {
      const mx = vx * speed * dt, my = vy * speed * dt;
      if (mx && !blocked(player.x + mx, player.y)) { player.x += mx; moved = true; }
      if (my && !blocked(player.x, player.y + my)) { player.y += my; moved = true; }
      if (Math.abs(vx) > Math.abs(vy)) player.dir = vx > 0 ? 'right' : 'left';
      else player.dir = vy > 0 ? 'down' : 'up';
      if (!moved && player.target) arrived = true;
    }
    player.moving = moved;
    if (moved) {
      player.anim += dt;
      player.stepT += dt;
      if (player.stepT > 0.28) { player.stepT = 0; sfx.step(); }
    }
    if (arrived) {
      const pend = player.pendingOpen;
      player.target = null;
      player.pendingOpen = null;
      if (pend && nearest() === pend) openScene(pend);
    }
  }

  const fmtTime = (s) => {
    s = Math.max(0, Math.floor(s));
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
    return (h ? h + ':' : '') + String(m).padStart(2, '0') + ':' + String(sec).padStart(2, '0');
  };

  let last = performance.now();
  let revealTick = null; // set by an open scene, refreshes the reveal button countdown
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (!roomView.hidden) {
      if (!modalOpen()) update(dt);
      draw(now / 1000);
    }
    requestAnimationFrame(frame);
  }

  // The mission clock and the per-station stopwatch run on a plain interval (not the draw loop),
  // so they keep correct time whatever the frame rate.
  // performance.now() is monotonic, so changing the computer's clock cannot speed up, slow down or rewind the timer.
  const nowS = () => performance.now() / 1000;
  let lastTick = nowS();
  setInterval(() => {
    const now = nowS();
    const dt = Math.max(0, Math.min(2, now - lastTick));
    lastTick = now;
    if (state.timerOn) {
      state.elapsed = now - state.startTime;
      const txt = fmtTime(state.elapsed + state.penalty);
      if (hudTime.textContent !== txt) hudTime.textContent = txt;
      // time spent on this station counts towards unlocking the answer reveal
      if (state.current && document.visibilityState === 'visible') {
        state.timeIn[state.current] = (state.timeIn[state.current] || 0) + dt;
        if (revealTick) revealTick();
      }
    }
  }, 250);

  // ---------- Code log ----------
  function renderNotes(newId) {
    notesList.innerHTML = '';
    ER.puzzles.forEach((def) => {
      const solved = state.solved.includes(def.id);
      notesList.append(el('li', { class: 'note' + (solved ? ' solved' : '') + (def.id === newId ? ' new' : '') },
        el('span', { class: 'note-icon' }, def.icon),
        el('div', { class: 'note-text' },
          el('b', {}, def.title),
          solved ? null : el('span', { class: 'note-missing' }, 'Code not found yet')),
        solved ? ER.codeTile(def.code) : el('span', { class: 'code-tiles empty' }, el('span', { class: 'tile' }, '?'), el('span', { class: 'tile' }, '?'))));
    });
    hudCodes.textContent = `${state.solved.length} / ${ER.puzzles.length}`;
  }

  function penaltyFlash(text) {
    hudTimer.classList.remove('penalty');
    void hudTimer.offsetWidth;
    hudTimer.classList.add('penalty');
    const pop = el('div', { class: 'penalty-pop' }, text);
    document.body.append(pop);
    setTimeout(() => pop.remove(), 2600);
  }

  // ---------- Scenes ----------
  function openScene(id) {
    if (modalOpen()) return;
    if (id === 'console') {
      sfx.open();
      ER.modal({
        title: '📖 Handbook console',
        content: el('div', {},
          el('p', {}, 'Storm Station\'s reference computer. Open either file as often as you like. Reading it is free: hints and revealed answers are what cost you time.'),
          el('div', { class: 'row-center' },
            el('button', { class: 'btn btn-aqua btn-big', onclick: () => ER.reference.handbook() }, '📖 Model handbook'),
            el('button', { class: 'btn btn-sun btn-big', onclick: () => ER.reference.science() }, '🔬 Science or not?'))),
        className: 'ref-modal',
        buttons: [{ label: 'Close', class: 'btn-light' }],
      });
      return;
    }
    const def = id === 'door' ? ER.door : ER.get(id);
    if (!def) return;
    sfx.unlock();
    sfx.open();
    held.clear();
    player.target = null;
    player.pendingOpen = null;
    state.current = id;
    roomView.hidden = true;
    puzzleView.hidden = false;
    puzzleView.innerHTML = '';

    // ----- hints (+3 minutes) -----
    const hintBox = el('div', { class: 'hint-box', hidden: true });
    let shown = 0;
    const hints = def.hints || [];
    const hintBtn = el('button', { class: 'btn btn-sun' }, '💡 Hint (+3 min)');
    hintBtn.addEventListener('click', () => {
      if (shown >= hints.length || modalOpen()) return;
      ER.modal({
        title: '⏱️ A hint costs 3 minutes',
        content: el('p', {}, 'Taking a hint adds ', el('b', {}, '3 minutes'), ' to your escape time. Are you sure you want it?'),
        buttons: [
          { label: 'Yes, show the hint', class: 'btn-sun btn-big', onClick: takeHint },
          { label: 'No, I\'ll keep thinking', class: 'btn-light' },
        ],
      });
    });
    function takeHint() {
      if (shown >= hints.length) return;
      sfx.hint();
      state.penalty += HINT_PENALTY;
      state.hintsUsed++;
      penaltyFlash('⏱️ +3:00 hint penalty');
      hintBox.hidden = false;
      hintBox.append(el('div', { class: 'hint' }, el('b', {}, 'Hint ' + (shown + 1) + ': '), hints[shown]));
      shown++;
      const left = hints.length - shown;
      hintBtn.textContent = left ? '💡 Another hint (+3 min)' : '💡 No more hints';
      hintBtn.disabled = !left;
    }

    // ----- answer reveal (unlocks after 5 minutes on this station, costs 10 minutes) -----
    const answerBox = el('div', { class: 'answer-box', hidden: true });
    const revealBtn = el('button', { class: 'btn btn-coral' }, '🔑 Reveal answers');
    const canReveal = () => (state.timeIn[id] || 0) >= REVEAL_AFTER;
    const refreshReveal = () => {
      if (state.revealed[id]) { revealBtn.textContent = '🔑 Show answers again'; revealBtn.disabled = false; return; }
      if (canReveal()) { revealBtn.textContent = '🔑 Reveal answers (+10 min)'; revealBtn.disabled = false; }
      else { revealBtn.textContent = `🔒 Answers unlock in ${fmtTime(REVEAL_AFTER - (state.timeIn[id] || 0) + 0.99)}`; revealBtn.disabled = true; }
    };
    revealTick = () => { if (!revealBtn.disabled && !state.revealed[id]) return; refreshReveal(); };
    function showAnswers() {
      answerBox.hidden = false;
      answerBox.innerHTML = '';
      answerBox.append(el('b', {}, '🔑 Answer key for this station'), def.answerKey ? def.answerKey() : el('p', {}, 'No key for this station.'));
      answerBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
    revealBtn.addEventListener('click', () => {
      if (state.revealed[id]) { showAnswers(); return; }
      if (!canReveal() || modalOpen()) return;
      ER.modal({
        title: '🔑 Reveal the answers?',
        content: el('p', {}, 'This shows the answers for this station and adds ', el('b', {}, '10 minutes'), ' to your escape time. You will still need to enter them yourself. Only do this if you are truly stuck.'),
        buttons: [
          { label: 'Yes, reveal (+10 min)', class: 'btn-coral btn-big', onClick: () => {
            if (state.revealed[id]) return;
            sfx.hint();
            state.penalty += REVEAL_PENALTY;
            state.revealsUsed++;
            state.revealed[id] = true;
            penaltyFlash('⏱️ +10:00 answers revealed');
            refreshReveal();
            showAnswers();
          } },
          { label: 'No, keep trying', class: 'btn-light' },
        ],
      });
    });
    refreshReveal();
    const showReveal = id !== 'door' && !state.solved.includes(id) && def.answerKey;

    const head = el('header', { class: 'scene-head' },
      el('button', { class: 'btn btn-back', onclick: closeScene }, '⬅ Back to station'),
      el('div', { class: 'scene-title' },
        el('span', { class: 'scene-icon' }, def.icon),
        el('div', {}, el('h2', {}, def.title), el('p', {}, def.tagline))),
      el('div', { class: 'tools' }, ...ER.reference.buttons(), hintBtn, showReveal ? revealBtn : null));

    const banner = state.solved.includes(id) && id !== 'door'
      ? el('div', { class: 'solved-banner' }, el('span', {}, '✅ Already solved! Your code is in the log:'), ER.codeTile(def.code))
      : null;
    const body = el('div', { class: 'scene-body' });
    const scene = el('div', { class: 'scene kind-' + def.kind }, head, hintBox, answerBox, banner, body);
    puzzleView.append(scene);
    window.scrollTo({ top: 0, behavior: 'smooth' });

    const api = {
      sfx,
      alreadySolved: state.solved.includes(id),
      solve: () => solvePuzzle(def),
      codes: () => state.solved.map((sid) => ER.get(sid)),
      missing: () => ER.puzzles.filter((p) => !state.solved.includes(p.id)),
      allDone: state.solved.length === ER.puzzles.length,
      escape: showEscape,
    };
    try {
      state.cleanup = def.build(body, api) || null;
    } catch (err) {
      console.error(err);
      body.append(el('p', { class: 'feedback bad' }, 'Oops, this station had a problem loading. Go back and try again.'));
    }
  }

  function closeScene() {
    if (state.cleanup) { try { state.cleanup(); } catch (e) { console.error(e); } }
    state.cleanup = null;
    state.current = null;
    revealTick = null;
    puzzleView.hidden = true;
    puzzleView.innerHTML = '';
    roomView.hidden = false;
    lastPrompt = undefined;
    sfx.back();
    canvas.focus();
  }
  ER.closeScene = closeScene;

  function solvePuzzle(def) {
    if (state.solved.includes(def.id)) return;
    state.solved.push(def.id);
    renderNotes(def.id);
    sfx.solve();
    setTimeout(() => {
      const content = el('div', { class: 'reward' },
        el('div', { class: 'reward-burst' }, '🎉'),
        el('p', { class: 'reward-lead' }, 'Station complete. This coded letter has been added to your Code Log.'),
        el('div', { class: 'reward-tiles' }, ER.codeTile(def.code)),
        def.fact ? el('div', { class: 'fact-card' }, el('b', {}, '🔭 Science note: '), def.fact) : null,
        el('p', { class: 'muted small' }, state.solved.length === ER.puzzles.length
          ? '🚪 That is all the codes. Head to the SHELTER HATCH at the top of the station.'
          : `${state.solved.length} of ${ER.puzzles.length} codes found.`));
      ER.modal({
        title: `${def.icon} ${def.title} solved!`,
        content,
        className: 'reward-modal',
        buttons: [
          { label: '⬅ Back to the station', class: 'btn-aqua btn-big', onClick: closeScene },
          { label: 'Stay here', class: 'btn-light' },
        ],
      });
    }, 650);
  }

  function showEscape() {
    if (state.timerOn) state.elapsed = nowS() - state.startTime;
    state.escaped = true;
    state.timerOn = false;
    sfx.escape();
    const confetti = el('div', { class: 'confetti', 'aria-hidden': 'true' });
    const colors = ['#22d3ee', '#ffc233', '#ff6b4a', '#7c5cff', '#22c55e', '#ffffff'];
    for (let i = 0; i < 70; i++) {
      confetti.append(el('i', { style: {
        left: Math.random() * 100 + '%',
        background: colors[i % colors.length],
        animationDelay: Math.random() * 2.5 + 's',
        animationDuration: 2.5 + Math.random() * 2 + 's',
        transform: `rotate(${Math.random() * 360}deg)`,
      } }));
    }
    const extras = [];
    if (state.hintsUsed) extras.push(`${state.hintsUsed} hint${state.hintsUsed === 1 ? '' : 's'}`);
    if (state.revealsUsed) extras.push(`${state.revealsUsed} answer reveal${state.revealsUsed === 1 ? '' : 's'}`);
    const content = el('div', { class: 'escape-content' },
      confetti,
      el('h2', { class: 'escape-title' }, 'SHELTER OPEN!'),
      el('p', { class: 'escape-time' }, `⏱️ Escape time: ${fmtTime(state.elapsed + state.penalty)}`),
      el('p', { class: 'muted small' }, extras.length
        ? `(${fmtTime(state.elapsed)} of work, plus ${extras.join(' and ')} = +${fmtTime(state.penalty)})`
        : 'No hints and no revealed answers. Outstanding.'),
      el('div', { class: 'answer-word' }, ...'SIMULATOR'.split('').map((c) => el('span', {}, c))),
      el('div', { class: 'fact-card' },
        el('b', {}, '🌀 You ARE the SIMULATOR: '),
        'You ran models of predators, outbreaks, bunnies, towns, plants and storms. Scientists do exactly this when real experiments are too big, too slow or too dangerous. And you checked every model against its limits, which is what makes a good data scientist.'),
      el('p', { class: 'muted' }, 'You used data, ran models, spotted patterns, made predictions and cracked the code. Show your teacher this screen!'));
    ER.modal({
      content,
      className: 'escape-modal',
      dismissable: false,
      buttons: [
        { label: '🏠 Back to the station', class: 'btn-light', onClick: closeScene },
        { label: '🔁 Play again', class: 'btn-sun btn-big', onClick: () => location.reload() },
      ],
    });
  }

  // ---------- Intro / help ----------
  function showIntro(first) {
    const content = el('div', { class: 'intro' },
      el('p', { class: 'intro-story' },
        'You are on ', el('b', {}, 'Storm Station'), ', a remote research outpost. ', el('b', {}, 'Cyclone Tilly'),
        ' is closing in, the power has failed and the ', el('b', {}, 'shelter hatch'), ' is locked. The station computers only trust people who can use ',
        el('b', {}, 'data'), ' and ', el('b', {}, 'models'), ' sensibly. Run the simulations, spot the patterns, and get out before landfall.'),
      el('ul', { class: 'intro-steps' },
        el('li', {}, el('span', {}, '🚶'), el('div', {}, el('b', {}, 'Explore. '), 'Walk with ', el('kbd', {}, 'WASD'), ' or the ', el('kbd', {}, 'arrow keys'), ', or click where you want to go.')),
        el('li', {}, el('span', {}, '🧩'), el('div', {}, el('b', {}, 'Play 9 stations. '), 'Walk up to a glowing station and press ', el('kbd', {}, 'E'), ' or click it. Any order. Most are simulations: play with them first!')),
        el('li', {}, el('span', {}, '🔠'), el('div', {}, el('b', {}, 'Collect coded letters. '), 'Each station gives a coded letter and a number. They are logged for you.')),
        el('li', {}, el('span', {}, '📖'), el('div', {}, el('b', {}, 'Use the handbook. '), 'In the middle of the station and on the top buttons: what the key words mean, and how to tell science from pseudoscience. Free, any time.')),
        el('li', {}, el('span', {}, '⏱️'), el('div', {}, el('b', {}, 'The clock is running. '), 'A hint adds ', el('b', {}, '3 minutes'), '. Answers can only be revealed after 5 minutes on a station, and add ', el('b', {}, '10 minutes'), '. Wrong answers never tell you which part was wrong.')),
        el('li', {}, el('span', {}, '🚪'), el('div', {}, el('b', {}, 'Escape. '), 'At the shelter hatch, pass two model checks and decode your letters.'))),
      el('div', { class: 'row-center' },
        el('button', { class: 'btn btn-aqua', onclick: () => ER.reference.handbook() }, '📖 Read the model handbook'),
        el('button', { class: 'btn btn-aqua', onclick: () => ER.reference.science() }, '🔬 Science or not?')),
      el('p', { class: 'muted small' }, '⚠️ Progress is only kept while this page is open, so don\'t refresh or close the tab.'));
    ER.modal({
      title: first ? '🌀 Welcome to Storm Station' : '❓ How to play',
      content,
      className: 'intro-modal',
      dismissable: !first,
      buttons: [{
        label: first ? '🔧 Start the clock' : 'Got it!',
        class: 'btn-sun btn-big',
        onClick: () => {
          sfx.unlock();
          if (!state.timerOn && !state.escaped) { state.timerOn = true; state.startTime = nowS() - state.elapsed; }
          canvas.focus();
        },
      }],
    });
  }

  // ---------- Top bar ----------
  const soundBtn = document.getElementById('btn-sound');
  soundBtn.addEventListener('click', () => {
    sfx.setMuted(!sfx.muted);
    soundBtn.textContent = sfx.muted ? '🔇' : '🔊';
    if (!sfx.muted) sfx.tap();
  });
  document.getElementById('btn-help').addEventListener('click', () => showIntro(false));
  document.getElementById('btn-handbook').addEventListener('click', () => ER.reference.handbook());
  document.getElementById('btn-science').addEventListener('click', () => ER.reference.science());

  window.addEventListener('beforeunload', (e) => {
    if (state.solved.length && !state.escaped) { e.preventDefault(); e.returnValue = ''; }
  });

  const rain = document.getElementById('bubbles');
  for (let i = 0; i < 50; i++) {
    rain.append(el('span', { style: {
      left: Math.random() * 100 + '%',
      width: '2px', height: (8 + Math.random() * 14) + 'px',
      opacity: 0.15 + Math.random() * 0.35,
      animationDuration: 0.8 + Math.random() * 1.4 + 's',
      animationDelay: -Math.random() * 3 + 's',
    } }));
  }

  canvas.tabIndex = 0;
  renderNotes();
  requestAnimationFrame(frame);
  showIntro(true);

  ER.DEBUG = location.search.indexOf('debug') !== -1; // test hooks only exist with ?debug in the address
  if (ER.DEBUG) ER._debug = {
    state,
    solveAll() { ER.puzzles.forEach((p) => { if (!state.solved.includes(p.id)) state.solved.push(p.id); }); renderNotes(); },
    open: openScene,
    player,
    step(seconds) { for (let t = 0; t < seconds; t += 0.02) update(0.02); },
    redraw(t) { draw(t || 1); },
  };
})();
