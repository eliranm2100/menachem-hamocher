window.startApp = function () {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const nis = n => n.toLocaleString('he-IL') + ' ש"ח';
  const F = window.COURSE_FACTS;
  const catName = id => (OBJECTION_CATS.find(c => c.id === id) || {}).name || '';
  const courseById = id => COURSES.find(c => c.id === id);
  const bundleById = id => BUNDLES.find(b => b.id === id);

  // ── theme ──
  const themeBtn = $('#themeBtn');
  const setTheme = t => {
    if (t) document.documentElement.setAttribute('data-theme', t); else document.documentElement.removeAttribute('data-theme');
    try { t ? localStorage.setItem('mm-theme', t) : localStorage.removeItem('mm-theme'); } catch (e) {}
  };
  try { const t = localStorage.getItem('mm-theme'); if (t) setTheme(t); } catch (e) {}
  themeBtn.addEventListener('click', () => {
    const dark = document.documentElement.getAttribute('data-theme') === 'dark' ||
      (!document.documentElement.getAttribute('data-theme') && matchMedia('(prefers-color-scheme: dark)').matches);
    setTheme(dark ? 'light' : 'dark');
  });

  // ── copy ──
  function copyText(text, btn) {
    const done = () => { if (!btn) return; const o = btn.textContent; btn.textContent = 'הועתק ✓'; btn.classList.add('done'); setTimeout(() => { btn.textContent = o; btn.classList.remove('done'); }, 1400); };
    if (navigator.clipboard) navigator.clipboard.writeText(text).then(done, () => fallback());
    else fallback();
    function fallback() { const t = document.createElement('textarea'); t.value = text; document.body.appendChild(t); t.select(); try { document.execCommand('copy'); done(); } catch (e) {} t.remove(); }
  }
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-copy]');
    if (b) { e.stopPropagation(); copyText(b.getAttribute('data-copy'), b); }
  });

  // ── script renderer ──
  function renderScript(src) {
    return '<div class="script">' + src.trim().split('\n').map(l => l.trim()).filter(Boolean).map(l => {
      if (l.startsWith('#')) return `<div class="stage">${esc(l.slice(1).trim())}</div>`;
      if (l.startsWith('>')) return `<div class="line n">${esc(l.slice(1).trim())}</div>`;
      if (l.startsWith('מ:')) { const t = l.slice(2).trim(); return `<div class="line m"><span class="who">את/ה</span>${esc(t)}<button class="copy" data-copy="${esc(t)}">העתק</button></div>`; }
      if (l.startsWith('ל:')) return `<div class="line c"><span class="who">הלקוח</span>${esc(l.slice(2).trim())}</div>`;
      return `<div class="line n">${esc(l)}</div>`;
    }).join('') + '</div>';
  }

  // ── objections ──
  function objCard(o) {
    return `<article class="card obj" id="o-${o.id}" data-cat="${o.cat}">
      <button aria-expanded="false"><span class="q">${esc(o.q)}</span>${o.hot ? '<span class="hot">🔥 נפוץ</span>' : ''}<span class="cat">${esc(catName(o.cat))}</span><span class="arrow">▾</span></button>
      <div class="body">
        <div class="real"><b>מה באמת עומד מאחורי זה: </b>${esc(o.real)}</div>
        ${renderScript(o.script)}
        <div class="tip"><b>💡 טיפ של מנחם: </b>${esc(o.tip)}</div>
      </div></article>`;
  }
  const objList = $('#objList');
  objList.innerHTML = OBJECTIONS.map(objCard).join('');
  objList.addEventListener('click', e => {
    const btn = e.target.closest('.obj > button'); if (!btn) return;
    const card = btn.parentElement; const open = card.classList.toggle('open'); btn.setAttribute('aria-expanded', open);
  });
  let objCat = 'all';
  const catChips = $('#objCats');
  catChips.innerHTML = `<button class="chip on" data-c="all">הכול (${OBJECTIONS.length})</button>` +
    OBJECTION_CATS.map(c => `<button class="chip" data-c="${c.id}">${c.icon} ${esc(c.name)} (${OBJECTIONS.filter(o => o.cat === c.id).length})</button>`).join('');
  catChips.addEventListener('click', e => {
    const b = e.target.closest('[data-c]'); if (!b) return;
    objCat = b.dataset.c; $$('.chip', catChips).forEach(x => x.classList.toggle('on', x === b)); filterObj();
  });
  const objSearch = $('#objSearch');
  const norm = s => s.toLowerCase().replace(/["'״׳]/g, '');
  const matches = (o, q) => !q || norm([o.q, ...(o.alt || []), o.real, o.script].join(' ')).includes(norm(q));
  function filterObj() {
    const q = objSearch.value.trim(); let n = 0;
    OBJECTIONS.forEach(o => { const ok = (objCat === 'all' || o.cat === objCat) && matches(o, q); $('#o-' + o.id).classList.toggle('hide', !ok); if (ok) n++; });
    $('#objEmpty').classList.toggle('hide', n > 0);
  }
  objSearch.addEventListener('input', filterObj);
  $('#expandAll').addEventListener('click', () => { const any = $$('.obj:not(.hide):not(.open)').length; $$('.obj:not(.hide)').forEach(c => c.classList.toggle('open', !!any)); });

  function openObjection(id) {
    location.hash = 'objections';
    objCat = 'all'; objSearch.value = ''; $$('.chip', catChips).forEach((x, i) => x.classList.toggle('on', i === 0)); filterObj();
    const c = $('#o-' + id); c.classList.add('open');
    setTimeout(() => c.scrollIntoView({ behavior: 'smooth', block: 'start' }), 150);
  }

  // ── quick search (home) ──
  const qs = $('#quickSearch'), qr = $('#quickResults');
  qs.addEventListener('input', () => {
    const q = qs.value.trim();
    if (!q) { qr.innerHTML = ''; return; }
    const hits = OBJECTIONS.filter(o => matches(o, q)).slice(0, 6);
    qr.innerHTML = hits.length ? hits.map(o => `<a href="#" data-obj="${o.id}">״${esc(o.q)}״<small>${esc(catName(o.cat))}</small></a>`).join('') : '<a href="#objections">לא נמצא, לכל ההתנגדויות ←</a>';
  });
  document.addEventListener('click', e => { const a = e.target.closest('[data-obj]'); if (a) { e.preventDefault(); openObjection(a.dataset.obj); } });
  $('#hotChips').innerHTML = OBJECTIONS.filter(o => o.hot).map(o => `<a href="#" class="chip" data-obj="${o.id}">״${esc(o.q)}״</a>`).join('');

  // ── home flow + facts ──
  $('#homeFlow').innerHTML = CALL_FLOW.map(s => `<li><div><b>${esc(s.k)}</b><span>${esc(s.s)}</span></div></li>`).join('');

  // ── scripts ──
  $('#scriptNav').innerHTML = SCRIPTS.map(s => `<a class="chip" href="#s-${s.id}" data-jump="s-${s.id}">${esc(s.title)}</a>`).join('');
  $('#scriptList').innerHTML = SCRIPTS.map(s => `<article class="card section" id="s-${s.id}">
    <span class="badge">${esc(s.tag)}</span><h3 style="margin-top:8px">${esc(s.title)}</h3>
    <p class="muted"><b>מתי: </b>${esc(s.when)}</p>${renderScript(s.body)}</article>`).join('');
  document.addEventListener('click', e => { const a = e.target.closest('[data-jump]'); if (a) { e.preventDefault(); $('#' + a.dataset.jump).scrollIntoView({ behavior: 'smooth' }); } });

  // ── method ──
  $('#principles').innerHTML = PRINCIPLES.map(p => `<div class="card"><span class="badge">${p.n}</span><h3 style="margin-top:8px">${esc(p.t)}</h3><p class="muted" style="margin:0">${esc(p.d)}</p></div>`).join('');
  $('#mentorName').textContent = MENTOR.name;
  $('#mentorLink').href = MENTOR.channel;
  $('#videos').innerHTML = MENTOR.videos.map(v => `<div class="card video"><a href="https://www.youtube.com/watch?v=${v.id}" target="_blank" rel="noopener"><span class="play">▶</span><span>${esc(v.t)}</span></a></div>`).join('');

  // ── courses ──
  function courseCard(c) {
    const nb = bundleById(c.next) || courseById(c.next);
    return `<article class="card course" data-g="${c.g}">
      <span class="badge ${c.beginner ? '' : 'adv'}">${c.beginner ? 'מתאים למתחילים' : 'דורש רקע'}</span>
      <h3 style="margin-top:8px">${esc(c.name)}</h3>
      <div class="meta">${esc(c.hours)} · ${nis(F.single)} <s>${nis(F.singleList)}</s></div>
      <p><b>${esc(c.hook)}</b></p>
      <dl><dt>למי</dt><dd>${esc(c.who)}</dd><dt>דרישות קדם</dt><dd>${esc(c.pre)}</dd>
      <dt>תפקידים בסיום</dt><dd>${esc(c.roles)}</dd><dt>נקודות מכירה</dt><dd>${esc(c.sell)}</dd>
      ${nb ? `<dt>הצעד הבא / אפסייל</dt><dd>${esc(nb.name)}</dd>` : ''}</dl>
      <p style="margin:10px 0 0"><a href="${F.site}/courses/${pageSlug(c.id)}" target="_blank" rel="noopener">עמוד הקורס באתר ←</a></p></article>`;
  }
  function pageSlug(id) { return ({ 'cisco-collab': 'cisco-collaboration', 'python': 'python-fundamentals', 'ai-pro': 'ai-pro-architect', 'cyber-defense': 'cyber-defense-network-architecture', 'ai-dev-bundle': 'ai-developer-automation' })[id] || id; }
  $('#bundleList').innerHTML = BUNDLES.map(b => `<article class="card bundle course">
    <span class="badge">חבילה · 4 קורסים</span><h3 style="margin-top:8px">${esc(b.name)}</h3>
    <div class="price">${nis(b.price)}<s>${nis(b.list)}</s></div>
    <div class="meta">${esc(b.hours)} · עד ${F.maxPayments} תשלומים (כ-${nis(Math.round(b.price / F.maxPayments))} לחודש) · כל קורס יוצא ${nis(b.price / 4)}</div>
    <p><b>${esc(b.pitch)}</b></p>
    <dl><dt>הקורסים</dt><dd>${b.courses.map(id => esc(courseById(id).name)).join(' · ')}</dd><dt>למי למכור</dt><dd>${esc(b.for)}</dd></dl>
    <p style="margin:10px 0 0"><a href="${F.site}/courses/${pageSlug(b.id)}" target="_blank" rel="noopener">עמוד החבילה באתר ←</a></p></article>`).join('');
  $('#courseFilter').innerHTML = `<button class="chip on" data-g="all">הכול</button><button class="chip" data-g="beg">למתחילים</button>` + COURSE_GROUPS.map(g => `<button class="chip" data-g="${g.id}">${esc(g.name)}</button>`).join('');
  $('#courseList').innerHTML = COURSES.map(courseCard).join('');
  $('#courseFilter').addEventListener('click', e => {
    const b = e.target.closest('[data-g]'); if (!b) return;
    $$('#courseFilter .chip').forEach(x => x.classList.toggle('on', x === b));
    const g = b.dataset.g;
    $$('#courseList .course').forEach((el, i) => { const c = COURSES[i]; el.classList.toggle('hide', !(g === 'all' || (g === 'beg' ? c.beginner : c.g === g))); });
  });

  // ── matcher ──
  const MQ = [
    { k: 'bg', q: 'מה הרקע של הלקוח?', o: [['none', 'אין רקע טכני'], ['helpdesk', 'Help Desk / טכנאי / תמיכה'], ['netpro', 'כבר עובד ברשתות / IT'], ['code', 'קצת קוד / QA / מדעי']] },
    { k: 'want', q: 'מה מושך אותו?', o: [['net', 'רשתות ואבטחת רשת'], ['cyber', 'סייבר / האקינג / SOC'], ['sys', 'שרתים ותשתיות'], ['dev', 'פיתוח / AI / אוטומציה'], ['unsure', 'לא יודע עדיין']] },
    { k: 'budget', q: 'מה המצב הכלכלי?', o: [['ok', 'יכול להשקיע במסלול מלא'], ['tight', 'צמוד, צריך להתחיל קטן']] }
  ];
  const ans = {};
  $('#matchQs').innerHTML = MQ.map(m => `<h3>${esc(m.q)}</h3><div class="opts" data-k="${m.k}">${m.o.map(([v, t]) => `<button class="opt" data-v="${v}">${esc(t)}</button>`).join('')}</div>`).join('');
  $('#matchQs').addEventListener('click', e => {
    const b = e.target.closest('.opt'); if (!b) return; const k = b.parentElement.dataset.k;
    ans[k] = b.dataset.v; $$('.opt', b.parentElement).forEach(x => x.classList.toggle('on', x === b)); renderMatch();
  });
  function recommend() {
    const { bg, want, budget } = ans;
    if (want === 'unsure') return { b: null, c: 'ccna', why: 'כשהלקוח לא יודע, CCNA הוא הבסיס לכל מסלול ב-IT ובסייבר, מתאים בלי רקע, ויש לו שיעור לדוגמה חינמי. אפשרות רכה עוד יותר: הבוטקאמפ החינמי.', say: 'כמעט כל מסלול ב-IT ובסייבר מתחיל ברשתות. בוא נתחיל מהבסיס שפותח לך את כל הדלתות, ותוך כדי תגלה מה הכי מדליק אותך.' };
    if (bg === 'netpro') {
      const map = { net: ['palo-alto', 'פיירוול מתקדם או התמחות נישה (Cisco ISE, F5) נותנים יתרון בראיון הבא.'], cyber: ['cortex-xdr', 'EDR/XDR ארגוני הוא כלי שמבקשים ב-SOC. אפשר גם SentinelOne.'], sys: ['vmware', 'וירטואליזציה היא הצעד הבא של איש תשתיות.'], dev: ['python', 'Python לאוטומציה מכפיל את הערך של איש IT.'] };
      const [c, why] = map[want] || map.net; return { b: null, c, why, say: 'אתה כבר עם בסיס, אז בוא לא נבזבז לך זמן. הנה ההתמחות שתבדל אותך מכל מי שמגיע לראיון.' };
    }
    const bmap = { net: 'network-security-bundle', cyber: 'cyber-defense', sys: 'sysadmin-mastery', dev: 'ai-dev-bundle' };
    const cmap = { net: 'ccna', cyber: 'infosec', sys: bg === 'helpdesk' ? 'sysadmin' : 'ccna', dev: bg === 'code' ? 'python' : 'programming' };
    const b = bmap[want], c = cmap[want];
    const whyMap = {
      net: 'CCNA לבסיס, ושלושת הפיירוולים הנפוצים בישראל. הפרופיל שכל ארגון מחפש באדם אחד.',
      cyber: 'מסלול Blue Team מלא: Linux, Ethical Hacking, SentinelOne ו-InfoSec. בנוי לפי מה ששואלים בראיונות SOC.',
      sys: bg === 'helpdesk' ? 'בדיוק המסלול מ-Help Desk לאיש סיסטם: Windows Server, Linux, VMware ו-CCNA.' : 'מסלול התשתיות המלא. הבסיס של כל איש IT בארגון.',
      dev: 'מהשורה הראשונה בקוד ועד אוטומציות ו-AI. מבוא לתכנות, Python, Angular ו-AI Pro Architect.'
    };
    if (budget === 'tight') return { b: null, c, alt: b, why: 'להתחיל בקורס בודד שבונה בסיס, ולהשאיר את החבילה כאפסייל.', say: `בוא נתחיל עם ${courseById(c).name}. זה הבסיס, ואחר כך נבנה את ההמשך. ותדע שבחבילה כל קורס יוצא רק 1,250 ש"ח, אם תרצה לנעול את המסלול המלא.` };
    return { b, c, why: whyMap[want], say: `לפי מה שסיפרת, המסלול שהכי מתאים לך הוא ${bundleById(b).name}. ארבעה קורסים במחיר 5,000 במקום 12,000, וכל קורס יוצא 1,250 ש"ח.` };
  }
  function renderMatch() {
    const out = $('#matchOut');
    if (!ans.bg || !ans.want || !ans.budget) { out.innerHTML = '<p class="muted">ענו על שלוש השאלות כדי לקבל המלצה.</p>'; return; }
    const r = recommend();
    const main = r.b ? bundleById(r.b) : courseById(r.c);
    out.innerHTML = `<div class="card answer"><span class="badge">ההמלצה</span>
      <h3 style="margin-top:8px">${esc(main.name)}</h3>
      <p>${esc(r.why)}</p>
      ${r.b ? `<p class="muted">נקודת כניסה אם החבילה גדולה עליו: ${esc(courseById(r.c).name)}</p>` : ''}
      ${r.alt ? `<p class="muted">אפסייל בהמשך: ${esc(bundleById(r.alt).name)}</p>` : ''}
      <div class="line m" style="margin-top:10px"><span class="who">מה להגיד</span>${esc(r.say)}<button class="copy" data-copy="${esc(r.say)}">העתק</button></div></div>`;
  }
  renderMatch();

  // ── calculator ──
  $('#calcList').innerHTML = COURSES.map(c => `<label><input type="checkbox" value="${c.id}"> ${esc(c.name)}</label>`).join('');
  $('#calcList').addEventListener('change', calc);
  const pays = $('#calcPays');
  for (let i = 1; i <= F.maxPayments; i++) pays.insertAdjacentHTML('beforeend', `<option value="${i}" ${i === F.maxPayments ? 'selected' : ''}>${i}</option>`);
  pays.addEventListener('change', calc);
  function calc() {
    const sel = $$('#calcList input:checked').map(i => i.value);
    const out = $('#calcOut');
    if (!sel.length) { out.innerHTML = '<p class="muted" style="margin:0">סמנו את הקורסים שהלקוח מתעניין בהם.</p>'; return; }
    const singles = sel.length * F.single;
    let best = null;
    BUNDLES.forEach(b => { const hit = b.courses.filter(c => sel.includes(c)).length; if (hit >= 2 && (!best || hit > best.hit)) best = { b, hit }; });
    const n = +pays.value;
    let html = `<div class="muted">${sel.length} קורסים בודדים</div><div class="big">${nis(singles)}</div><div class="muted">${n} תשלומים: כ-${nis(Math.round(singles / n))} לחודש</div>`;
    if (best) {
      const save = singles - best.b.price;
      html += `<hr style="border:0;border-top:1px solid var(--line);margin:12px 0">
        <b>💡 עדיף חבילה: ${esc(best.b.name)}</b>
        <div class="big">${nis(best.b.price)}</div>
        <div class="muted">${best.hit} מתוך הקורסים שבחרתם בפנים${best.hit < 4 ? `, ועוד ${4 - best.hit} קורסים במתנה` : ''}. ${save > 0 ? `חיסכון של ${nis(save)} לעומת קורסים בודדים.` : `על עוד ${nis(best.b.price - singles)} מקבלים ${4 - best.hit} קורסים נוספים.`}</div>
        <div class="muted">${n} תשלומים: כ-${nis(Math.round(best.b.price / n))} לחודש · כ-${nis(Math.round(best.b.price / n / 30))} ליום</div>`;
    }
    html += `<p class="muted" style="margin:10px 0 0;font-size:.82rem">עד 12 תשלומים מצוין באתר לחבילות. פריסה בקורס בודד: לאשר מול ההנהלה.</p>`;
    out.innerHTML = html;
  }
  calc();

  // ── whatsapp ──
  $('#waList').innerHTML = WHATSAPP.map(w => `<div class="card wa"><h3>${esc(w.t)}</h3><pre>${esc(w.m)}</pre><button class="copy" data-copy="${esc(w.m)}">העתק הודעה</button></div>`).join('');

  // ── discovery ──
  $('#discList').innerHTML = DISCOVERY.map(d => `<div class="card"><h3>${esc(d.g)}</h3><ul class="qlist">${d.qs.map(q => `<li>${esc(q)}</li>`).join('')}</ul></div>`).join('');

  // ── rules ──
  $('#rulesList').innerHTML = RED_LINES.map(r => `<div class="card redline"><h3>⛔ ${esc(r.t)}</h3><p class="muted" style="margin:0">${esc(r.d)}</p></div>`).join('');

  // ── training ──
  let deck = [], idx = 0, score = { good: 0, again: 0 };
  function shuffle() { deck = OBJECTIONS.map(o => o.id).sort(() => Math.random() - .5); idx = 0; }
  function showCard() {
    const o = OBJECTIONS.find(x => x.id === deck[idx]);
    $('#trainQ').textContent = '״' + o.q + '״';
    $('#trainCat').textContent = catName(o.cat) + ' · ' + (idx + 1) + ' / ' + deck.length;
    $('#trainA').innerHTML = `<div class="real"><b>מה מאחורי זה: </b>${esc(o.real)}</div>${renderScript(o.script)}<div class="tip"><b>💡 </b>${esc(o.tip)}</div>`;
    $('#trainA').classList.add('hide'); $('#trainReveal').classList.remove('hide'); $('#trainRate').classList.add('hide');
    $('#trainScore').textContent = `שלטתי: ${score.good} · לחזור על זה: ${score.again}`;
  }
  $('#trainReveal').addEventListener('click', () => { $('#trainA').classList.remove('hide'); $('#trainReveal').classList.add('hide'); $('#trainRate').classList.remove('hide'); });
  $('#trainRate').addEventListener('click', e => {
    const b = e.target.closest('[data-r]'); if (!b) return;
    if (b.dataset.r === 'good') score.good++; else { score.again++; deck.push(deck[idx]); }
    idx++; if (idx >= deck.length) { shuffle(); score = { good: 0, again: 0 }; }
    showCard();
  });
  $('#trainRestart').addEventListener('click', () => { shuffle(); score = { good: 0, again: 0 }; showCard(); });
  shuffle(); showCard();

  // ── router ──
  function route() {
    const id = (location.hash || '#home').slice(1).split('?')[0];
    const view = $('#v-' + id) ? id : (id.startsWith('s-') ? 'scripts' : 'home');
    $$('.view').forEach(v => v.classList.toggle('on', v.id === 'v-' + view));
    $$('.tabs a').forEach(a => a.classList.toggle('on', a.getAttribute('href') === '#' + view));
    const tab = $(`.tabs a[href="#${view}"]`); if (tab) tab.scrollIntoView({ inline: 'center', block: 'nearest' });
    if (!id.startsWith('s-')) window.scrollTo(0, 0);
  }
  window.addEventListener('hashchange', route);
  route();
};
