/* Station 5: Population Planner. A town population-growth simulation. */
ER.register({
  id: 'popn',
  title: 'Population Planner',
  icon: '🏘️',
  kind: 'game',
  tagline: 'Plan for the future of Stormhaven with a population model',
  code: { letter: 'P', number: 5 },
  fact: 'Governments use population models to decide where to build schools, hospitals and aged-care homes years before they are needed. A population goes up with births and arrivals, and down with deaths and departures. Real models include many more factors, which is why their forecasts have limits.',
  hints: [
    'Mission A: press "Load the council forecast" and Run. Compare how fast the line moves: if it slopes DOWN the population is shrinking. Hover over the line to read the population in a given year.',
    'Mission B: you want more people arriving or being born than leaving or dying. Try raising the migrants slider and the lifespan first, and keep an eye on the target band on the chart (60,000 to 70,000 at year 30).',
  ],
  answerKey() {
    const M = ER.models;
    const pts = M.town(1.4, 84, 0);
    const below = pts.find((p) => p[1] < 46000);
    return ER.keyList([
      `Mission A (1.4 children, lifespan 84, 0 migrants): the town is SHRINKING; about ${Math.round(pts[30][1])} people at year 30; it falls below 46,000 in year ${below ? below[0] : '?'}.`,
      'Mission B: for example 2.1 children, lifespan 90, 500 migrants per year gives about 67,000 at year 30. Many other settings also work.',
      'Mission C: longer lifespan means fewer deaths so the population rises; models help planners prepare; the model leaves out jobs, housing, disasters and changes over time.',
    ]);
  },
  build(body, api) {
    const { el } = ER;
    const M = ER.models;
    const done = { a: false, b: false, c: false };
    let stop = null;

    const chart = ER.liveChart({ w: 560, h: 300, xmax: 40, xstep: 5, ymin: 20000, ymax: 120000, ystep: 20000, xlabel: 'Time (years)', ylabel: 'Population of Stormhaven' });
    // target band for Mission B
    const band = `<rect x="${chart.X(29.5)}" y="${chart.Y(70000)}" width="${chart.X(30.5) - chart.X(29.5)}" height="${chart.Y(60000) - chart.Y(70000)}" fill="rgba(34,197,94,0.45)" stroke="#15803d"/><text x="${chart.X(29.5) - 6}" y="${chart.Y(70000) + 4}" text-anchor="end" font-size="12" font-weight="600" fill="#15803d" font-family="Fredoka,sans-serif">target at year 30</text>`;
    chart.setExtra(band);

    const F = ER.slider({ label: '👶 Children per woman (average)', min: 0.8, max: 3, step: 0.1, value: 1.4 });
    const L = ER.slider({ label: '🧓 Average lifespan', min: 60, max: 100, step: 1, value: 84, unit: ' years' });
    const m = ER.slider({ label: '🧳 New residents arriving per year', min: 0, max: 1000, step: 50, value: 0 });
    const town = el('div', { class: 'town-strip' });
    const live = el('div', { class: 'live-line' }, 'Press ▶ Run to start the simulation. Today: 50,000 people.');

    function houses(p) {
      town.innerHTML = '';
      const n = Math.max(1, Math.round(p / 5000));
      for (let i = 0; i < Math.min(n, 20); i++) town.append(el('span', {}, i % 7 === 3 ? '🏫' : i % 9 === 5 ? '🏥' : '🏠'));
    }
    houses(50000);

    function run() {
      if (stop) stop();
      ER.sfx.tap();
      const pts = M.town(F.get(), L.get(), m.get());
      let i = 0;
      chart.show([{ name: 'Population', color: '#7c5cff', pts }], 0);
      stop = ER.play(() => {
        i++;
        chart.setUpTo(i);
        const p = pts[Math.min(i, 40)];
        houses(p[1]);
        live.textContent = `Year ${p[0]}:  ${Math.round(p[1]).toLocaleString()} people`;
        if (i >= 40) {
          const at30 = pts[30][1];
          live.textContent += `   ·   year 30: ${Math.round(at30).toLocaleString()}`;
          if (at30 >= 60000 && at30 <= 70000 && !done.b) {
            done.b = true; ER.sfx.good();
            check();
          }
          return false;
        }
      }, 70);
    }

    const sim = el('div', { class: 'card sim-card' },
      el('h4', {}, '🎛️ Town settings'),
      el('div', { class: 'controls-grid' }, F.node, L.node, m.node),
      el('div', { class: 'row-center' },
        el('button', { class: 'btn btn-aqua btn-big', onclick: run }, '▶ Run the simulation'),
        el('button', { class: 'btn btn-light', onclick: () => { F.set(1.4); L.set(84); m.set(0); run(); } }, '📋 Load the council forecast')),
      live, town, chart.node,
      el('p', { class: 'muted small' }, 'In this model, births depend on how many children women have, and deaths depend on how long people live.'));

    const rec = M.town(1.4, 84, 0);
    const below = rec.find((p) => p[1] < 46000);
    const lock = ER.answerLock({
      title: '📋 Mission A: the council forecast',
      note: 'FIRST press "Load the council forecast" above. The chart shows your last run, so a rising line means it is not the forecast.',
      items: [
        { q: 'In the council forecast, is the population of Stormhaven growing, shrinking or steady?', a: 'shrinking', choices: ['growing', 'shrinking', 'steady'] },
        { q: 'In the council forecast, about how many people live in Stormhaven at year 30?', a: Math.round(rec[30][1]), tol: 800, unit: 'people' },
        { q: 'In the council forecast, in which year does the population first fall below 46,000?', a: below ? below[0] : 40, tol: 1, unit: 'year' },
      ],
      onSolved: () => { done.a = true; check(); },
    });

    const quiz = ER.quizSeq([
      { q: 'Predict: births stay the same but people live longer on average. What happens to the population?',
        opts: ['It rises, because there are fewer deaths each year', 'It falls, because older people are less healthy overall', 'It stays exactly the same as it was before', 'It disappears completely after a few years'],
        a: 'It rises, because there are fewer deaths each year' },
      { q: 'Why does a council use a population model?',
        opts: ['To prepare for schools or aged-care homes before they are needed', 'To guarantee exactly what will happen in the future', 'To avoid collecting any data about the town', 'To change how many babies are born each year'],
        a: 'To prepare for schools or aged-care homes before they are needed' },
      { q: 'Which is a LIMITATION of this model?',
        opts: ['It leaves out jobs, housing costs, disasters and changing choices', 'It uses numbers to show what happens each year', 'It shows the population as a line on a graph', 'It can be run more than once with new settings'],
        a: 'It leaves out jobs, housing costs, disasters and changing choices' },
    ], () => { done.c = true; check(); }, '🔮 Mission C: predict and evaluate');

    let check = () => { if (done.a && done.b && done.c) api.solve(); };

    const tabs = ER.missionTabs([
      { id: 'a', icon: '📋', label: 'Read the forecast', goal: 'Load the council forecast, read the chart and answer 3 questions.', node: lock.node, done: () => done.a },
      { id: 'b', icon: '🎯', label: 'Hit the target', goal: 'Adjust the settings so the town has 60,000 to 70,000 people at year 30.', done: () => done.b },
      { id: 'c', icon: '🔮', label: 'Predict', goal: 'Predict and judge the model.', node: quiz, done: () => done.c },
    ]);
    body.append(el('p', { class: 'lead' }, '🏘️ Stormhaven has 50,000 people. You are the council planner!'), tabs.tabs, sim, tabs.panel);
    check = ((orig) => () => { orig(); try { tabs.refresh(); } catch (e) { console.error(e); } })(check);
    return () => { if (stop) stop(); };
  },
});
