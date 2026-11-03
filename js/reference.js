/* The two reference popups: the Model Handbook, and Science or Not?
   Available from the top bar, the central console, and inside every station. They are free and unlimited. */
(function () {
  const { el } = ER;

  const term = (icon, word, meaning, example) =>
    el('div', { class: 'term-card' },
      el('div', { class: 'term-icon' }, icon),
      el('div', {}, el('h4', {}, word), el('p', {}, meaning), el('p', { class: 'term-eg' }, el('b', {}, 'Example: '), example)));

  function handbook() {
    return el('div', { class: 'ref' },
      el('p', { class: 'ref-lead' }, 'A short guide to the words and ideas in this room. You do not need to memorise any of it: you just need to be able to use it.'),
      el('div', { class: 'term-grid' },
        term('📊', 'Data', 'Facts and numbers collected by observing or measuring. Data can be numbers (height, temperature) or not numbers (colours, opinions, photos).', 'A table of how many hares lived in a park each year.'),
        term('🧪', 'Model', 'A simplified copy of something real, used to understand it or predict what it will do. It can be a drawing, a physical object, an equation or a computer program.', 'A weather model, a globe, a disease-spread simulation.'),
        term('💻', 'Simulation', 'A computer model that runs through time. You can change the settings (variables) and watch what happens, without touching the real world.', 'Changing how many people are vaccinated and watching the outbreak change.'),
        term('🎚️', 'Variable', 'Something that can be changed or measured in a model. To test fairly, change ONE variable at a time and keep the others the same.', 'Hours of sunlight, water, temperature.'),
        term('〰️', 'Pattern / trend', 'A regular way data changes over time: going up, going down, repeating in cycles, or levelling off.', 'Predator and prey numbers rise and fall in cycles.'),
        term('🔮', 'Prediction', 'An informed guess about what will happen next, using a pattern in data or a model. It is not a certainty.', '"If the trend continues, the temperature will be higher in 2035."'),
        term('⚠️', 'Limitation', 'Something a model leaves out or cannot show. Every model has limits, which is why scientists compare predictions with real observations.', 'A predator-prey model that ignores disease or fire.')),
      el('h4', { class: 'ref-sub' }, '🧪 Four kinds of model'),
      el('div', { class: 'vs-grid four' },
        el('div', { class: 'vs-card' }, el('h4', {}, '🧱 Physical'), el('p', {}, 'A 3D object you can hold or see: a skeleton, a globe, a plastic atom kit.')),
        el('div', { class: 'vs-card' }, el('h4', {}, '🗺️ Conceptual'), el('p', {}, 'A diagram or drawing of an idea: a food web, a water cycle poster.')),
        el('div', { class: 'vs-card' }, el('h4', {}, '🧮 Mathematical'), el('p', {}, 'Equations and formulas: speed = distance ÷ time.')),
        el('div', { class: 'vs-card' }, el('h4', {}, '💻 Computational'), el('p', {}, 'A program that simulates something: a weather forecast, a virus simulator.'))),
      el('h4', { class: 'ref-sub' }, '🦠 The SIR disease model'),
      el('p', {}, 'People move through three groups: ', el('b', { class: 'sir-s' }, 'S'), 'usceptible (could catch it) → ', el('b', { class: 'sir-i' }, 'I'), 'nfected (have it now) → ', el('b', { class: 'sir-r' }, 'R'), 'ecovered or immune (cannot catch it, including people who are vaccinated).'));
  }

  function science() {
    const col = (title, cls, items) => el('div', { class: 'vs-card ' + cls }, el('h4', {}, title), el('ul', {}, items.map((t) => el('li', {}, t))));
    return el('div', { class: 'ref' },
      el('p', { class: 'ref-lead' }, 'Science explains the natural world using evidence. Pseudoscience can sound scientific, but it does not follow the same rules.'),
      el('div', { class: 'vs-grid' },
        col('✅ A scientific approach', 'scalar', [
          'Uses data that is valid, reliable and accurate',
          'Can be TESTED and REPEATED by other people',
          'Checked by other scientists (peer review)',
          'Changes its mind when new evidence appears',
          'Makes claims that could be proven wrong']),
        col('🚩 A non-scientific approach', 'vector', [
          'Relies on belief, tradition or opinion',
          'Cannot be tested or repeated under controlled conditions',
          'Ignores evidence that disagrees',
          'Uses personal stories ("it worked for me") instead of data',
          'Makes vague claims that cannot be proven wrong, like "brings positive energy"'])),
      el('p', { class: 'ref-lead' }, el('b', {}, 'Why it matters: '), 'people who cannot tell the difference can waste money, believe false claims, spread misinformation, or make unsafe choices about their health.'));
  }

  ER.reference = {
    handbook() {
      ER.sfx.open();
      ER.modal({ title: '📖 Model handbook', content: handbook(), className: 'ref-modal', buttons: [{ label: 'Back to work', class: 'btn-aqua btn-big' }] });
    },
    science() {
      ER.sfx.open();
      ER.modal({ title: '🔬 Science or not?', content: science(), className: 'ref-modal', buttons: [{ label: 'Back to work', class: 'btn-aqua btn-big' }] });
    },
    buttons() {
      return [
        el('button', { class: 'btn btn-ref', title: 'Model handbook', onclick: () => ER.reference.handbook() }, '📖 Handbook'),
        el('button', { class: 'btn btn-ref', title: 'Science or not?', onclick: () => ER.reference.science() }, '🔬 Science?'),
      ];
    },
  };
})();
