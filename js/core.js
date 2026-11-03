/* Core helpers shared by the room, the puzzles and the airlock.
   Feedback style for this room: students are told HOW MANY are right, never which ones. */
(function () {
  const ER = (window.ER = {
    puzzles: [],
    register(def) { this.puzzles.push(def); },
    get(id) { return this.puzzles.find((p) => p.id === id); },
  });

  ER.el = function (tag, props, ...kids) {
    const svgTags = ['svg', 'path', 'rect', 'circle', 'ellipse', 'line', 'polygon', 'polyline', 'g', 'text', 'defs', 'marker', 'tspan'];
    const e = svgTags.includes(tag)
      ? document.createElementNS('http://www.w3.org/2000/svg', tag)
      : document.createElement(tag);
    if (props) {
      for (const k in props) {
        const v = props[k];
        if (v === false || v == null) continue;
        if (k === 'class') e.setAttribute('class', v);
        else if (k === 'style' && typeof v === 'object') Object.assign(e.style, v);
        else if (k.startsWith('on') && typeof v === 'function') e.addEventListener(k.slice(2), v);
        else if (k === 'html') e.innerHTML = v;
        else if (k === 'text') e.textContent = v;
        else e.setAttribute(k, v === true ? '' : v);
      }
    }
    for (const kid of kids.flat()) {
      if (kid == null || kid === false) continue;
      e.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
    }
    return e;
  };

  ER.shuffle = function (arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  ER.norm = (s) => String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  // numbers may be negative and may have a decimal point
  ER.num = (s) => String(s || '').replace(/[^0-9.\-]/g, '').trim();

  ER.say = function (node, msg, kind) {
    node.textContent = msg;
    node.className = 'feedback ' + (kind || '');
    if (kind === 'bad') {
      node.classList.remove('shake');
      void node.offsetWidth;
      node.classList.add('shake');
    }
  };

  ER.shake = function (node) {
    node.classList.remove('shake');
    void node.offsetWidth;
    node.classList.add('shake');
  };

  ER.letterBoxes = function (length, opts = {}) {
    const wrap = ER.el('div', { class: 'letter-boxes' + (opts.small ? ' small' : '') });
    const inputs = [];
    for (let i = 0; i < length; i++) {
      const inp = ER.el('input', {
        class: 'lbox', maxlength: '1', autocomplete: 'off', autocapitalize: 'characters',
        spellcheck: 'false', 'aria-label': (opts.label || 'Letter') + ' ' + (i + 1),
      });
      inp.addEventListener('input', () => {
        inp.value = inp.value.replace(/[^a-zA-Z0-9]/g, '').slice(-1).toUpperCase();
        if (inp.value && inputs[i + 1]) inputs[i + 1].focus();
        if (opts.onChange) opts.onChange(api.value());
      });
      inp.addEventListener('keydown', (e) => {
        if (e.key === 'Backspace' && !inp.value && inputs[i - 1]) {
          inputs[i - 1].focus(); inputs[i - 1].value = ''; e.preventDefault();
          if (opts.onChange) opts.onChange(api.value());
        } else if (e.key === 'ArrowLeft' && inputs[i - 1]) inputs[i - 1].focus();
        else if (e.key === 'ArrowRight' && inputs[i + 1]) inputs[i + 1].focus();
        else if (e.key === 'Enter' && opts.onEnter) opts.onEnter(api.value());
      });
      inp.addEventListener('focus', () => inp.select());
      inputs.push(inp);
      wrap.append(inp);
    }
    const api = {
      node: wrap,
      inputs,
      value: () => inputs.map((x) => x.value || ' ').join(''),
      full: () => inputs.every((x) => x.value),
      set: (s) => inputs.forEach((x, i) => (x.value = s[i] || '')),
      mark(kind) {
        wrap.classList.remove('good', 'bad');
        if (kind) wrap.classList.add(kind);
        if (kind === 'bad') ER.shake(wrap);
      },
      lock() { inputs.forEach((x) => (x.readOnly = true)); },
      focus() { const f = inputs.find((x) => !x.readOnly && !x.value) || inputs[0]; f.focus(); },
    };
    return api;
  };

  /* Drag-and-drop, or tap a card then tap a space. */
  ER.dnd = function ({ pieces, zones, tray, onDrop }) {
    let selected = null;
    const select = (p) => {
      if (selected) selected.classList.remove('selected');
      selected = p;
      if (p) p.classList.add('selected');
      zones.forEach((z) => z.classList.toggle('targeting', !!p));
    };
    zones.forEach((z) => {
      z.classList.add('dz');
      z.addEventListener('click', (e) => {
        if (e.target.closest('.piece')) return;
        if (selected) { const p = selected; select(null); onDrop(p, z); }
      });
    });
    if (tray) {
      tray.addEventListener('click', (e) => {
        if (selected && !e.target.closest('.piece')) { const p = selected; select(null); onDrop(p, null); }
      });
    }
    pieces.forEach((p) => {
      p.classList.add('piece');
      p.addEventListener('pointerdown', (e) => {
        if (p.classList.contains('locked') || e.button > 0) return;
        e.preventDefault();
        const sx = e.clientX, sy = e.clientY;
        let dragging = false;
        let hover = null;
        const move = (ev) => {
          const dx = ev.clientX - sx, dy = ev.clientY - sy;
          if (!dragging && Math.hypot(dx, dy) > 6) {
            dragging = true;
            select(null);
            p.classList.add('dragging');
            zones.forEach((z) => z.classList.add('targeting'));
          }
          if (dragging) {
            p.style.transform = `translate(${dx}px, ${dy}px) scale(1.06)`;
            p.style.pointerEvents = 'none';
            const under = document.elementFromPoint(ev.clientX, ev.clientY);
            const z = under && under.closest('.dz');
            if (hover && hover !== z) hover.classList.remove('hovering');
            hover = z && zones.includes(z) ? z : null;
            if (hover) hover.classList.add('hovering');
          }
        };
        const up = (ev) => {
          window.removeEventListener('pointermove', move);
          window.removeEventListener('pointerup', up);
          window.removeEventListener('pointercancel', up);
          if (dragging) {
            p.classList.remove('dragging');
            p.style.transform = '';
            p.style.pointerEvents = 'none';
            const under = document.elementFromPoint(ev.clientX, ev.clientY);
            p.style.pointerEvents = '';
            if (hover) hover.classList.remove('hovering');
            zones.forEach((z) => z.classList.remove('targeting'));
            const z = under && under.closest('.dz');
            onDrop(p, z && zones.includes(z) ? z : null);
          } else {
            if (window.ER.sfx) ER.sfx.tap();
            select(selected === p ? null : p);
          }
        };
        window.addEventListener('pointermove', move);
        window.addEventListener('pointerup', up);
        window.addEventListener('pointercancel', up);
      });
    });
    return { deselect: () => select(null) };
  };

  /*
   * Drag cards into labelled slots, then press Check.
   * Students are told how many are right, never which ones, and nothing is returned or locked.
   */
  ER.matchTask = function ({ slots, cards, layout = 'list', checkText = '✔ Check my answer', onSolved, noun = 'in the right place' }) {
    const el = ER.el;
    const drops = [];
    const board = el('div', { class: 'mt-board mt-' + layout });
    slots.forEach((s) => {
      const drop = el('div', { class: 'mt-drop', 'data-accept': s.accept });
      drops.push(drop);
      board.append(el('div', { class: 'mt-slot' }, el('div', { class: 'mt-label' }, s.label), drop));
    });
    const tray = el('div', { class: 'tray mt-tray' });
    const cardEls = ER.shuffle(cards).map((c) => {
      const n = el('button', { class: 'mt-card', 'data-id': c.id }, c.content);
      tray.append(n);
      return n;
    });
    const fb = el('p', { class: 'feedback', 'aria-live': 'polite' });
    const btn = el('button', { class: 'btn btn-aqua btn-big' }, checkText);
    ER.dnd({
      pieces: cardEls, zones: drops, tray,
      onDrop(card, zone) {
        ER.sfx.tap();
        if (!zone) { tray.append(card); return; }
        const existing = zone.querySelector('.mt-card');
        if (existing && existing !== card) tray.append(existing);
        zone.append(card);
        fb.textContent = '';
      },
    });
    btn.addEventListener('click', () => {
      const empty = drops.filter((d) => !d.querySelector('.mt-card')).length;
      if (empty) { ER.sfx.bad(); ER.say(fb, `Fill every space first (${empty} still empty).`, 'bad'); return; }
      const right = drops.filter((d) => d.querySelector('.mt-card').dataset.id === d.dataset.accept).length;
      if (right === drops.length) {
        btn.hidden = true;
        tray.hidden = true;
        cardEls.forEach((c) => c.classList.add('locked'));
        drops.forEach((d) => d.classList.add('locked'));
        ER.sfx.good();
        ER.say(fb, '✅ All correct!', 'good');
        if (onSolved) onSolved();
      } else {
        ER.sfx.bad();
        ER.shake(board);
        ER.say(fb, `${right} of ${drops.length} ${noun}. Rethink the ones you are least sure about.`, 'bad');
        ER.cooldown(btn, 5);
      }
    });
    return el('div', { class: 'match-task' }, board, tray, el('div', { class: 'row-center' }, btn), fb);
  };

  // Multiple-choice questions shown one at a time. questions: [{q, opts, a, why}]
  ER.quizSeq = function (questions, onDone, title = '🧠 Question') {
    const el = ER.el;
    const box = el('div', { class: 'card quiz' });
    let i = 0;
    const render = () => {
      box.innerHTML = '';
      const q = questions[i];
      const qfb = el('p', { class: 'feedback' });
      box.append(
        el('h4', {}, `${title} ${i + 1} of ${questions.length}`),
        el('p', {}, q.q),
        q.extra || null,
        el('div', { class: 'quiz-opts' }, ER.shuffle(q.opts).map((o) => el('button', {
          class: 'btn quiz-opt',
          onclick: (e) => {
            if (box.dataset.cool) return;
            if (o === q.a) {
              e.currentTarget.classList.add('right');
              box.querySelectorAll('.quiz-opt').forEach((b) => (b.disabled = true));
              ER.sfx.good();
              i++;
              if (i < questions.length) { ER.say(qfb, '✅ Correct!', 'good'); setTimeout(render, 900); }
              else { ER.say(qfb, '🎉 Correct!', 'good'); if (onDone) onDone(); }
            } else {
              // no elimination: the wrong option is not marked, and answers are locked for a few seconds
              ER.sfx.bad();
              ER.say(qfb, 'Not quite. Think it through again. (Answers unlock in 4 seconds.)', 'bad');
              box.dataset.cool = '1';
              const btns = box.querySelectorAll('.quiz-opt');
              btns.forEach((b) => (b.disabled = true));
              setTimeout(() => { delete box.dataset.cool; btns.forEach((b) => (b.disabled = false)); qfb.textContent = ''; }, 4000);
            }
          },
        }, o))),
        qfb);
    };
    render();
    return box;
  };

  /*
   * A bank of numeric answers with one Check button. Reports how many are right only.
   * items: [{q, a, unit, hint}]  (a may be negative or a decimal)
   */
  ER.numberLock = function ({ items, title = '🔢 Answer lock', note, onSolved, checkText = '🔓 Try to unlock' }) {
    const el = ER.el;
    const inputs = items.map((q) => el('input', {
      type: 'text', inputmode: 'text', placeholder: q.ph || 'answer', 'aria-label': q.q, maxlength: '8', autocomplete: 'off',
    }));
    const fb = el('p', { class: 'feedback', 'aria-live': 'polite' });
    const dials = el('div', { class: 'padlock' }, el('span', { class: 'padlock-icon' }, '🔒'),
      ...items.map((_, i) => el('span', { class: 'dial', 'data-i': i }, '?')));
    const btn = el('button', { class: 'btn btn-aqua btn-big no-print' }, checkText);
    inputs.forEach((inp) => {
      inp.addEventListener('input', () => { inp.value = inp.value.replace(/[^0-9.\-]/g, ''); });
      inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') btn.click(); });
    });
    let solved = false;
    btn.addEventListener('click', () => {
      if (solved) return;
      const right = items.filter((q, i) => ER.num(inputs[i].value) !== '' && Number(ER.num(inputs[i].value)) === Number(q.a)).length;
      if (right === items.length) {
        solved = true;
        ER.sfx.good();
        dials.classList.add('open');
        dials.querySelector('.padlock-icon').textContent = '🔓';
        dials.querySelectorAll('.dial').forEach((d) => { d.textContent = '✔'; d.classList.add('ok'); });
        inputs.forEach((i) => (i.disabled = true));
        btn.disabled = true;
        ER.say(fb, '✅ Lock open!', 'good');
        if (onSolved) onSolved();
      } else {
        ER.sfx.bad();
        ER.shake(dials);
        ER.say(fb, `${right} of ${items.length} answers are correct. Check your working (units matter for the physics, not for typing).`, 'bad');
      }
    });
    return {
      node: el('div', { class: 'card printable' },
        el('h4', {}, title),
        note ? el('p', { class: 'muted small' }, note) : null,
        el('ol', { class: 'q-list' }, items.map((q, i) => el('li', { class: 'q-row' },
          el('span', {}, q.q, q.unit ? el('b', { class: 'unit' }, ' (' + q.unit + ')') : null), inputs[i]))),
        dials,
        el('div', { class: 'row-center' }, btn),
        fb),
      inputs,
    };
  };

  ER.canvasPoint = function (canvas, e) {
    const r = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - r.left) / r.width) * canvas.width,
      y: ((e.clientY - r.top) / r.height) * canvas.height,
    };
  };

  ER.keys = function () {
    const held = new Set();
    const kd = (e) => {
      held.add(e.key.toLowerCase());
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(e.key.toLowerCase())) {
        if (!(e.target instanceof HTMLInputElement)) e.preventDefault();
      }
    };
    const ku = (e) => held.delete(e.key.toLowerCase());
    const blur = () => held.clear();
    window.addEventListener('keydown', kd);
    window.addEventListener('keyup', ku);
    window.addEventListener('blur', blur);
    return {
      down: (...names) => names.some((n) => held.has(n)),
      dispose() {
        window.removeEventListener('keydown', kd);
        window.removeEventListener('keyup', ku);
        window.removeEventListener('blur', blur);
      },
    };
  };
})();
