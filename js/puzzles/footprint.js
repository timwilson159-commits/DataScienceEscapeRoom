/* Station 1: Footprint Trail. Digital footprints, kinds of data, and sources of data. */
ER.register({
  id: 'footprint',
  title: 'Footprint Trail',
  icon: '👣',
  kind: 'digital',
  tagline: 'Follow Alex\'s online day and sort what they leave behind',
  code: { letter: 'W', number: 1 },
  fact: 'Every click, search and post can become data. A digital footprint is the trail of data you leave online. An ACTIVE footprint is what you choose to share. A PASSIVE footprint is collected about you without you doing anything.',
  hints: [
    'Ask yourself: did Alex CHOOSE to share this (active), or was it recorded in the background while Alex just used the app (passive)? Things that happen face to face or on paper leave no digital footprint at all.',
    'Numerical data is a number or measurement you could put on a graph axis. Non-numerical data describes a quality: a colour, a type, a picture, a sound.',
  ],
  answerKey() {
    return ER.keyList([
      'Active: posting a photo, star review, commenting, subscribing to a newsletter.',
      'Passive: phone location, cookies tracking browsing, app usage log, clicks remembered by a website.',
      'No digital footprint: chatting face to face, writing in a paper diary.',
      'Numerical: height, number of pets, hours of screen time, classroom temperature. Non-numerical: pizza topping, eye colour, a photo, song lyrics.',
      'Quiz: remove the school name and location from the post / use the strongest privacy settings; a citizen-science website where people upload recordings; use a different, hard-to-guess password for each account.',
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
        { q: 'Alex wants to post a photo in school uniform, tagged with the school name and the exact location. What is the safest choice?',
          opts: ['Remove the school name and location tag before posting', 'Post it with everything, because only friends will see it', 'Post it now and delete the photo after a week', 'Tag some extra places so the photo looks fun'],
          a: 'Remove the school name and location tag before posting' },
        { q: 'A scientist wants a HUGE data set about frog calls across Australia. Which is the best source?',
          opts: ['A citizen-science website where thousands of people upload recordings', 'One friend\'s opinion about the frogs they heard once', 'A made-up story about frogs written by a student', 'A drawing of a frog copied out of a library book'],
          a: 'A citizen-science website where thousands of people upload recordings' },
        { q: 'Which habit best protects your digital identity?',
          opts: ['A different, hard-to-guess password for each account', 'Using one easy password everywhere so you never forget it', 'Sharing your passwords with a few close friends', 'Accepting every friend request you get online'],
          a: 'A different, hard-to-guess password for each account' },
      ], () => { done.c = true; check(); }, '🛡️ Safe and smart'));
    }

    function stage2() {
      hosts[1].append(ER.sortTask({
          trayTitle: 'Data cards',
          bins: [
            { id: 'num', title: '🔢 Numerical data', desc: 'A number or measurement' },
            { id: 'non', title: '🎨 Non-numerical data', desc: 'A quality, type, picture or sound' },
          ],
          cards: [
            { cat: 'num', content: card('Height of each student (cm)') },
            { cat: 'num', content: card('Number of pets in a household') },
            { cat: 'num', content: card('Hours of screen time each day') },
            { cat: 'num', content: card('Temperature in the classroom (°C)') },
            { cat: 'non', content: card('Favourite pizza topping') },
            { cat: 'non', content: card('Eye colour') },
            { cat: 'non', content: card('A photo of a sunset') },
            { cat: 'non', content: card('The lyrics of a song') },
          ],
          onSolved: () => { done.b = true; check(); },
        }));
    }

    hosts[0].append(ER.sortTask({
        trayTitle: 'What Alex did today',
        bins: [
          { id: 'active', title: '✍️ Active footprint', desc: 'Alex chose to share it' },
          { id: 'passive', title: '🕵️ Passive footprint', desc: 'Collected in the background' },
          { id: 'none', title: '🌿 No digital footprint', desc: 'Offline' },
        ],
        cards: [
          { cat: 'active', content: card('Posting a photo on social media') },
          { cat: 'active', content: card('Leaving a star review for a shop') },
          { cat: 'active', content: card('Commenting on a friend\'s video') },
          { cat: 'active', content: card('Subscribing to a newsletter with an email') },
          { cat: 'passive', content: card('Phone location tracking where Alex walked') },
          { cat: 'passive', content: card('Cookies tracking which sites Alex browsed') },
          { cat: 'passive', content: card('An app logging how long Alex used it') },
          { cat: 'passive', content: card('A website remembering which pages Alex clicked') },
          { cat: 'none', content: card('Chatting face to face at lunch') },
          { cat: 'none', content: card('Writing in a paper diary') },
        ],
        onSolved: () => { done.a = true; check(); },
      }));
    stage2(); stage3();
    const tabs = ER.missionTabs([
      { id: 'a', icon: '👣', label: 'Footprints', goal: 'Drag each card into the right box.', node: hosts[0], done: () => done.a },
      { id: 'b', icon: '🔢', label: 'Kinds of data', goal: 'Drag each card into numerical or non-numerical.', node: hosts[1], done: () => done.b },
      { id: 'c', icon: '🛡️', label: 'Safe and smart', goal: 'Pick the best answer for each question.', node: hosts[2], done: () => done.c },
    ]);
    check = ((orig) => () => { orig(); try { tabs.refresh(); } catch (e) { console.error(e); } })(check);
    body.append(el('p', { class: 'lead' }, "👣 Follow Alex's online day and sort what it leaves behind."), tabs.tabs, tabs.panel);

  },
});
