/* Station 3: Outbreak Control. An SIR disease-spread simulation. */
ER.register({
  id: 'outbreak',
  title: 'Outbreak Control',
  icon: '🦠',
  kind: 'game',
  tagline: 'Simulate a virus in a town of 1000 people and flatten the curve',
  code: { letter: 'Q', number: 3 },
  fact: 'Health scientists use SIR models (Susceptible, Infected, Recovered) to test "what if?" questions before an outbreak gets out of hand. Vaccination helps even the people who are NOT vaccinated, because fewer infected people means fewer chances to spread the virus. This is called herd immunity.',
  hints: [
    'Mission A: choose Seasonal flu, 0% vaccinated, Normal contact (or press "Load the town records") then Run. The red line is the INFECTED group. Hover over the chart to read its highest point and the day it happens.',
    'Mission B: the super-spreader virus needs TWO measures at once. Try about 50% vaccinated together with Reduced contact, then adjust. Watch the red peak and the dashed hospital line.',
  ],
  answerKey() {
    const M = ER.models;
    const r = M.sir('flu', 0, 'normal');
    const p = M.sirPeak(r);
    return ER.keyList([
      `Mission A (flu, 0% vaccinated, normal contact): peak on about day ${p.day} with about ${Math.round(p.infected)} infected; about ${Math.round(r[120].S)} people never caught it.`,
      'Mission B: super-spreader virus with e.g. 50% vaccinated + Reduced contact (peak about 18), or 60% vaccinated + Normal contact (peak about 36).',
      'Mission C: vaccination makes the peak MUCH LOWER; it protects others because fewer infected people means fewer chances to spread; I = Infected.',
    ]);
  },
  build(body, api) {
    const { el } = ER;
    const M = ER.models;
    const LIMIT = 40;
    const rec = M.sir('flu', 0, 'normal');
    const recPeak = M.sirPeak(rec);
    const done = { a: false, b: false, c: false };
    let stop = null;

    const chart = ER.liveChart({ w: 560, h: 280, xmax: 120, xstep: 20, ymax: 1000, ystep: 200, xlabel: 'Time (days)', ylabel: 'People', hlines: [{ y: LIMIT, label: 'hospital limit (40)', color: '#d94a2b' }] });

    const disease = ER.choice({ label: '🧬 Virus', value: 'flu', options: [{ v: 'cold', t: 'Common cold' }, { v: 'flu', t: 'Seasonal flu' }, { v: 'spreader', t: 'Super-spreader' }] });
    const vacc = ER.slider({ label: '💉 People vaccinated', min: 0, max: 90, step: 10, value: 0, unit: '%' });
    const contact = ER.choice({ label: '🚶 Contact between people', value: 'normal', options: [{ v: 'normal', t: 'Normal' }, { v: 'reduced', t: 'Reduced' }, { v: 'lockdown', t: 'Lockdown' }] });

    // 20 x 20 grid of people. Each dot = 2.5 people.
    const dots = el('canvas', { width: 260, height: 260, class: 'dot-canvas', 'aria-label': 'Grid of people coloured by health state' });
    const dctx = dots.getContext('2d');
    const rank = Array.from({ length: 400 }, (_, i) => (i * 157 % 400) / 400); // fixed scatter
    function paint(day, run) {
      const s = run[Math.min(day, run.length - 1)];
      const fr = s.R / 1000, fi = s.I / 1000;
      dctx.clearRect(0, 0, 260, 260);
      for (let i = 0; i < 400; i++) {
        const u = rank[i];
        const col = u < fr ? '#3b82f6' : u < fr + fi ? '#ef4444' : '#22c55e';
        dctx.fillStyle = col;
        dctx.beginPath();
        dctx.arc(8 + (i % 20) * 12.2, 8 + Math.floor(i / 20) * 12.2, 4.3, 0, Math.PI * 2);
        dctx.fill();
      }
    }
    paint(0, rec);
    const live = el('div', { class: 'live-line' }, 'Press ▶ Run to start the simulation.');

    function run() {
      if (stop) stop();
      ER.sfx.tap();
      const r = M.sir(disease.get(), vacc.get(), contact.get());
      const series = [
        { name: 'Susceptible', color: '#16a34a', pts: r.map((x, d) => [d, x.S]) },
        { name: 'Infected', color: '#ef4444', pts: r.map((x, d) => [d, x.I]) },
        { name: 'Recovered / immune', color: '#3b82f6', pts: r.map((x, d) => [d, x.R]) },
      ];
      let d = 0;
      chart.show(series, 0);
      stop = ER.play(() => {
        d += 2;
        chart.setUpTo(d);
        paint(d, r);
        const s = r[Math.min(d, 120)];
        live.textContent = `Day ${Math.min(d, 120)}:  🟢 ${Math.round(s.S)} susceptible   🔴 ${Math.round(s.I)} infected   🔵 ${Math.round(s.R)} recovered/immune`;
        if (d >= 120) {
          const pk = M.sirPeak(r);
          live.textContent += `   ·   peak infected: ${Math.round(pk.infected)} (hospital limit ${LIMIT}: ${pk.infected < LIMIT ? 'OK ✅' : 'TOO MANY ❌'})`;
          if (disease.get() === 'spreader' && pk.infected < LIMIT && !done.b) {
            done.b = true; ER.sfx.good();
            check();
          }
          return false;
        }
      }, 40);
    }

    const sim = el('div', { class: 'card sim-card' },
      el('h4', {}, '🎛️ Town controls'),
      el('div', { class: 'controls-grid' }, disease.node, vacc.node, contact.node),
      el('div', { class: 'row-center' },
        el('button', { class: 'btn btn-aqua btn-big', onclick: run }, '▶ Run the simulation'),
        el('button', { class: 'btn btn-light', onclick: () => { disease.set('flu'); vacc.set(0); contact.set('normal'); run(); } }, '📋 Load the town records')),
      live,
      el('div', { class: 'sim-split' }, el('div', { class: 'dot-wrap' }, dots, el('p', { class: 'muted small' }, 'Each dot is about 2.5 people.')), chart.node));

    const lock = ER.answerLock({
      title: '📋 Mission A: read the town records',
      note: 'Press "Load the town records" first, then read the red INFECTED line.',
      items: [
        { q: 'On which day is the number of infected people highest?', a: recPeak.day, tol: 2, unit: 'day' },
        { q: 'About how many people are infected at that peak?', a: Math.round(recPeak.infected), tol: 15, unit: 'people' },
        { q: 'About how many people NEVER catch the flu (green line at day 120)?', a: Math.round(rec[120].S), tol: 20, unit: 'people' },
      ],
      onSolved: () => { done.a = true; check(); },
    });

    const quiz = ER.quizSeq([
      { q: 'Predict: half the town (50%) is vaccinated against the seasonal flu. What happens to the PEAK number of infected people?',
        opts: ['It becomes much lower', 'It stays about the same', 'It becomes much higher', 'It moves to day 0'],
        a: 'It becomes much lower' },
      { q: 'Why does vaccination also help people who are NOT vaccinated?',
        opts: ['Fewer infected people means fewer chances for the virus to spread', 'It gives them a free vaccine at the clinic nearby', 'It makes the virus go extinct instantly everywhere', 'It does not help people who are not vaccinated'],
        a: 'Fewer infected people means fewer chances for the virus to spread' },
      { q: 'In an SIR model, what does the letter I stand for?',
        opts: ['Infected', 'Immune system', 'Increasing', 'Individuals'], a: 'Infected' },
    ], () => { done.c = true; check(); }, '🔮 Mission C: predict');

    let check = () => { if (done.a && done.b && done.c) api.solve(); };

    const tabs = ER.missionTabs([
      { id: 'a', icon: '📋', label: 'Read the records', goal: 'Load the town records, read the red infected line and answer 3 questions.', node: lock.node, done: () => done.a },
      { id: 'b', icon: '🏥', label: 'Control the virus', goal: 'Pick the super-spreader virus and keep the infected peak under the hospital limit of ' + LIMIT + '.', done: () => done.b },
      { id: 'c', icon: '🔮', label: 'Predict', goal: 'Make three predictions.', node: quiz, done: () => done.c },
    ]);
    body.append(el('p', { class: 'lead' }, '🦠 A virus has reached a town of 1000 people. Change the settings and watch what happens!'),
      tabs.tabs,
      el('div', { class: 'sir-chips' }, el('span', { class: 'sir-s' }, '🟢 Susceptible (could catch it)'), el('span', { class: 'sir-i' }, '🔴 Infected'), el('span', { class: 'sir-r' }, '🔵 Recovered / immune')),
      sim, tabs.panel);
    check = ((orig) => () => { orig(); try { tabs.refresh(); } catch (e) { console.error(e); } })(check);
    return () => { if (stop) stop(); };
  },
});
