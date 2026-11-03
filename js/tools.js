/* Shared tools for the data-science stations: tolerance answer lock, live line chart, tick player, code tile.
   Feedback is count-only: students are told how many answers are right, never which ones. */
(function () {
  const el = ER.el;

  /* items: [{q, a, tol, unit, choices}]. A choices array makes a drop-down instead of a number box. */
  ER.answerLock = function ({ items, title = '🔢 Answer lock', note, onSolved, checkText = '🔓 Try to unlock' }) {
    const fields = items.map((q) => {
      if (q.choices) {
        return el('select', { 'aria-label': q.q }, el('option', { value: '' }, 'choose...'), ...q.choices.map((c) => el('option', { value: c }, c)));
      }
      const inp = el('input', { type: 'text', inputmode: 'text', placeholder: q.ph || 'number', 'aria-label': q.q, maxlength: '8', autocomplete: 'off' });
      inp.addEventListener('input', () => { inp.value = inp.value.replace(/[^0-9.\-]/g, ''); });
      return inp;
    });
    const fb = el('p', { class: 'feedback', 'aria-live': 'polite' });
    const dials = el('div', { class: 'padlock' }, el('span', { class: 'padlock-icon' }, '🔒'),
      ...items.map(() => el('span', { class: 'dial' }, '?')));
    const btn = el('button', { class: 'btn btn-aqua btn-big' }, checkText);
    fields.forEach((f) => f.addEventListener('keydown', (e) => { if (e.key === 'Enter') btn.click(); }));
    let solved = false;
    const ok = (q, f) => {
      if (q.choices) return f.value === q.a;
      const v = ER.num(f.value);
      return v !== '' && Math.abs(Number(v) - Number(q.a)) <= (q.tol || 0) + 1e-9;
    };
    btn.addEventListener('click', () => {
      if (solved) return;
      const right = items.filter((q, i) => ok(q, fields[i])).length;
      if (right === items.length) {
        solved = true;
        ER.sfx.good();
        dials.classList.add('open');
        dials.querySelector('.padlock-icon').textContent = '🔓';
        dials.querySelectorAll('.dial').forEach((d) => { d.textContent = '✔'; d.classList.add('ok'); });
        fields.forEach((f) => (f.disabled = true));
        btn.disabled = true;
        ER.say(fb, '✅ Lock open!', 'good');
        if (onSolved) onSolved();
      } else {
        ER.sfx.bad();
        ER.shake(dials);
        ER.cooldown(btn, 5);
        ER.say(fb, `${right} of ${items.length} answers are correct. Look at the chart again (hover over it to read exact values).`, 'bad');
      }
    });
    return {
      node: el('div', { class: 'card' },
        el('h4', {}, title),
        note ? el('p', { class: 'muted small' }, note) : null,
        el('ol', { class: 'q-list' }, items.map((q, i) => el('li', { class: 'q-row' },
          el('span', {}, q.q, q.unit ? el('b', { class: 'unit' }, ' (' + q.unit + ')') : null), fields[i]))),
        dials,
        el('div', { class: 'row-center' }, btn),
        fb),
    };
  };

  /* Line chart that can be drawn progressively and read by hovering.
     opts: {w,h,xmax,ymax,xstep,ystep,xlabel,ylabel,hlines:[{y,label,color}],xmin,ymin,digits}
     chart.show(series, upTo) where series: [{name,color,pts:[[x,y]...],dash}] */
  // Disable a check button for a few seconds after a wrong try, with a visible countdown (stops quick trial-and-error).
  ER.cooldown = function (btn, secs = 5) {
    const label = btn.textContent; let left = secs; btn.disabled = true;
    btn.textContent = `Wait ${left}s...`;
    const id = setInterval(() => { left--; if (left <= 0) { clearInterval(id); btn.disabled = false; btn.textContent = label; } else btn.textContent = `Wait ${left}s...`; }, 1000);
  };

  ER.liveChart = function (opts) {
    const o = Object.assign({ w: 560, h: 300, xmin: 0, ymin: 0, xstep: 10, ystep: 50, xlabel: '', ylabel: '', hlines: [], digits: 0 }, opts);
    // widen the left margin for long tick labels (e.g. 100000) so they don't hit the axis title
    const longest = Math.max(String(+o.ymax.toFixed(2)).length, String(+(o.ymin || 0).toFixed(2)).length);
    const P = { l: 52 + Math.max(0, longest - 4) * 7, r: 14, t: 14, b: 42 };
    const X = (x) => P.l + ((x - o.xmin) / (o.xmax - o.xmin)) * (o.w - P.l - P.r);
    const Y = (y) => o.h - P.b - ((y - o.ymin) / (o.ymax - o.ymin)) * (o.h - P.t - P.b);
    let series = [], upTo = Infinity, hover = null, extra = '';
    const yBase = o.ymax, yStepBase = o.ystep;
    // optional auto-scaling so unusual runs never go off the chart
    function autoScale() {
      if (!o.autoMax) return;
      let mx = 0; series.forEach((se) => se.pts.forEach((p) => { if (p[1] > mx) mx = p[1]; }));
      const raw = Math.max(yBase, mx * 1.08);
      const step = [10, 20, 25, 50, 100, 200, 250, 500, 1000].find((s) => raw / s <= 6) || 1000;
      o.ymax = raw <= yBase ? yBase : Math.ceil(raw / step) * step; o.ystep = raw <= yBase ? yStepBase : step;
    }
    const holder = el('div', { class: 'live-chart' });
    const readout = el('div', { class: 'chart-readout' }, 'Hover or tap the chart to read exact values.');
    const F = 'font-family="Fredoka,sans-serif"';
    let fs = 12;
    function render() {
      // keep text ~12px on screen even when the chart is scaled down on a narrow screen
      const cw = holder.clientWidth;
      fs = cw ? Math.max(12, Math.min(24, 12 * o.w / cw)) : 12;
      P.l = 52 + Math.max(0, longest - 4) * 0.6 * fs + (fs - 12) * 2.5;
      P.b = 42 + (fs - 12) * 1.5;
      let s = `<svg viewBox="0 0 ${o.w} ${o.h}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${o.ylabel} against ${o.xlabel}">`;
      s += `<rect x="${P.l}" y="${P.t}" width="${o.w - P.l - P.r}" height="${o.h - P.t - P.b}" fill="#fbfdff" stroke="#b8c7de"/>`;
      for (let x = o.xmin; x <= o.xmax + 1e-9; x += o.xstep) {
        s += `<line x1="${X(x)}" y1="${P.t}" x2="${X(x)}" y2="${o.h - P.b}" stroke="#e1eaf6"/><text x="${X(x)}" y="${o.h - P.b + 16}" text-anchor="middle" font-size="${fs}" fill="#33456b" ${F}>${+x.toFixed(2)}</text>`;
      }
      for (let y = o.ymin; y <= o.ymax + 1e-9; y += o.ystep) {
        s += `<line x1="${P.l}" y1="${Y(y)}" x2="${o.w - P.r}" y2="${Y(y)}" stroke="#e1eaf6"/><text x="${P.l - 6}" y="${Y(y) + 4}" text-anchor="end" font-size="${fs}" fill="#33456b" ${F}>${+y.toFixed(2)}</text>`;
      }
      s += `<text x="${(P.l + o.w - P.r) / 2}" y="${o.h - 6}" text-anchor="middle" font-size="${fs + 1}" font-weight="600" fill="#0b1a33" ${F}>${o.xlabel}</text>`;
      s += `<text transform="translate(${fs + 1} ${(P.t + o.h - P.b) / 2}) rotate(-90)" text-anchor="middle" font-size="${fs + 1}" font-weight="600" fill="#0b1a33" ${F}>${o.ylabel}</text>`;
      o.hlines.forEach((h) => {
        s += `<line x1="${P.l}" y1="${Y(h.y)}" x2="${o.w - P.r}" y2="${Y(h.y)}" stroke="${h.color || '#ff6b4a'}" stroke-width="2" stroke-dasharray="7 5"/><text x="${o.w - P.r - 4}" y="${Y(h.y) - 5}" text-anchor="end" font-size="${fs}" font-weight="600" fill="${h.color || '#d94a2b'}" ${F}>${h.label}</text>`;
      });
      series.forEach((se) => {
        const pts = se.pts.slice(0, Math.max(0, Math.min(se.pts.length, upTo + 1)));
        const pp = pts.map((p) => X(p[0]).toFixed(1) + ',' + Y(p[1]).toFixed(1)).join(' ');
        if (se.dots) pts.forEach((p) => { s += `<circle cx="${X(p[0])}" cy="${Y(p[1])}" r="4" fill="${se.color}" stroke="#fff"/>`; });
        if (se.noLine) { /* dots only */ }
        else if (pts.length > 1) s += `<polyline fill="none" stroke="${se.color}" stroke-width="3" stroke-linejoin="round" ${se.dash ? 'stroke-dasharray="6 5"' : ''} points="${pp}"/>`;
        else if (pts.length === 1) s += `<circle cx="${X(pts[0][0])}" cy="${Y(pts[0][1])}" r="3" fill="${se.color}"/>`;
      });
      s += extra;
      if (hover != null) s += `<line x1="${X(hover)}" y1="${P.t}" x2="${X(hover)}" y2="${o.h - P.b}" stroke="#0b1a33" stroke-width="1.5" stroke-dasharray="3 3"/>`;
      s += '</svg>';
      holder.innerHTML = s;
    }
    function readAt(clientX) {
      const svg = holder.querySelector('svg');
      if (!svg || !series.length) return;
      const r = svg.getBoundingClientRect();
      const vx = ((clientX - r.left) / r.width) * o.w;
      let x = o.xmin + ((vx - P.l) / (o.w - P.l - P.r)) * (o.xmax - o.xmin);
      x = Math.max(o.xmin, Math.min(o.xmax, x));
      const parts = [];
      let xs = null;
      series.forEach((se) => {
        let best = null;
        se.pts.slice(0, upTo + 1).forEach((p) => { if (best == null || Math.abs(p[0] - x) < Math.abs(best[0] - x)) best = p; });
        if (best) { xs = best[0]; parts.push(`<b style="color:${se.color}">${se.name}: ${+best[1].toFixed(o.digits)}</b>`); }
      });
      if (xs == null) return;
      hover = xs;
      readout.innerHTML = `${o.xlabel.split(' (')[0]} <b>${+xs.toFixed(2)}</b> &nbsp;·&nbsp; ${parts.join(' &nbsp;·&nbsp; ')}`;
      render();
    }
    holder.addEventListener('pointermove', (e) => readAt(e.clientX));
    holder.addEventListener('pointerdown', (e) => readAt(e.clientX));
    render();
    if (window.ResizeObserver) new ResizeObserver(() => { if (holder.clientWidth && Math.abs(o.w / holder.clientWidth * 12 - fs) > 0.5) render(); }).observe(holder);
    return {
      node: el('div', { class: 'chart-box' }, holder, readout),
      show(s, n) { series = s; upTo = n == null ? Infinity : n; hover = null; autoScale(); render(); },
      setUpTo(n) { upTo = n; render(); },
      setExtra(svgString) { extra = svgString || ''; render(); },
      legend() { return el('div', { class: 'chart-legend' }, series.map((se) => el('span', {}, el('i', { style: { background: se.color } }), se.name))); },
      holder, X, Y, P, opts: o,
    };
  };

  // Calls fn every ms until it returns false. Returns a stop function.
  ER.play = function (fn, ms = 60) {
    const id = setInterval(() => { if (fn() === false) clearInterval(id); }, ms);
    return () => clearInterval(id);
  };

  // labelled range slider: {node, get(), set(v)}
  ER.slider = function ({ label, min, max, step = 1, value, unit = '', fmt, onInput }) {
    const out = el('b', { class: 'slider-val' });
    const inp = el('input', { type: 'range', min, max, step, value, 'aria-label': label });
    const show = () => { out.textContent = (fmt ? fmt(+inp.value) : inp.value) + unit; };
    inp.addEventListener('input', () => { show(); if (onInput) onInput(+inp.value); });
    show();
    return {
      node: el('label', { class: 'slider-row' }, el('span', {}, label), inp, out),
      get: () => +inp.value,
      set(v) { inp.value = v; show(); },
      disable(d) { inp.disabled = d; },
    };
  };

  // small segmented choice: {node, get(), set(v)}
  ER.choice = function ({ label, options, value, onChange }) {
    let cur = value;
    const btns = options.map((o) => el('button', {
      type: 'button', class: 'seg-btn' + (o.v === cur ? ' on' : ''),
      onclick: () => { cur = o.v; btns.forEach((b, i) => b.classList.toggle('on', options[i].v === cur)); ER.sfx.tap(); if (onChange) onChange(cur); },
    }, o.t));
    return {
      node: el('div', { class: 'slider-row choice-row' }, el('span', {}, label), el('div', { class: 'seg' }, btns)),
      get: () => cur,
      set(v) { cur = v; btns.forEach((b, i) => b.classList.toggle('on', options[i].v === cur)); },
    };
  };


  /* Clickable mission tabs: a row of pills (with ticks) and a one-line goal. Only the chosen mission's panel is shown.
     missions: [{id, icon, label, goal, node?, done: () => bool}]. Returns {tabs, panel, refresh, select}. */
  ER.missionTabs = function (missions, start) {
    let cur = (start || missions[0]).id || missions[0].id;
    const row = el('div', { class: 'mtabs', role: 'tablist' });
    const goal = el('div', { class: 'mgoal' });
    const panel = el('div', { class: 'mpanel' });
    missions.forEach((m) => { if (m.node) { m.node.hidden = true; panel.append(m.node); } });
    function render() {
      const doneN = missions.filter((m) => m.done()).length;
      row.replaceChildren(...missions.map((m, i) => el('button', {
        type: 'button', role: 'tab', 'aria-selected': m.id === cur ? 'true' : 'false',
        class: 'mtab' + (m.id === cur ? ' on' : '') + (m.done() ? ' done' : ''),
        onclick: () => { ER.sfx.tap(); select(m.id); },
      }, el('span', { class: 'mt-ico' }, m.done() ? '✅' : m.icon), el('span', {}, m.label))));
      const m = missions.find((x) => x.id === cur);
      goal.replaceChildren(el('b', {}, m.done() ? '✅ Done! ' : ''), m.goal, el('span', { class: 'mprog' }, ` ${doneN}/${missions.length} missions`));
      missions.forEach((x) => { if (x.node) x.node.hidden = x.id !== cur; });
    }
    function select(id) { cur = id; render(); const m = missions.find((x) => x.id === id); if (m && m.onSelect) m.onSelect(); }
    render();
    return { tabs: el('div', { class: 'mtabs-wrap' }, row, goal), panel, refresh: render, select, get current() { return cur; } };
  };

  // answer-key list used by every station's "reveal answers"
  ER.keyList = (rows) => el('ul', { class: 'key-list' }, rows.map((r) => el('li', {}, r)));

  // coded-letter tile (shifted letter + position number) used for station rewards
  ER.codeTile = (code) => el('span', { class: 'code-tiles' },
    el('span', { class: 'tile letter' }, el('small', {}, 'letter'), code.letter),
    el('span', { class: 'tile number' }, el('small', {}, 'number'), String(code.number)));
})();
