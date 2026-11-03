/* Station 9: Model Museum. Types of scientific model and what models are for. */
ER.register({
  id: 'museum',
  title: 'Model Museum',
  icon: '🏛️',
  kind: 'digital',
  tagline: 'Sort the exhibits into the four types of model',
  code: { letter: 'V', number: 9 },
  fact: 'A scientific model is a simplified representation of something real, built from data and observations. Models help us study things that are too big, too small, too slow, too fast, too complex or too dangerous to study directly. They are never exactly the same as the real thing.',
  hints: [
    'Physical: you could pick it up or walk around it. Conceptual: a diagram or drawing of an idea. Mathematical: a formula or equation. Computational: a computer program that simulates something.',
    'For the matching task, ask "what real thing does this model stand in for?" A solar system simulation stands in for planets moving; a weather model stands in for future weather.',
  ],
  answerKey() {
    return ER.keyList([
      'Physical: plastic skeleton, globe, solar-system ball model, jelly cell model.',
      'Conceptual: water-cycle diagram, food-web poster, labelled drawing of a plant cell.',
      'Mathematical: speed = distance ÷ time; population equation; temperature conversion formula.',
      'Computational: weather forecast program, virus-spread simulator, climate simulation.',
      'Matching: solar system → movement of planets; weather model → possible future weather; cell model → parts of a cell; disease simulation → how a disease might spread.',
      'Quiz: too big/small/dangerous to study directly; not exactly the same as the real world; compare predictions with real observations.',
    ]);
  },
  build(body, api) {
    const { el } = ER;
    const hosts = [el('div'), el('div'), el('div')];
    const done = { a: false, b: false, c: false };
    let check = () => { if (done.a && done.b && done.c) api.solve(); };
    const card = (icon, t) => el('span', { class: 'exhibit' }, el('b', {}, icon), ' ', t);

    function stage3() {
      hosts[2].append(ER.quizSeq([
          { q: 'Why do scientists use models instead of always studying the real thing?',
            opts: ['Real things can be too big, small, slow or dangerous', 'Models are always more accurate than real things are', 'Real things are boring so models are more fun to use', 'Models can replace all experiments completely'],
            a: 'Real things can be too big, small, slow or dangerous' },
          { q: 'A student says "A computer model is exactly the same as the real world." What is wrong with that?',
            opts: ['Models are simplified and leave things out', 'Nothing is wrong, the statement is totally correct', 'Computers cannot show anything about the real world', 'Models are always completely wrong in every way'],
            a: 'Models are simplified and leave things out' },
          { q: 'How can scientists check whether a model is reliable?',
            opts: ['Compare its predictions with real observations', 'Never test it, because testing makes it worse', 'Make it more complicated without checking it', 'Run it once and then trust the result forever'],
            a: 'Compare its predictions with real observations' },
        ], () => { done.c = true; check(); }, '🛡️ Why models matter'));
    }

    function stage2() {
      hosts[1].append(ER.matchTask({
          layout: 'wide',
          checkText: '✔ Check my matches',
          slots: [
            { label: '☀️ Solar system simulation', accept: 'planets' },
            { label: '⛅ Weather prediction model', accept: 'weather' },
            { label: '🔬 A model of a cell', accept: 'cell' },
            { label: '🦠 Disease-spread simulation', accept: 'disease' },
          ],
          cards: [
            { id: 'planets', content: 'The movement of planets' },
            { id: 'weather', content: 'Possible future weather conditions' },
            { id: 'cell', content: 'The parts of a cell' },
            { id: 'disease', content: 'How a disease might spread through a population' },
          ],
          onSolved: () => { done.b = true; check(); },
        }));
    }


    hosts[0].append(ER.sortTask({
        trayTitle: 'Exhibits',
        bins: [
          { id: 'phys', title: '🧱 Physical', desc: 'A 3D object' },
          { id: 'conc', title: '🗺️ Conceptual', desc: 'A diagram or drawing of an idea' },
          { id: 'math', title: '🧮 Mathematical', desc: 'An equation or formula' },
          { id: 'comp', title: '💻 Computational', desc: 'A computer simulation' },
        ],
        cards: [
          { cat: 'phys', content: card('🦴', 'A plastic skeleton of the human body') },
          { cat: 'phys', content: card('🌍', 'A globe of the Earth') },
          { cat: 'phys', content: card('🪐', 'Balls on wires showing the solar system') },
          { cat: 'phys', content: card('🍬', 'A cell made out of jelly and lollies') },
          { cat: 'conc', content: card('💧', 'A diagram of the water cycle') },
          { cat: 'conc', content: card('🕸️', 'A food web poster') },
          { cat: 'conc', content: card('🌿', 'A labelled drawing of a plant cell') },
          { cat: 'math', content: card('➗', 'speed = distance ÷ time') },
          { cat: 'math', content: card('👥', 'New population = old + births − deaths') },
          { cat: 'math', content: card('🌡️', 'The formula to change °C into °F') },
          { cat: 'comp', content: card('⛅', 'A program that forecasts tomorrow\'s weather') },
          { cat: 'comp', content: card('🦠', 'A simulator showing how a virus spreads') },
        ],
        onSolved: () => { done.a = true; check(); },
      }));
    stage2(); stage3();
    const tabs = ER.missionTabs([
      { id: 'a', icon: '🧱', label: 'Sort the exhibits', goal: 'Drag each exhibit into its model type.', node: hosts[0], done: () => done.a },
      { id: 'b', icon: '🔗', label: 'What does it stand for?', goal: 'Match each model to what it represents.', node: hosts[1], done: () => done.b },
      { id: 'c', icon: '🛡️', label: 'Why models?', goal: 'Pick the best answer for each question.', node: hosts[2], done: () => done.c },
    ]);
    check = ((orig) => () => { orig(); try { tabs.refresh(); } catch (e) { console.error(e); } })(check);
    body.append(el('p', { class: 'lead' }, "🏛️ Every exhibit is a model, a simplified copy of the real world."), tabs.tabs, tabs.panel);

  },
});
