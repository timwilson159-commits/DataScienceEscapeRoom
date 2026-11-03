/* The shelter hatch: two "talk like a data scientist" checks guarding a shift cypher. */
(function () {
  const { el, sfx } = ER;
  const ANSWER = 'SIMULATOR';
  const SHIFT = 4;
  const CATS = ['Data', 'Model', 'Prediction', 'Pattern', 'Limitation', 'Variable'];

  // Wrong answers redraw from here, so the pool has to be big.
  const BANK = [
    ['The hare count in the park was 140 in Year 5.', 'Data'],
    ['The thermometer read 31°C at noon.', 'Data'],
    ['A survey found 12 students prefer red Starbursts.', 'Data'],
    ['The graph shows 85 infected people on day 20.', 'Data'],
    ['A table of the plant heights recorded each day.', 'Data'],
    ['A computer program that simulates how a virus spreads.', 'Model'],
    ['A plastic skeleton used to study the human body.', 'Model'],
    ['An equation that calculates population change each year.', 'Model'],
    ['A diagram of a food web showing who eats whom.', 'Model'],
    ['A weather forecasting program that uses wind and cloud data.', 'Model'],
    ['If vaccination rises, then fewer people will become infected.', 'Prediction'],
    ['The population will probably fall below 45,000 by 2050.', 'Prediction'],
    ['Based on the model, the cyclone will reach the coast on Friday.', 'Prediction'],
    ['If the trend continues, next year\'s temperature will be higher.', 'Prediction'],
    ['Lynx numbers go up a little after hare numbers go up.', 'Pattern'],
    ['Temperatures rise and fall in a repeating cycle through the seasons.', 'Pattern'],
    ['Predator and prey populations rise and fall in repeating cycles.', 'Pattern'],
    ['Plant growth increases with sunlight, then levels off.', 'Pattern'],
    ['The model ignores disease, fire and flooding.', 'Limitation'],
    ['The simulation cannot include every factor in the real world.', 'Limitation'],
    ['A weakness of the model is that it leaves out some real-world factors.', 'Limitation'],
    ['This model does not account for people moving into or out of the town.', 'Limitation'],
    ['The amount of water given to a plant.', 'Variable'],
    ['How much vaccination there is, chosen and changed by the scientist.', 'Variable'],
    ['The temperature a scientist chooses to test.', 'Variable'],
    ['The number of wolves added to the bunny simulation.', 'Variable'],
  ];

  function draw(n, used) {
    let pool = BANK.map((_, i) => i).filter((i) => !used.has(i));
    if (pool.length < n) { used.clear(); pool = BANK.map((_, i) => i); }
    const picked = [];
    // aim for different categories in each draw
    const cats = ER.shuffle(CATS);
    for (const c of cats) {
      if (picked.length >= n) break;
      const opts = pool.filter((i) => BANK[i][1] === c && !picked.includes(i));
      if (opts.length) picked.push(opts[Math.floor(Math.random() * opts.length)]);
    }
    picked.forEach((i) => used.add(i));
    return ER.shuffle(picked).map((i) => ({ t: BANK[i][0], cat: BANK[i][1] }));
  }

  const used = new Set();

  function makeGate({ title, intro, buttonText, onPass }) {
    const list = el('div');
    const fb = el('p', { class: 'feedback', 'aria-live': 'polite' });
    const btn = el('button', { class: 'btn btn-aqua btn-big' }, buttonText);
    let picks = [], items = [];

    function render() {
      items = draw(4, used);
      picks = items.map(() => null);
      list.innerHTML = '';
      items.forEach((s, i) => {
        const picksEl = el('div', { class: 'law-picks' });
        CATS.forEach((c) => {
          const b = el('button', {
            class: 'law-pick', type: 'button',
            onclick: () => {
              picks[i] = c;
              [...picksEl.children].forEach((x) => x.classList.toggle('on', x.textContent === c));
              sfx.tap();
            },
          }, c);
          picksEl.append(b);
        });
        list.append(el('div', { class: 'scenario' }, el('span', { class: 's-num' }, String(i + 1)), el('span', {}, s.t), picksEl));
      });
    }

    btn.addEventListener('click', () => {
      if (picks.some((p) => !p)) { sfx.bad(); ER.say(fb, 'Choose a word for every statement.', 'bad'); return; }
      const right = picks.filter((p, i) => p === items[i].cat).length;
      if (right === items.length) {
        sfx.good();
        ER.say(fb, '✅ Check passed.', 'good');
        btn.disabled = true;
        list.classList.add('locked-panel');
        onPass();
      } else {
        sfx.bad();
        ER.say(fb, `${right} of ${items.length} correct. The computer has wiped the panel and loaded NEW statements.`, 'bad');
        render();
      }
    });

    render();
    return el('div', { class: 'card gate-card' }, el('h4', {}, title), el('p', {}, intro), list, el('div', { class: 'row-center' }, btn), fb);
  }

  const A = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  function cipherKey() {
    const row = (label, fn, cls) => el('tr', { class: cls },
      el('th', {}, label), ...A.split('').map((_, i) => el('td', {}, fn(i))));
    return el('div', { class: 'tabula-scroll' }, el('table', { class: 'shift-key' },
      row('Real letter', (i) => A[i], 'plain'),
      row('Coded letter', (i) => A[(i + SHIFT) % 26], 'coded')));
  }

  ER.door = {
    id: 'door',
    title: 'Shelter hatch',
    icon: '🚪',
    kind: 'door',
    tagline: 'Pass two model checks, then decode the password',
    bank: BANK,
    hints: [
      'Every coded letter was made by moving a real letter FORWARD 4 places in the alphabet (A becomes E, B becomes F...). To decode, go BACK 4 places, or find your coded letter in the bottom row of the key and read the real letter above it.',
      'The password is one word with 9 letters, and it describes what YOU have been doing all the way around the station: running simulations of things in the real world.',
    ],
    build(body, api) {
      if (!api.allDone) return buildLocked(body, api);
      return buildHatch(body, api);
    },
  };

  function buildLocked(body, api) {
    const have = api.codes().length;
    body.append(
      el('div', { class: 'card door-locked' },
        el('div', { class: 'big-lock' }, '🔒'),
        el('h3', {}, `The hatch computer needs all ${ER.puzzles.length} codes. You have ${have}.`),
        el('div', { class: 'lock-lights' }, ...Array.from({ length: ER.puzzles.length }, (_, i) => el('span', { class: i < have ? 'on' : '' }))),
        el('p', {}, 'Stations still to solve:'),
        el('ul', { class: 'missing-list' }, api.missing().map((d) => el('li', {}, el('span', {}, d.icon), ' ', d.title))),
        el('p', { class: 'muted' }, 'Solve every station, then come back. The hatch will test your data-science vocabulary before it shows you the decoder.')));
    return null;
  }

  function buildHatch(body, api) {
    const codes = api.codes().map((d) => d.code).sort((a, b) => a.number - b.number);

    body.append(el('div', { class: 'card door-intro' },
      el('div', { class: 'door-intro-icon' }, '🔐'),
      el('div', {},
        el('h3', {}, 'Shelter hatch release'),
        el('p', {}, 'The hatch computer only trusts people who can talk like data scientists. There are ',
          el('b', {}, 'two model checks'), ', then a coded password made from your 9 letters.'),
        el('p', { class: 'muted small' }, 'Get a check wrong and the computer wipes the panel and loads brand new statements, so think before you click.'))));

    const decodeBoxes = ER.letterBoxes(ANSWER.length, { label: 'Password letter' });
    const symbolRow = el('div', { class: 'symbol-row' },
      codes.map((c, i) => el('div', { class: 'symbol-slot' },
        el('small', {}, '#' + c.number),
        el('span', { class: 'code-letter-tile' }, c.letter),
        decodeBoxes.inputs[i])));

    const submitFb = el('p', { class: 'feedback', 'aria-live': 'polite' });
    const submitBtn = el('button', { class: 'btn btn-sun btn-big' }, '🌀 Open the hatch');
    submitBtn.disabled = true;
    submitBtn.addEventListener('click', () => {
      if (!decodeBoxes.full()) { sfx.bad(); ER.say(submitFb, `Fill in all ${ANSWER.length} letters first.`, 'bad'); return; }
      const v = ER.norm(decodeBoxes.value());
      if (v === ANSWER) {
        decodeBoxes.lock();
        submitBtn.disabled = true;
        sfx.solve();
        ER.say(submitFb, '🔓 PASSWORD ACCEPTED. Hatch opening...', 'good');
        setTimeout(() => api.escape(), 1400);
      } else {
        sfx.bad();
        const right = [...v].filter((ch, i) => ch === ANSWER[i]).length;
        ER.say(submitFb, `${right} of ${ANSWER.length} letters are correct. Check your shifting again.`, 'bad');
        ER.cooldown(submitBtn, 10);
      }
    });

    const decodePanel = el('div', { class: 'card locked-panel' },
      el('h4', {}, '🔠 Step 3: decode the password'),
      el('p', {}, 'Your coded letters are shown in number order. Shift each one back to its real letter using the key below, and type it underneath.'),
      symbolRow,
      el('div', { class: 'row-center' }, submitBtn),
      submitFb);

    const keyPanel = el('div', { class: 'card locked-panel' },
      el('h4', {}, '🗝️ Shift key: the storm moved every letter 4 places forward'),
      el('p', { class: 'muted small' }, 'Find your coded letter in the bottom row. The real letter is directly above it.'),
      cipherKey());

    const gate2Host = el('div');
    const gate1 = makeGate({
      title: '🛡️ Model check 1: unlock the decoder',
      intro: 'Choose the word that best describes each statement.',
      buttonText: '🔓 Submit model check 1',
      onPass: () => {
        decodePanel.classList.remove('locked-panel');
        keyPanel.classList.remove('locked-panel');
        gate2Host.append(makeGate({
          title: '🛡️ Model check 2: arm the keypad',
          intro: 'One more set and the hatch keypad will accept your password.',
          buttonText: '🔓 Submit model check 2',
          onPass: () => {
            submitBtn.disabled = false;
            submitBtn.classList.add('armed');
            sfx.good();
            decodeBoxes.focus();
          },
        }));
      },
    });

    body.append(gate1, gate2Host, keyPanel, decodePanel);
    return null;
  }
})();
