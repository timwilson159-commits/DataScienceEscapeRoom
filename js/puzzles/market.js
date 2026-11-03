/* Station 8: Fact or Fake Market. Scientific versus non-scientific approaches. */
ER.register({
  id: 'market',
  title: 'Fact or Fake Market',
  icon: '🔮',
  kind: 'digital',
  tagline: 'Sort the stall claims into science and pseudoscience',
  code: { letter: 'S', number: 8 },
  fact: 'Science is not just "what scientists say". It is a way of working: test it, repeat it, let others check it, and change your mind when the evidence changes. Claims that cannot be tested, rely on stories, or ignore evidence may sound scientific but are not.',
  hints: [
    'Ask of each card: could someone TEST this and get a result that other people could REPEAT? Is it checked by other scientists? Or does it only rely on belief, stories or vague promises?',
    'Red flags: a vague claim ("positive energy") you cannot measure, personal stories instead of data, ignoring evidence that disagrees, and claims that nobody has tested under controlled conditions.',
  ],
  answerKey() {
    return ER.keyList([
      'Science: the controlled-trial medicine; published method others can repeat; peer review; forecast compared with what happened; advice changed after new evidence.',
      'Pseudoscience: positive-energy crystal; "worked for me once"; miracle bracelet ignoring doctors; phrenology (bumps on the head); iridology that fails controlled tests.',
      'Red flags: positive energy = vague claim that can\'t be tested; "worked for me" = personal stories; ignore the doctors = ignores contradicting evidence; cure-all tonic = never tested.',
      'Quiz: testimonials without test results are not enough; ask for controlled testing or independent peer-reviewed results.',
    ]);
  },
  build(body, api) {
    const { el } = ER;
    const hosts = [el('div'), el('div'), el('div')];
    const done = { a: false, b: false, c: false };
    let check = () => { if (done.a && done.b && done.c) api.solve(); };
    const card = (t) => el('span', {}, t);

    function stage3() {
      hosts[2].append(ER.quizSeq([
          { q: 'An advert for a "health boost" gives only happy customer stories and no test results. Why are stories alone not enough?',
            opts: ['Stories can be coincidence and are not controlled tests', 'Stories are always lies and never worth listening to', 'Stories are only allowed in books and magazines', 'There is no real reason to ask for test results'],
            a: 'Stories can be coincidence and are not controlled tests' },
          { q: 'Which evidence would make you MOST willing to trust the product\'s claim?',
            opts: ['Repeated controlled tests, checked by independent scientists', 'A famous celebrity says they really like it a lot', 'The box has the word "science" printed on the front', 'Lots of people have shared the advert online today'],
            a: 'Repeated controlled tests, checked by independent scientists' },
          { q: 'What is the most important difference between a scientific and a non-scientific approach?',
            opts: ['Scientific claims are tested with evidence and can change', 'Scientists are always right about everything they say', 'Non-scientific ideas are always completely false', 'Scientific ideas never change once they are published'],
            a: 'Scientific claims are tested with evidence and can change' },
        ], () => { done.c = true; check(); }, '🛡️ Think like a scientist'));
    }

    function stage2() {
      hosts[1].append(ER.matchTask({
          layout: 'wide',
          checkText: '✔ Check my red flags',
          noun: 'matched to the right red flag',
          slots: [
            { label: '🔮 "This crystal brings positive energy into your body!"', accept: 'vague' },
            { label: '🗣️ "It worked for me once, so it will work for you!"', accept: 'story' },
            { label: '🙉 "Our bracelet cures pain. Ignore the doctors who disagree."', accept: 'ignore' },
            { label: '🧴 "Our tonic cures everything! No studies needed. Just trust us."', accept: 'untested' },
          ],
          cards: [
            { id: 'vague', content: 'Vague claim that cannot be tested' },
            { id: 'story', content: 'Personal stories instead of data' },
            { id: 'ignore', content: 'Ignores evidence that disagrees' },
            { id: 'untested', content: 'Never tested under controlled conditions' },
          ],
          onSolved: () => { done.b = true; check(); },
        }));
    }


    hosts[0].append(ER.sortTask({
        trayTitle: 'Stall claims',
        bins: [
          { id: 'sci', title: '✅ Scientific approach', desc: 'Tested, repeatable, open to change' },
          { id: 'pseudo', title: '🚩 Non-scientific approach', desc: 'Belief, stories, vague or untestable' },
        ],
        cards: [
          { cat: 'sci', content: card('A medicine is tested in controlled trials before it is sold.') },
          { cat: 'sci', content: card('Researchers publish their method so other labs can repeat the experiment.') },
          { cat: 'sci', content: card('A study is checked by independent scientists before it is published (peer review).') },
          { cat: 'sci', content: card('A forecast is compared with what actually happened, then the model is improved.') },
          { cat: 'sci', content: card('Scientists changed their advice when new evidence showed the old idea was wrong.') },
          { cat: 'pseudo', content: card('"This crystal brings positive energy!"') },
          { cat: 'pseudo', content: card('"It worked for me once, so it must work for everyone!"') },
          { cat: 'pseudo', content: card('"Our bracelet cures pain. Ignore any doctors who disagree."') },
          { cat: 'pseudo', content: card('Reading the bumps on your head to reveal your personality (phrenology).') },
          { cat: 'pseudo', content: card('Iridology: the eye reveals every illness.') },
        ],
        onSolved: () => { done.a = true; check(); },
      }));
    stage2(); stage3();
    const tabs = ER.missionTabs([
      { id: 'a', icon: '🔬', label: 'Science or not?', goal: 'Drag each claim into the right box.', node: hosts[0], done: () => done.a },
      { id: 'b', icon: '🚩', label: 'Red flags', goal: 'Match each claim to its red flag.', node: hosts[1], done: () => done.b },
      { id: 'c', icon: '🛡️', label: 'Think like a scientist', goal: 'Pick the best answer for each question.', node: hosts[2], done: () => done.c },
    ]);
    check = ((orig) => () => { tabs.refresh(); orig(); })(check);
    body.append(el('p', { class: 'lead' }, "🔮 Every stall has a claim. Which ones are science?"), tabs.tabs, tabs.panel);

  },
});
