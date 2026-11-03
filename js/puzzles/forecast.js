/* Station 6: Storm Forecast. Finding a trend, predicting from it, and tracking a cyclone. */
ER.register({
  id: 'forecast',
  title: 'Storm Forecast',
  icon: '🌀',
  kind: 'game',
  tagline: 'Draw the trend, predict the future and track Cyclone Tilly',
  code: { letter: 'E', number: 6 },
  fact: 'Forecasters look for patterns in past data, then use a model to predict what comes next. The further ahead you predict, the less certain you can be, which is why cyclone forecasts are drawn as a widening cone rather than one line. A trend line shows the overall direction; individual years bounce around it.',
  hints: [
    'Stage 1: the dots bounce up and down, but the OVERALL direction is clear. Click one point near the start of the dots (1970) and a second near the end (2024) so your line runs through the middle of the cloud of dots, not along the top or bottom.',
    'Stage 2: look at how far the cyclone moved between each pair of days, and in which direction. Those steps are very similar, so the next step should look like the previous ones.',
  ],
  answerKey() {
    const M = ER.models;
    const f = M.linfit(M.anomaly);
    return ER.keyList([
      `Stage 1: a line from about (1970, ${(f.m * 1970 + f.c).toFixed(2)}) to (2024, ${(f.m * 2024 + f.c).toFixed(2)}); the 2035 prediction is about ${(f.m * 2035 + f.c).toFixed(2)} °C.`,
      'Dots do not sit on the line because of year-to-year variation; a prediction is not guaranteed.',
      'Stage 2: Tilly\'s day 5 position is roughly one more step further along the same path (about 70 pixels right and 38 up from day 4). The cone widens because far-ahead predictions are less certain.',
    ]);
  },
  build(body, api) {
    const { el } = ER;
    const M = ER.models;
    const fit = M.linfit(M.anomaly);
    const done = { line: false, pred: false, mc: false, storm: false, cone: false };
    let check = () => { if (done.pred && done.mc && done.storm && done.cone) api.solve(); };

    // ---------- Stage 1: the trend line ----------
    const chart = ER.liveChart({ w: 600, h: 300, xmin: 1970, xmax: 2040, xstep: 10, ymin: -0.2, ymax: 1.6, ystep: 0.2, digits: 2, xlabel: 'Year', ylabel: 'Anomaly (°C)' });
    chart.show([{ name: 'Anomaly', color: '#d94a2b', pts: M.anomaly, dots: true, noLine: true }], Infinity);
    let clicks = [];
    const fb1 = el('p', { class: 'feedback', 'aria-live': 'polite' });
    const stage1b = el('div');

    function inv(clientX, clientY) {
      const svg = chart.holder.querySelector('svg');
      const r = svg.getBoundingClientRect();
      const vx = ((clientX - r.left) / r.width) * chart.opts.w, vy = ((clientY - r.top) / r.height) * chart.opts.h;
      const o = chart.opts, P = chart.P;
      return [o.xmin + ((vx - P.l) / (o.w - P.l - P.r)) * (o.xmax - o.xmin), o.ymin + ((o.h - P.b - vy) / (o.h - P.t - P.b)) * (o.ymax - o.ymin)];
    }
    function drawMine() {
      let s = '';
      clicks.forEach((c) => { s += `<circle cx="${chart.X(c[0])}" cy="${chart.Y(c[1])}" r="6" fill="#7c5cff" stroke="#fff" stroke-width="2"/>`; });
      if (clicks.length === 2 && clicks[1][0] !== clicks[0][0]) {
        const m = (clicks[1][1] - clicks[0][1]) / (clicks[1][0] - clicks[0][0]);
        const y = (x) => clicks[0][1] + m * (x - clicks[0][0]);
        s += `<line x1="${chart.X(1970)}" y1="${chart.Y(y(1970))}" x2="${chart.X(2040)}" y2="${chart.Y(y(2040))}" stroke="#7c5cff" stroke-width="3"/>`;
      }
      chart.setExtra(s);
    }
    // pointerdown, not click: the chart redraws its SVG on pointerdown (hover readout),
    // which removes the original target and stops the browser firing a click.
    chart.holder.addEventListener('pointerdown', (e) => {
      if (done.line) return;
      const [x, y] = inv(e.clientX, e.clientY);
      if (clicks.length >= 2) clicks = [];
      clicks.push([x, y]);
      ER.sfx.tap();
      drawMine();
    });
    const checkLine = el('button', { class: 'btn btn-aqua btn-big' }, '✔ Check my trend line');
    checkLine.addEventListener('click', () => {
      if (clicks.length < 2) { ER.sfx.bad(); ER.say(fb1, 'Click two points on the chart to place your line first.', 'bad'); return; }
      const m = (clicks[1][1] - clicks[0][1]) / (clicks[1][0] - clicks[0][0]);
      const y = (x) => clicks[0][1] + m * (x - clicks[0][0]);
      const e1 = Math.abs(y(1970) - (fit.m * 1970 + fit.c)), e2 = Math.abs(y(2024) - (fit.m * 2024 + fit.c));
      if (e1 <= 0.12 && e2 <= 0.12) {
        done.line = true; ER.sfx.good();
        ER.say(fb1, '✅ That line follows the overall trend nicely.', 'good');
        checkLine.disabled = true;
        showStage1b();
      } else {
        ER.sfx.bad();
        ER.say(fb1, 'That line does not follow the overall trend closely enough yet. A good trend line passes through the MIDDLE of the dots at both ends.', 'bad');
        ER.cooldown(checkLine, 4);
      }
    });

    function showStage1b() {
      const lock = ER.answerLock({
        title: '🔮 Predict the future from your trend',
        note: 'Follow your line to 2035.',
        items: [{ q: 'Predicted temperature anomaly in 2035', a: +(fit.m * 2035 + fit.c).toFixed(2), tol: 0.25, unit: '°C' }],
        onSolved: () => { done.pred = true; showMC(); check(); },
      });
      stage1b.append(lock.node);
    }
    function showMC() {
      stage1b.append(ER.quizSeq([
        { q: 'The dots do not sit exactly on your line. What is the best explanation?',
          opts: ['Temperatures bounce around each year, but the trend is up', 'The data is wrong and nobody can use it at all', 'Straight lines are always useless for real data', 'The thermometers changed colour part way through'],
          a: 'Temperatures bounce around each year, but the trend is up' },
        { q: 'Is your 2035 prediction guaranteed to be right?',
          opts: ['No. It is an informed guess based on the pattern so far', 'Yes, because straight lines never fail to work', 'Yes, because it is drawn on a real graph', 'Only if the line you drew happens to be purple'],
          a: 'No. It is an informed guess based on the pattern so far' },
      ], () => { done.mc = true; ER.sfx.good(); check(); }, '🧠 Think about it'));
    }

    // ---------- Stage 2: Cyclone Tilly ----------
    const POS = [[60, 255], [132, 218], [207, 172], [281, 138]];
    const NEXT = [353, 100];
    const map = el('canvas', { width: 520, height: 320, class: 'map-canvas', 'aria-label': 'Map of the ocean showing four positions of Cyclone Tilly' });
    const mc = map.getContext('2d');
    let guess = null, coneShown = false;
    function drawMap() {
      mc.clearRect(0, 0, 520, 320);
      const g = mc.createLinearGradient(0, 0, 520, 0); g.addColorStop(0, '#1d5fb0'); g.addColorStop(1, '#3c86d1');
      mc.fillStyle = g; mc.fillRect(0, 0, 520, 320);
      mc.strokeStyle = 'rgba(255,255,255,0.18)'; mc.lineWidth = 1;
      for (let x = 0; x <= 520; x += 52) { mc.beginPath(); mc.moveTo(x, 0); mc.lineTo(x, 320); mc.stroke(); }
      for (let y = 0; y <= 320; y += 40) { mc.beginPath(); mc.moveTo(0, y); mc.lineTo(520, y); mc.stroke(); }
      mc.fillStyle = '#6aa84f';
      mc.beginPath(); mc.moveTo(440, 0); mc.bezierCurveTo(430, 80, 470, 140, 450, 200); mc.bezierCurveTo(430, 260, 470, 300, 460, 320); mc.lineTo(520, 320); mc.lineTo(520, 0); mc.fill();
      mc.fillStyle = '#fff'; mc.font = 'bold 13px Fredoka, sans-serif'; mc.fillText('COAST', 462, 160);
      // path so far
      mc.strokeStyle = '#ffffff'; mc.lineWidth = 2; mc.setLineDash([6, 4]);
      mc.beginPath(); POS.forEach((p, i) => (i ? mc.lineTo(p[0], p[1]) : mc.moveTo(p[0], p[1]))); mc.stroke(); mc.setLineDash([]);
      mc.font = '26px "Segoe UI Emoji","Apple Color Emoji",sans-serif'; mc.textAlign = 'center'; mc.textBaseline = 'middle';
      POS.forEach((p, i) => { mc.fillText('🌀', p[0], p[1]); mc.font = 'bold 12px Fredoka, sans-serif'; mc.fillStyle = '#fff'; mc.fillText('Day ' + (i + 1), p[0], p[1] + 24); mc.font = '26px "Segoe UI Emoji","Apple Color Emoji",sans-serif'; });
      if (coneShown) {
        const l = POS[3];
        mc.fillStyle = 'rgba(255,255,255,0.28)';
        mc.beginPath(); mc.moveTo(l[0], l[1]); mc.lineTo(NEXT[0] + 60, NEXT[1] - 55); mc.lineTo(NEXT[0] + 10, NEXT[1] + 55); mc.closePath(); mc.fill();
        mc.strokeStyle = '#ffc233'; mc.lineWidth = 2; mc.stroke();
        mc.fillStyle = '#fff'; mc.font = 'bold 12px Fredoka, sans-serif'; mc.fillText('uncertainty cone', 330, 165);
      }
      if (guess) { mc.fillStyle = '#ffc233'; mc.beginPath(); mc.arc(guess[0], guess[1], 9, 0, 7); mc.fill(); mc.strokeStyle = '#0b1020'; mc.lineWidth = 2; mc.stroke(); mc.fillStyle = '#0b1020'; mc.font = 'bold 11px Fredoka, sans-serif'; mc.fillText('5', guess[0], guess[1]); }
      mc.textAlign = 'start'; mc.textBaseline = 'alphabetic';
    }
    drawMap();
    const fb2 = el('p', { class: 'feedback', 'aria-live': 'polite' });
    const stage2b = el('div');
    map.addEventListener('click', (e) => {
      if (done.storm) return;
      const r = map.getBoundingClientRect();
      guess = [((e.clientX - r.left) / r.width) * 520, ((e.clientY - r.top) / r.height) * 320];
      ER.sfx.tap(); drawMap();
    });
    const checkStorm = el('button', { class: 'btn btn-aqua btn-big' }, '✔ Lock in my Day 5 prediction');
    checkStorm.addEventListener('click', () => {
      if (!guess) { ER.sfx.bad(); ER.say(fb2, 'Click the map where you think Tilly will be on Day 5.', 'bad'); return; }
      if (Math.hypot(guess[0] - NEXT[0], guess[1] - NEXT[1]) <= 46) {
        done.storm = true; coneShown = true; ER.sfx.good(); drawMap();
        ER.say(fb2, '✅ A good prediction: you continued the pattern in her path.', 'good');
        checkStorm.disabled = true;
        stage2b.append(ER.quizSeq([
          { q: 'Forecasters draw a widening CONE instead of one line. Why?',
            opts: ['Predictions get less certain further into the future', 'Cyclones get physically wider as they move along', 'Cones look more scientific than a single line', 'The model stops working completely after Day 5'],
            a: 'Predictions get less certain further into the future' },
        ], () => { done.cone = true; check(); }, '🧠 Think about it'));
      } else {
        ER.sfx.bad();
        ER.say(fb2, 'Not close enough. Compare the steps between Days 1, 2, 3 and 4: how far and in which direction does Tilly move each day?', 'bad');
        ER.cooldown(checkStorm, 4);
      }
    });

    const card1 = el('div', { class: 'card sim-card' },
      el('p', { class: 'muted small' }, 'Each dot is one year compared with the long-term average. The data is simplified and invented to look like real records.'),
      chart.node,
      el('div', { class: 'row-center' }, checkLine, el('button', { class: 'btn btn-light', onclick: () => { if (!done.line) { clicks = []; drawMine(); } } }, '↺ Clear my line')),
      fb1, stage1b);
    const card2 = el('div', { class: 'card sim-card' },
      el('p', { class: 'muted small' }, 'Days 1 to 4 are marked. Where will Tilly be on Day 5?'),
      map,
      el('div', { class: 'row-center' }, checkStorm), fb2, stage2b);
    const tabs = ER.missionTabs([
      { id: 'trend', icon: '📈', label: 'Trend line', goal: 'Click two points to draw a line through the middle of the dots, then predict 2035.', node: card1, done: () => done.pred && done.mc },
      { id: 'storm', icon: '🌀', label: 'Cyclone Tilly', goal: 'Click where you think Cyclone Tilly will be on Day 5.', node: card2, done: () => done.storm && done.cone },
    ]);
    check = ((orig) => () => { tabs.refresh(); orig(); })(check);
    body.append(el('p', { class: 'lead' }, '🔍 Find the pattern in the data, then make a prediction.'), tabs.tabs, tabs.panel);
  },
});
