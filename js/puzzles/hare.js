/* Station 2: Hare & Lynx Park. A predator-prey simulation. */
ER.register({
  id: 'hare',
  title: 'Hare & Lynx Park',
  icon: '🐇',
  kind: 'game',
  tagline: 'Run the predator-prey model and keep the park alive',
  code: { letter: 'M', number: 2 },
  fact: 'In the real Canadian wilderness, snowshoe hare and lynx numbers rise and fall in cycles about 10 years long, and lynx always peak AFTER the hares. Models like this one help ecologists protect ecosystems, but they leave out disease, fire, weather and people.',
  hints: [
    'Mission A: press "Load the park records" and press Run. Then hover over the charts: the grey line shows the year and the exact numbers. The FIRST hare peak is the first high point of the hare line.',
    'Mission B: the park stays balanced when it starts near 100 hares and 20 lynx. If you start with way too many lynx or way too few hares, the cycles swing wildly and one species almost disappears.',
  ],
  answerKey() {
    const r = ER.models.hare(60, 10);
    const ph = ER.models.firstPeak(r.H), pl = ER.models.firstPeak(r.L);
    return ER.keyList([
      `Mission A (60 hares, 10 lynx, normal grass): first hare peak at about year ${ph[0]}, about ${Math.round(ph[1])} hares; lynx peak about ${pl[0] - ph[0]} years later.`,
      'Mission B: set the park to about 100 hares and 20 lynx and run it. It stays steady, so neither species ever drops below the line.',
      'Mission C: lynx numbers FALL after hares crash (less food); a limitation is that the model ignores disease, fire or weather.',
    ]);
  },
  build(body, api) {
    const { el } = ER;
    const M = ER.models;
    const rec = M.hare(60, 10);
    const recPeakH = M.firstPeak(rec.H), recPeakL = M.firstPeak(rec.L);
    const done = { a: false, b: false, c: false };
    let stop = null;

    const hChart = ER.liveChart({ w: 560, h: 220, xmax: 40, xstep: 5, ymax: 250, ystep: 50, autoMax: true, xlabel: 'Time (years)', ylabel: 'Hares', hlines: [{ y: 40, label: 'hare danger line (40)', color: '#d94a2b' }] });
    const lChart = ER.liveChart({ w: 560, h: 190, xmax: 40, xstep: 5, ymax: 50, ystep: 10, autoMax: true, xlabel: 'Time (years)', ylabel: 'Lynx', digits: 1,
      hlines: [{ y: 10, label: 'lynx danger line (10)', color: '#d94a2b' }] });

    const live = el('div', { class: 'live-line' }, 'Press ▶ Run to start the simulation.');
    const h0 = ER.slider({ label: '🐇 Starting hares', min: 10, max: 300, step: 10, value: 60 });
    const l0 = ER.slider({ label: '🐆 Starting lynx', min: 2, max: 60, step: 2, value: 10 });
    const food = ER.choice({ label: '🌿 Grass growth', value: 0.6, options: [{ v: 0.45, t: 'Poor' }, { v: 0.6, t: 'Normal' }, { v: 0.75, t: 'Rich' }] });


    function run() {
      if (stop) stop();
      ER.sfx.tap();
      const r = M.hare(h0.get(), l0.get(), 40, food.get());
      const series = [{ name: 'Hares', color: '#16a34a', pts: r.H }];
      const series2 = [{ name: 'Lynx', color: '#d94a2b', pts: r.L }];
      let i = 0;
      hChart.show(series, 0); lChart.show(series2, 0);
      stop = ER.play(() => {
        i++;
        hChart.setUpTo(i); lChart.setUpTo(i);
        const hv = Math.round(r.H[Math.min(i, r.H.length - 1)][1]), lv = Math.round(r.L[Math.min(i, r.L.length - 1)][1]);
        live.textContent = `Year ${r.H[Math.min(i, r.H.length - 1)][0]}:  🐇 ${hv} hares   🐆 ${lv} lynx`;
        if (i >= r.H.length - 1) {
          const minH = M.minOf(r.H), minL = M.minOf(r.L);
          live.textContent += `   ·   lowest hares ${Math.round(minH)}, lowest lynx ${minL.toFixed(1)}`;
          if (minH >= 40 && minL >= 10 && !done.b) { done.b = true; ER.sfx.good(); check(); }
          return false;
        }
      }, 45);
    }

    const sim = el('div', { class: 'card sim-card' },
      el('h4', {}, '🎛️ Park controls'),
      el('div', { class: 'controls-grid' }, h0.node, l0.node, food.node),
      el('div', { class: 'row-center' },
        el('button', { class: 'btn btn-aqua btn-big', onclick: run }, '▶ Run the simulation'),
        el('button', { class: 'btn btn-light', onclick: () => { h0.set(60); l0.set(10); food.set(0.6); run(); } }, '📋 Load the park records')),
      live,
      el('div', { class: 'two-charts' }, hChart.node, lChart.node),
      el('p', { class: 'muted small' }, 'Hover or tap a chart to read exact values for that year. Dashed lines are danger lines: a species that dips below its line is in trouble.'));

    const lock = ER.answerLock({
      title: '📋 Mission A: read the park records',
      note: 'Press "Load the park records" first, then read the charts.',
      items: [
        { q: 'In which year do the hares reach their FIRST peak?', a: recPeakH[0], tol: 0.5, unit: 'year' },
        { q: 'About how many hares are there at that first peak?', a: Math.round(recPeakH[1]), tol: 12, unit: 'hares' },
        { q: 'How many years AFTER the hare peak do the lynx peak?', a: recPeakL[0] - recPeakH[0], tol: 0.5, unit: 'years' },
      ],
      onSolved: () => { done.a = true; check(); },
    });

        const quiz = ER.quizSeq([
      { q: 'A disease suddenly kills most of the hares. What do you predict happens to the lynx?',
        opts: ['Their numbers eventually fall because there is less food', 'Their numbers shoot up forever and never come back down', 'Nothing changes at all in the lynx population', 'They quickly turn into hares so they can survive'],
        a: 'Their numbers eventually fall because there is less food' },
      { q: 'Which is a LIMITATION of this predator-prey model?',
        opts: ['It leaves out things like disease, fire and weather', 'It uses numbers to describe what will happen', 'It shows population changes over time on a graph', 'It can show a repeating pattern in the numbers'],
        a: 'It leaves out things like disease, fire and weather' },
    ], () => { done.c = true; check(); }, '🔮 Mission C: predict');

    let check = function () {
      if (done.a && done.b && done.c) api.solve();
    };

    const tabs = ER.missionTabs([
      { id: 'a', icon: '📋', label: 'Read the records', goal: 'Load the park records, read the charts and answer 3 questions.', node: lock.node, done: () => done.a },
      { id: 'b', icon: '⚖️', label: 'Balance the park', goal: 'Choose starting numbers so neither species ever dips below its danger line.', done: () => done.b },
      { id: 'c', icon: '🔮', label: 'Predict', goal: 'Make two predictions.', node: quiz, done: () => done.c },
    ]);
    body.append(el('p', { class: 'lead' }, '🐇 Hares eat grass. 🐆 Lynx eat hares. Play with the model!'), tabs.tabs, sim, tabs.panel);
    check = ((orig) => () => { tabs.refresh(); orig(); })(check);
    return () => { if (stop) stop(); };
  },
});
