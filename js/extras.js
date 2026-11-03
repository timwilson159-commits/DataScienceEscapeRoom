/* Sorting cards into category bins. Count-only feedback, like the rest of this room. */
(function () {
  ER.sortTask = function ({ bins, cards, checkText = '✔ Check my sorting', trayTitle = 'Cards', onSolved }) {
    const el = ER.el;
    const cardEls = cards.map((c) => el('button', { class: 'mt-card', 'data-cat': c.cat }, c.content));
    const tray = el('div', { class: 'tray mt-tray' });
    ER.shuffle(cardEls).forEach((c) => tray.append(c));
    const drops = [];
    const binsEl = el('div', { class: 'sort-bins' }, bins.map((b) => {
      const drop = el('div', { class: 'bin-drop', 'data-cat': b.id });
      drops.push(drop);
      return el('div', { class: 'sort-bin' }, el('h4', {}, b.title), b.desc ? el('p', {}, b.desc) : null, drop);
    }));
    const fb = el('p', { class: 'feedback', 'aria-live': 'polite' });
    const btn = el('button', { class: 'btn btn-aqua btn-big' }, checkText);
    ER.dnd({
      pieces: cardEls, zones: drops, tray,
      onDrop(card, zone) {
        ER.sfx.tap();
        (zone || tray).append(card);
        fb.textContent = '';
      },
    });
    btn.addEventListener('click', () => {
      const left = tray.querySelectorAll('.mt-card').length;
      if (left) { ER.sfx.bad(); ER.say(fb, `Sort every card first (${left} still in the tray).`, 'bad'); return; }
      let right = 0;
      drops.forEach((d) => d.querySelectorAll('.mt-card').forEach((c) => { if (c.dataset.cat === d.dataset.cat) right++; }));
      if (right === cards.length) {
        btn.hidden = true;
        tray.hidden = true;
        cardEls.forEach((c) => c.classList.add('locked'));
        ER.sfx.good();
        ER.say(fb, '✅ All sorted correctly!', 'good');
        if (onSolved) onSolved();
      } else {
        ER.sfx.bad();
        ER.shake(binsEl);
        ER.cooldown(btn, 5);
        ER.say(fb, `${right} of ${cards.length} cards are in the right bin. Move the ones you are least sure about.`, 'bad');
      }
    });
    return el('div', { class: 'match-task' }, binsEl, el('h4', { class: 'tray-title' }, trayTitle), tray, el('div', { class: 'row-center' }, btn), fb);
  };
})();
