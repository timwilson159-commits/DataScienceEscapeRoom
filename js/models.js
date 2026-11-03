/* The simple computer models behind the stations. All deterministic, so the "answers" the stations ask for
   are worked out by running the very same model the student is looking at. */
(function () {
  const M = (ER.models = {});

  /* ---------- Hare and lynx (Lotka-Volterra, rate per year) ---------- */
  M.hare = function (h0, l0, years = 40, growth = 0.6) {
    const a = 0.03, c = 0.005, d = 0.5, dt = 0.05;
    let h = h0, l = l0;
    const H = [[0, h]], L = [[0, l]];
    const f = (h, l) => [growth * h - a * h * l, c * h * l - d * l];
    const steps = Math.round(years / dt);
    for (let i = 1; i <= steps; i++) {
      const k1 = f(h, l);
      const k2 = f(h + k1[0] * dt / 2, l + k1[1] * dt / 2);
      const k3 = f(h + k2[0] * dt / 2, l + k2[1] * dt / 2);
      const k4 = f(h + k3[0] * dt, l + k3[1] * dt);
      h = Math.max(0, h + (dt / 6) * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]));
      l = Math.max(0, l + (dt / 6) * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1]));
      if (i % 10 === 0) { H.push([i * dt, h]); L.push([i * dt, l]); }
    }
    return { H, L };
  };
  // first local maximum of a series of [x,y]
  M.firstPeak = function (pts) {
    for (let i = 1; i < pts.length - 1; i++) if (pts[i][1] >= pts[i - 1][1] && pts[i][1] > pts[i + 1][1]) return pts[i];
    return pts[pts.length - 1];
  };
  M.minOf = (pts) => Math.min(...pts.map((p) => p[1]));

  /* ---------- Outbreak (SIR) ---------- */
  M.DISEASES = {
    cold: { name: 'Common cold', beta: 0.35 },
    flu: { name: 'Seasonal flu', beta: 0.5 },
    spreader: { name: 'Super-spreader virus', beta: 0.8 },
  };
  M.CONTACT = { normal: 1, reduced: 0.65, lockdown: 0.35 };
  M.sir = function (disease, vaccPct, contact, days = 120) {
    const N = 1000, gamma = 0.2, beta = M.DISEASES[disease].beta * M.CONTACT[contact];
    let I = 5, R = Math.round(N * vaccPct / 100), S = N - I - R;
    const sub = 10, dt = 1 / sub;
    const out = [{ S, I, R }];
    for (let d = 1; d <= days; d++) {
      for (let k = 0; k < sub; k++) {
        const inf = beta * S * I / N * dt, rec = gamma * I * dt;
        S -= inf; I += inf - rec; R += rec;
      }
      out.push({ S, I, R });
    }
    return out;
  };
  M.sirPeak = function (run) {
    let best = 0;
    run.forEach((r, i) => { if (r.I > run[best].I) best = i; });
    return { day: best, infected: run[best].I };
  };

  /* ---------- Bunnies (natural selection) ---------- */
  // env: 'snow' (white fur hidden) or 'forest' (brown fur hidden). Returns the next generation.
  M.CAP = 120;
  M.bunnyNext = function (g, env, wolves) {
    const hidden = (col) => (env === 'snow' ? col === 'white' : col === 'brown');
    const surv = (col) => (wolves ? (hidden(col) ? 0.85 : 0.4) : 0.9);
    let w = g.white * surv('white') * 2, b = g.brown * surv('brown') * 2;
    const tot = w + b;
    if (tot > M.CAP) { w = w * M.CAP / tot; b = b * M.CAP / tot; }
    return { white: Math.round(w), brown: Math.round(b) };
  };
  // script: {env, mutationGen, wolvesGen}; returns array of generations 0..n
  M.bunnyRun = function (script, n) {
    let g = { white: 20, brown: 0 };
    const out = [];
    for (let i = 0; i <= n; i++) {
      if (i === script.mutationGen) g = { white: g.white, brown: g.brown + 2 };
      out.push({ ...g });
      g = M.bunnyNext(g, script.env, i >= script.wolvesGen);
    }
    return out;
  };
  M.pctBrown = (g) => Math.round(100 * g.brown / Math.max(1, g.white + g.brown));

  /* ---------- Town population ---------- */
  // F: children per woman, L: average lifespan, m: migrants per year
  M.town = function (F, L, m, years = 40, P0 = 50000) {
    let P = P0;
    const pts = [[0, P]];
    for (let y = 1; y <= years; y++) {
      P = P + P * (F / 2.1) / 80 - P / L + m;
      pts.push([y, P]);
    }
    return pts;
  };


  /* ---------- Projectile launcher (no air resistance) ----------
     g: gravity (m/s^2), angle in degrees, power 0-100 (launch speed = 0.383 x power m/s).
     solids: [{type:'rect',x0,x1,y0,y1,id}, {type:'circle',x,y,r}]. A rect hit from above is a landing on top of it. */
  M.POWER_TO_SPEED = 0.383;
  // a moving asteroid: centre (x,y) plus a sine sweep of amplitude ax/ay (metres) with a period in seconds
  M.circleAt = function (s, t) {
    if (!s.period) return [s.x, s.y];
    const a = Math.sin((2 * Math.PI * t) / s.period + (s.phase || 0));
    return [s.x + (s.ax || 0) * a, s.y + (s.ay || 0) * a];
  };
  M.projectile = function (g, angle, power, solids = [], t0 = 0) {
    const v = power * M.POWER_TO_SPEED, th = angle * Math.PI / 180;
    const vx = v * Math.cos(th), vy = v * Math.sin(th), dt = 0.02;
    const pts = [[0, 0]];
    let t = 0, px = 0, py = 0, end = null, maxH = 0;
    while (t < 600 && !end) {
      t += dt;
      const x = vx * t, y = vy * t - 0.5 * g * t * t;
      maxH = Math.max(maxH, y);
      for (const s of solids) {
        if (s.type === 'circle') { const c = M.circleAt(s, t0 + t); if (Math.hypot(x - c[0], y - c[1]) <= s.r) { end = { type: 'crash', x, y }; break; } }
        else if (x >= s.x0 && x <= s.x1 && y <= s.y1 && y >= s.y0 - 1) {
          end = (py >= s.y1 && px >= s.x0 - 1e-9) ? { type: 'land', x, y: s.y1, id: s.id } : { type: 'crash', x, y };
          break;
        }
      }
      if (!end && y <= 0 && t > dt) end = { type: 'land', x, y: 0, id: 'ground' };
      if (end) { pts.push([end.x, Math.max(end.y, 0)]); break; }
      pts.push([x, y]);
      px = x; py = y;
    }
    return { pts, end, time: t, maxH, range: end ? end.x : vx * t, v };
  };

  /* ---------- Plant growth (no longer used by a station) ---------- */
  M.plant = function (sun, water, temp) {
    const s = Math.min(sun, 8) / 8;
    const w = Math.max(0.05, 1 - Math.pow((water - 5) / 5, 2));
    const t = Math.max(0.05, 1 - Math.pow((temp - 22) / 14, 2));
    return Math.round(20 * s * w * t * 10) / 10;
  };

  /* ---------- Simplified climate data (hypothetical, shaped like real anomaly records) ---------- */
  M.anomaly = [];
  for (let y = 1970; y <= 2024; y++) {
    const noise = 0.09 * Math.sin(y * 1.7) + 0.06 * Math.cos(y * 0.9 + 1);
    M.anomaly.push([y, Math.round((-0.02 + 0.0185 * (y - 1970) + noise) * 100) / 100]);
  }
  M.linfit = function (pts) {
    const n = pts.length;
    const sx = pts.reduce((a, p) => a + p[0], 0), sy = pts.reduce((a, p) => a + p[1], 0);
    const sxx = pts.reduce((a, p) => a + p[0] * p[0], 0), sxy = pts.reduce((a, p) => a + p[0] * p[1], 0);
    const m = (n * sxy - sx * sy) / (n * sxx - sx * sx);
    return { m, c: (sy - m * sx) / n };
  };
})();
