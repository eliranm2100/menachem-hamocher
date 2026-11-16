// מנחם המוכר: האפליקציה (רצה אחרי כניסה ופענוח התוכן)
window.startApp = function () {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const nis = n => Math.round(n).toLocaleString('he-IL') + ' ש"ח';
  const F = window.COURSE_FACTS, FAST = window.FAST || {}, EX = window.EXPLAIN || {};
  const ME = window.MM_USER || { id: 'me', name: 'אני' };
  const courseById = id => COURSES.find(c => c.id === id);
  const bundleById = id => BUNDLES.find(b => b.id === id);
  const pageSlug = id => ({ 'cisco-collab': 'cisco-collaboration', python: 'python-fundamentals', 'ai-pro': 'ai-pro-architect', 'cyber-defense': 'cyber-defense-network-architecture', 'ai-dev-bundle': 'ai-developer-automation' })[id] || id;
  const courseUrl = id => `${F.site}/courses/${pageSlug(id)}`;
  const ls = { get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch (e) { return d; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} } };

  // ───── כלים כלליים ─────
  function toast(t) { const d = document.createElement('div'); d.className = 'toast'; d.textContent = t; document.body.appendChild(d); setTimeout(() => d.remove(), 1800); }
  function confetti() {
    const box = document.createElement('div'); box.className = 'confetti';
    const colors = ['#ff5c2b', '#fbbf24', '#22d3ee', '#22c55e', '#a78bfa'];
    for (let i = 0; i < 70; i++) { const p = document.createElement('i'); p.style.left = Math.random() * 100 + '%'; p.style.background = colors[i % 5]; p.style.animationDelay = Math.random() * .5 + 's'; box.appendChild(p); }
    document.body.appendChild(box); setTimeout(() => box.remove(), 2400);
  }
  function copyText(text, btn) {
    const done = () => { if (btn) { const o = btn.textContent; btn.textContent = '✓'; btn.classList.add('done'); setTimeout(() => { btn.textContent = o; btn.classList.remove('done'); }, 1200); } else toast('הועתק ✓'); };
    if (navigator.clipboard) navigator.clipboard.writeText(text).then(done, fb); else fb();
    function fb() { const t = document.createElement('textarea'); t.value = text; document.body.appendChild(t); t.select(); try { document.execCommand('copy'); done(); } catch (e) {} t.remove(); }
  }
  document.addEventListener('click', e => { const b = e.target.closest('[data-copy]'); if (b) { e.stopPropagation(); copyText(b.dataset.copy, b); } });
  const say = t => `<div class="say">${esc(t)}<button class="copy" data-copy="${esc(t)}">העתק</button></div>`;

  function renderScript(src) {
    return '<div class="script">' + String(src).trim().split('\n').map(l => l.trim()).filter(Boolean).map(l => {
      if (l.startsWith('#')) return `<div class="stg">${esc(l.slice(1).trim())}</div>`;
      if (l.startsWith('>')) return `<div class="ln n">${esc(l.slice(1).trim())}</div>`;
      if (l.startsWith('מ:')) { const t = l.slice(2).trim(); return `<div class="ln m"><small>את/ה</small>${esc(t)}<button class="copy" data-copy="${esc(t)}">העתק</button></div>`; }
      if (l.startsWith('ל:')) return `<div class="ln c"><small>הלקוח</small>${esc(l.slice(2).trim())}</div>`;
      return `<div class="ln n">${esc(l)}</div>`;
    }).join('') + '</div>';
  }
  const fastOf = o => (FAST[o.id] || {}).fast || o.fast || ((String(o.script).split('\n').find(l => l.trim().startsWith('מ:')) || '').trim().slice(2).trim());

  // ───── ניקוד, דרגות וסטטיסטיקה ─────
  const SKEY = 'mm-stats-' + ME.id;
  const stats = Object.assign({ xp: 0, best: 0, games: 0, deals: 0, followups: 0, calls: 0 }, ls.get(SKEY, {}));
  function rankFor(xp) {
    let i = 0; RANKS.forEach((r, j) => { if (xp >= r.min) i = j; });
    const cur = RANKS[i], next = RANKS[i + 1];
    return { cur, next, pct: next ? Math.round((xp - cur.min) / (next.min - cur.min) * 100) : 100 };
  }
  let syncT;
  function saveStats() {
    ls.set(SKEY, stats); renderXP();
    clearTimeout(syncT);
    syncT = setTimeout(() => {
      if (window.MM_SCORES && window.MM_SCORES.enabled) window.MM_SCORES.save({ name: ME.name, xp: stats.xp, best: stats.best, games: stats.games, deals: stats.deals }).catch(() => {});
    }, 800);
  }
  function addXP(n, why) {
    const before = rankFor(stats.xp).cur;
    stats.xp += n; saveStats();
    const after = rankFor(stats.xp).cur;
    if (after !== before) { confetti(); toast(`עלית דרגה: ${after.icon} ${after.name}!`); }
    else if (why) toast(`+${n} נקודות · ${why}`);
  }
  function renderXP() { const r = rankFor(stats.xp); $('#xpPill').textContent = `${r.cur.icon} ${stats.xp.toLocaleString('he-IL')}`; }
  renderXP();

  // ───── ניווט ─────
  function route() {
    let id = (location.hash || '#call').slice(1).split('?')[0];
    const v0 = $('#v-' + id);
    if (!v0 || v0.classList.contains('admin-off')) id = 'call';
    const view = $('#v-' + id);
    $$('.view').forEach(v => v.classList.toggle('on', v === view));
    $$('.nav a').forEach(a => a.classList.toggle('on', a.dataset.group === view.dataset.group));
    $('#objFab').classList.toggle('hide', !(id === 'call' && call.running));
    if (id === 'train' && !$('#trainHome').classList.contains('hide')) renderTrainHome();
    window.scrollTo(0, 0);
  }
  window.addEventListener('hashchange', route);

  // ═════════ מסך שיחה: 3 דקות ═════════
  const SOURCES = [['site', '🌐 אתר'], ['wheel', '🎁 גלגל המזל'], ['bootcamp', '🎓 בוטקאמפ'], ['cold', '🧊 לקוח שהתקרר']];
  const BG = [['none', 'אין רקע טכני'], ['helpdesk', 'Help Desk / טכנאי'], ['it', 'כבר עובד ב-IT'], ['code', 'קצת קוד / QA']];
  const WANT = [['net', '🌐 רשתות ואבטחה'], ['cyber', '🛡️ סייבר'], ['sys', '🖥️ שרתים ותשתיות'], ['dev', '🤖 פיתוח ו-AI'], ['unsure', '🤷 לא יודע']];
  const call = { src: 'site', bg: '', want: '', pain: '', stage: 0, t0: 0, running: false, timer: null };
  $('#leadSrc').innerHTML = SOURCES.map(([v, t]) => `<button class="chip ${v === call.src ? 'on' : ''}" data-v="${v}">${t}</button>`).join('');
  $('#leadSrc').addEventListener('click', e => { const b = e.target.closest('[data-v]'); if (!b) return; call.src = b.dataset.v; $$('#leadSrc .chip').forEach(x => x.classList.toggle('on', x === b)); });

  function recommend() {
    const { bg, want } = call;
    if (bg === 'it') {
      const m = { net: 'palo-alto', cyber: 'cortex-xdr', sys: 'vmware', dev: 'python', unsure: 'cisco-ise' };
      return { item: courseById(m[want] || 'palo-alto'), single: true, why: 'יש לך כבר בסיס, אז לא נבזבז לך זמן. זו ההתמחות שתבדל אותך בראיון הבא.' };
    }
    const w = want || 'unsure';
    const b = { net: 'network-security-bundle', cyber: 'cyber-defense', sys: 'sysadmin-mastery', dev: 'ai-dev-bundle', unsure: bg === 'helpdesk' ? 'sysadmin-mastery' : 'network-security-bundle' }[w];
    const entry = { net: 'ccna', cyber: 'infosec', sys: bg === 'helpdesk' ? 'sysadmin' : 'ccna', dev: bg === 'code' ? 'python' : 'programming', unsure: 'ccna' }[w];
    return { item: bundleById(b), single: false, entry: courseById(entry) };
  }
  const STAGES = [
    { k: 'פתיחה', t: '0:00', body: () => {
      const open = {
        site: 'היי [שם], [שמך] מנטמי. השארת אצלנו פרטים לגבי הלימודים. תפסתי אותך בזמן טוב?',
        wheel: 'היי [שם], [שמך] מנטמי. זכית אצלנו בגלגל, מזל טוב! ההטבה תקפה 24 שעות בלבד, אז רציתי לוודא שאתה מנצל אותה. יש לך 3 דקות?',
        bootcamp: 'היי [שם], [שמך] מנטמי. ראיתי שנרשמת לבוטקאמפ החינמי, כיף! יש לך 3 דקות להכיר?',
        cold: 'היי [שם], [שמך] מנטמי. דיברנו לפני [זמן], וסיפרת לי ש[הכאב שלו]. מה קורה עם זה היום?'
      }[call.src];
      return say(open) + say('מעולה. 3 דקות: אני אבין מה אתה מחפש, ואגיד לך בדיוק מה הכי מתאים לך. מקובל?') +
        `<div class="note">😊 חיוך ואנרגיה גבוהה. ה"כן" הראשון נותן לך את ההובלה.</div>`;
    } },
    { k: 'אבחון', t: '0:20', body: () =>
      say('מה אתה עושה היום?') + `<div class="pick" data-k="bg">${BG.map(([v, t]) => `<button class="${call.bg === v ? 'on' : ''}" data-v="${v}">${t}</button>`).join('')}</div>` +
      say('ומה הכי מושך אותך?') + `<div class="pick" data-k="want">${WANT.map(([v, t]) => `<button class="${call.want === v ? 'on' : ''}" data-v="${v}">${t}</button>`).join('')}</div>` +
      say('ולמה דווקא עכשיו? מה קרה שגרם לך לבדוק?') +
      `<input class="field" id="painIn" placeholder='המילה הרגשית שלו: "נמאס", "תקוע", "רוצה יציבות"…' value="${esc(call.pain)}">`
    },
    { k: 'כאב', t: '1:00', body: () => {
      const w = call.pain || '[המילה שלו]';
      return say(`אמרת "${w}". למה דווקא זה? איך זה משפיע עליך ביום-יום?`) +
        `<div class="note">🤫 שקט. תנו לו לדבר. כאן נמצאת המכירה, ברגש.</div>` +
        say('ואם בעוד שנה אתה עדיין באותו מקום, איך זה ירגיש?');
    } },
    { k: 'המלצה', t: '1:20', body: () => {
      const r = recommend(), it = r.item, e = EX[it.id] || {};
      const why = r.why || e.pitch || it.pitch || it.hook;
      const pitch = `לפי מה שסיפרת${call.pain ? `, ש"${call.pain}"` : ''}, מה שהכי מתאים לך זה ${it.name}. ${why}`;
      return `<div class="card rec"><span class="badge hot">ההמלצה</span><h3>${esc(it.name)}</h3><p class="muted small">${esc(e.what || it.hook || '')}</p></div>` +
        say(pitch) + say('נשמע לך נכון?') +
        (r.entry ? `<p class="muted small">אם החבילה גדולה עליו: מתחילים ב-${esc(r.entry.name)} (2,490 ש"ח).</p>` : '');
    } },
    { k: 'מחיר וסגירה', t: '1:50', body: () => {
      const r = recommend(), it = r.item;
      const price = r.single ? F.single : it.price, list = r.single ? F.singleList : it.list;
      const m = Math.round(price / 12), d = Math.ceil(price / 12 / 30);
      return `<div class="card" style="text-align:center"><div class="price-big">${nis(price)}<s>${nis(list)}</s></div><p class="muted">עד 12 תשלומים · כ-${nis(m)} לחודש · פחות מ-${nis(d)} ליום</p></div>` +
        say(`המחיר הרגיל הוא ${list.toLocaleString('he-IL')}. עכשיו ${price.toLocaleString('he-IL')}, עד 12 תשלומים. זה בערך ${m} ש"ח בחודש, פחות מ-${d} ש"ח ביום.`) +
        say('אז בוא נרשום אותך עכשיו, ותקבל גישה עוד היום. כרטיס אשראי מולך? בכמה תשלומים נוח לך?') +
        `<div class="note">🤫 שקט! אחרי שאלת הסגירה, מי שמדבר ראשון מפסיד. התנגדות? לחצו על הכפתור הסגול.</div>` +
        (r.single ? '<p class="muted small">פריסה בקורס בודד: לאשר מול ההנהלה.</p>' : '');
    } },
    { k: 'סליקה', t: '2:30', body: () => {
      const it = recommend().item;
      const msg = `היי [שם], הנה הקישור להרשמה ל${it.name}:\n${courseUrl(it.id)}\n\nבוחרים "לרכישה", ואחרי התשלום מגיעים פרטי הגישה למייל. אני כאן על הקו איתך 💪`;
      return say('שולח לך עכשיו קישור בוואטסאפ. תפתח, ואני נשאר איתך על הקו עד שזה עובר.') +
        `<div class="card"><b>💬 הודעה לשליחה</b><pre class="muted" style="white-space:pre-wrap;font:inherit;margin:8px 0">${esc(msg)}</pre><button class="btn ghost block" data-copy="${esc(msg)}">העתק הודעה</button></div>` +
        `<div class="stack"><button class="btn green big" data-out="won">✅ נסגר! הלקוח שילם</button>` +
        `<button class="btn ghost" data-out="follow">📅 נקבע המשך בשעה מדויקת</button><button class="btn ghost" data-out="lost">❌ לא נסגר</button></div>`;
    } }
  ];
  $('#stageDots').innerHTML = STAGES.map(() => '<i></i>').join('');
  function renderStage() {
    const s = STAGES[call.stage];
    $$('#stageDots i').forEach((d, i) => d.className = i < call.stage ? 'done' : i === call.stage ? 'now' : '');
    $('#stageBody').innerHTML = `<div class="stage"><div class="stage-head"><h2>${call.stage + 1}. ${s.k}</h2><span class="t">⏱ ${s.t}</span></div>${s.body()}</div>`;
    $('#prevStage').style.visibility = call.stage ? 'visible' : 'hidden';
    $('#nextStage').classList.toggle('hide', call.stage === STAGES.length - 1);
    const pin = $('#painIn'); if (pin) pin.addEventListener('input', () => call.pain = pin.value.trim());
  }
  $('#stageBody').addEventListener('click', e => {
    const p = e.target.closest('.pick button');
    if (p) { call[p.parentElement.dataset.k] = p.dataset.v; $$('button', p.parentElement).forEach(x => x.classList.toggle('on', x === p)); return; }
    const o = e.target.closest('[data-out]'); if (o) endCall(o.dataset.out);
  });
  $('#nextStage').addEventListener('click', () => {
    if (call.stage === 1 && (!call.bg || !call.want)) { toast('בחרו רקע ותחום, ואז ממשיכים'); return; }
    call.stage = Math.min(call.stage + 1, STAGES.length - 1); renderStage(); window.scrollTo(0, 0);
  });
  $('#prevStage').addEventListener('click', () => { call.stage = Math.max(call.stage - 1, 0); renderStage(); });
  function tick() {
    const s = Math.floor((Date.now() - call.t0) / 1000), left = 180 - s;
    $('#clock').textContent = (left < 0 ? '+' : '') + Math.floor(Math.abs(left) / 60) + ':' + String(Math.abs(left) % 60).padStart(2, '0');
    $('#timeBar').style.width = Math.min(100, s / 180 * 100) + '%';
    $('#timer').classList.toggle('over', left < 0);
  }
  $('#startCall').addEventListener('click', () => {
    Object.assign(call, { bg: '', want: '', pain: '', stage: 0, t0: Date.now(), running: true });
    $('#callStart').classList.add('hide'); $('#callRun').classList.remove('hide'); $('#objFab').classList.remove('hide');
    stats.calls++; saveStats();
    renderStage(); tick(); call.timer = setInterval(tick, 500);
  });
  $('#endCall').addEventListener('click', () => endCall(null));
  function endCall(out) {
    clearInterval(call.timer); call.running = false;
    const secs = Math.floor((Date.now() - call.t0) / 1000);
    if (out === 'won') { stats.deals++; confetti(); addXP(secs <= 180 ? 750 : 500, secs <= 180 ? 'סגירה ב-3 דקות! 🦈' : 'סגירה!'); }
    else if (out === 'follow') { stats.followups++; addXP(50, 'נקבע המשך'); }
    else if (out === 'lost') addXP(10, 'על הניסיון');
    saveStats();
    $('#callRun').classList.add('hide'); $('#callStart').classList.remove('hide'); $('#objFab').classList.add('hide');
    renderCallStats();
  }
  function renderCallStats() {
    const rate = stats.calls ? Math.round(stats.deals / stats.calls * 100) : 0;
    $('#callStats').innerHTML = [['📞', stats.calls, 'שיחות'], ['✅', stats.deals, 'סגירות'], ['🎯', rate + '%', 'אחוז סגירה']]
      .map(([i, n, t]) => `<div class="card" style="padding:12px;background:var(--card-2)"><div style="font-size:1.4rem;font-weight:900">${i} ${n}</div><div class="muted small">${t}</div></div>`).join('');
  }
  renderCallStats();

  // ───── חלון התנגדות מהירה (בזמן שיחה) ─────
  function openSheet(html) {
    const bg = document.createElement('div'); bg.className = 'sheet-bg';
    bg.innerHTML = `<div class="sheet"><div class="grab"></div>${html}</div>`;
    bg.addEventListener('click', e => { if (e.target === bg || e.target.closest('[data-close]')) bg.remove(); });
    document.body.appendChild(bg); return bg;
  }
  $('#objFab').addEventListener('click', () => {
    const hot = OBJECTIONS.filter(o => o.hot);
    const sh = openSheet(`<div class="search"><input id="shSearch" type="search" placeholder="מה הוא אמר?" autocomplete="off"></div><div class="stack" id="shList" style="margin-top:12px"></div>`);
    const list = $('#shList', sh);
    const draw = arr => list.innerHTML = arr.map(o => `<button class="card" style="text-align:right;padding:12px 14px" data-o="${o.id}"><b>״${esc(o.q)}״</b></button>`).join('');
    draw(hot);
    $('#shSearch', sh).addEventListener('input', e => { const q = e.target.value.trim(); draw(q ? search(q).slice(0, 8) : hot); });
    list.addEventListener('click', e => {
      const b = e.target.closest('[data-o]'); if (!b) return;
      const o = OBJECTIONS.find(x => x.id === b.dataset.o);
      list.innerHTML = `<div class="stack"><b style="font-size:1.2rem">״${esc(o.q)}״</b>${say(fastOf(o))}<div class="tip">💡 ${esc(o.tip)}</div>
        <button class="btn big" data-close>✓ חזרה לשיחה</button><button class="btn ghost" data-close data-goto="${o.id}">לתסריט המלא</button></div>`;
    });
  });

  // ═════════ התנגדויות ═════════
  const norm = s => String(s).toLowerCase().replace(/["'״׳]/g, '');
  const words = s => norm(s).split(/[\s,.?!:;()\/-]+/).filter(w => w.length > 2);
  const forms = w => /^[הבלומשכ]/.test(w) && w.length > 3 ? [w, w.slice(1)] : [w];
  function relevance(o, q) {
    const hay = norm([o.q, ...(o.alt || [])].join(' ')), body = norm(o.real + ' ' + o.script);
    if (hay.includes(norm(q))) return 100;
    return words(q).reduce((s, w) => s + (forms(w).some(f => hay.includes(f)) ? 3 : forms(w).some(f => body.includes(f)) ? 1 : 0), 0);
  }
  function search(q) { return OBJECTIONS.map(o => [o, relevance(o, q)]).filter(x => x[1] >= 1).sort((a, b) => b[1] - a[1]).map(x => x[0]); }

  function objCard(o, open) {
    const fast = fastOf(o);
    return `<article class="obj ${open ? 'open' : ''}" data-id="${o.id}">
      <div class="obj-top">
        <div class="obj-q"><span>${esc(o.q)}</span>${o.hot ? '<span class="badge hot">🔥</span>' : ''}${o.ai ? '<span class="badge v">🤖 AI</span>' : ''}</div>
        <div class="obj-fast">${esc(fast)}<button class="copy" data-copy="${esc(fast)}">העתק</button></div>
      </div>
      <button class="obj-more">${open ? '▴ סגור' : '▾ התסריט המלא'}</button>
      <div class="obj-body"><div class="real"><b>מה באמת מאחורי זה: </b>${esc(o.real)}</div>${renderScript(o.script)}<div class="tip">💡 ${esc(o.tip)}</div></div>
    </article>`;
  }
  let objCat = 'all';
  function drawObjections() {
    const q = $('#objSearch').value.trim();
    let arr = q ? search(q) : [...OBJECTIONS].sort((a, b) => (b.hot ? 1 : 0) - (a.hot ? 1 : 0));
    if (objCat !== 'all') arr = arr.filter(o => o.cat === objCat);
    $('#objList').innerHTML = arr.map(o => objCard(o)).join('');
    $('#objEmpty').classList.toggle('hide', arr.length > 0);
  }
  function drawCats() {
    $('#objCats').innerHTML = `<button class="chip ${objCat === 'all' ? 'on' : ''}" data-c="all">הכול ${OBJECTIONS.length}</button>` +
      OBJECTION_CATS.map(c => `<button class="chip ${objCat === c.id ? 'on' : ''}" data-c="${c.id}">${c.icon} ${esc(c.name)}</button>`).join('');
  }
  drawCats(); drawObjections();
  $('#objCats').addEventListener('click', e => { const b = e.target.closest('[data-c]'); if (!b) return; objCat = b.dataset.c; drawCats(); drawObjections(); });
  $('#objSearch').addEventListener('input', drawObjections);
  document.addEventListener('click', e => {
    const m = e.target.closest('.obj-more');
    if (m) { const c = m.parentElement; const open = c.classList.toggle('open'); m.textContent = open ? '▴ סגור' : '▾ התסריט המלא'; }
    const g = e.target.closest('[data-goto]');
    if (g) { e.preventDefault(); openObjection(g.dataset.goto); }
  });
  function openObjection(id) {
    objCat = 'all'; $('#objSearch').value = ''; drawCats(); drawObjections();
    location.hash = 'objections';
    setTimeout(() => { const c = $(`#objList [data-id="${id}"]`); if (c) { c.classList.add('open'); $('.obj-more', c).textContent = '▴ סגור'; c.scrollIntoView({ behavior: 'smooth', block: 'center' }); } }, 150);
  }
  window.mmAddLearned = o => { if (!OBJECTIONS.some(x => x.id === o.id)) { OBJECTIONS.push(o); drawCats(); drawObjections(); } };

  // ═════════ מנחם AI ═════════
  const aiOn = () => !!(window.MM_AI && window.MM_AI.enabled);
  const aiOff = `<div class="card"><b>🔌 מנוע ה-AI עוד לא מחובר.</b><p class="muted small" style="margin:6px 0 10px">המנהל צריך לחבר את שרת ה-AI. בינתיים, הנוסחה שעובדת על כל התנגדות:</p>` +
    renderScript('מ: אני מבין לגמרי, ואני שמח שאתה אומר את זה.\nמ: רק תענה לי בכנות: אם זה לא היה עניין, היית מתקדם היום?\nמ: אז לגבי מה אתה עוד לא בטוח?\n> שקט. ההתנגדות האמיתית תצא, ואותה מחפשים בבנק.') + '</div>';
  $('#aiTabs').addEventListener('click', e => {
    const b = e.target.closest('[data-t]'); if (!b) return;
    $$('#aiTabs button').forEach(x => x.classList.toggle('on', x === b));
    $('#aiAskPane').classList.toggle('hide', b.dataset.t !== 'ask'); $('#aiRpPane').classList.toggle('hide', b.dataset.t !== 'rp');
    if (b.dataset.t === 'rp') rpHome();
  });
  async function askAI() {
    const q = $('#aiInput').value.trim(); if (!q) return;
    const local = search(q).slice(0, 3);
    const head = local.length ? `<div class="sec-title">📚 מהבנק</div><div class="stack">${local.map(o => objCard(o)).join('')}</div>` : '';
    const out = $('#aiOut');
    if (!aiOn()) { out.innerHTML = (head ? head + '<div class="sec"></div>' : '') + aiOff; return; }
    const btn = $('#aiAsk'); btn.disabled = true; btn.textContent = '🧠 מנחם חושב…';
    out.innerHTML = '<div class="card muted">✨ מנסח תשובה מנצחת…</div>' + (head ? '<div class="sec">' + head + '</div>' : '');
    try {
      const r = await window.MM_AI.ask(q);
      if (r.existing) out.innerHTML = `<div class="sec-title">✅ יש לזה תשובה בבנק</div>` + objCard(r.existing, true);
      else {
        window.mmAddLearned(r.objection);
        out.innerHTML = `<div class="sec-title">🤖 תשובת מנחם</div>` + objCard(r.objection, true) +
          `<p class="muted small" style="margin-top:8px">${r.saved ? '✓ נוסף לבנק של כל הצוות.' : '⚠ לא נשמר בבנק (' + esc(r.saveError || '') + ')'}</p>`;
        addXP(5);
      }
    } catch (e) { out.innerHTML = `<div class="card" style="color:var(--red)">לא הצלחתי לקבל תשובה: ${esc(e.message)}</div>` + (head ? '<div class="sec">' + head + '</div>' : ''); }
    btn.disabled = false; btn.textContent = '⚡ תן לי תשובה';
  }
  $('#aiAsk').addEventListener('click', askAI);
  $('#aiInput').addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); askAI(); } });

  // הכתבה קולית (כרום / אנדרואיד)
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  function bindMic(btn, input) {
    if (!btn) return;
    if (!SR) { btn.classList.add('hide'); return; }
    let rec = null;
    btn.addEventListener('click', () => {
      if (rec) { rec.stop(); return; }
      rec = new SR(); rec.lang = 'he-IL'; rec.interimResults = true;
      const base = input.value ? input.value + ' ' : '';
      rec.onresult = e => { input.value = base + [...e.results].map(r => r[0].transcript).join(''); };
      rec.onend = () => { rec = null; btn.classList.remove('rec'); };
      btn.classList.add('rec'); rec.start();
    });
  }
  bindMic($('#aiMic'), $('#aiInput'));

  // ───── לקוח קשוח (רולפליי עם AI) ─────
  const PERSONAS = [
    { id: 'dani', name: 'דני, 24', d: 'משוחרר טרי, עובד במחסן. רוצה סייבר, אבל בטוח שזה יקר לו.' },
    { id: 'merav', name: 'מירב, 38', d: 'מזכירה רפואית. לא טכנית, ומפחדת שמאוחר לה להסבה.' },
    { id: 'avi', name: 'אבי, 45', d: 'טכנאי מחשבים. על כל דבר: "אני צריך להתייעץ עם אשתי".' },
    { id: 'noa', name: 'נועה, 29', d: 'Help Desk. בודקת גם מכללה גדולה שמבטיחה השמה.' },
    { id: 'yossi', name: 'יוסי, 33', d: 'עסוק. "תשלח לי סילבוס ואני אחזור אליך".' },
    { id: 'ron', name: 'רון, 26', d: 'בטוח שילמד הכול ביוטיוב ועם ChatGPT.' }
  ];
  const rp = { persona: null, history: [], busy: false };
  function rpHome() {
    const pane = $('#aiRpPane');
    if (!aiOn()) { pane.innerHTML = aiOff + '<button class="btn block sec" data-mode="blitz">⚡ בינתיים: בליץ התנגדויות</button>'; return; }
    pane.innerHTML = `<p class="muted" style="margin-bottom:12px">בחרו לקוח. אתם פותחים את השיחה, הוא מתנגד, ובסוף מנחם נותן ציון.</p>
      <div class="stack">${PERSONAS.map(p => `<button class="card mode" data-p="${p.id}"><span class="ic">🥊</span><span><b>${esc(p.name)}</b><small class="muted">${esc(p.d)}</small></span></button>`).join('')}</div>`;
  }
  $('#aiRpPane').addEventListener('click', e => {
    const p = e.target.closest('[data-p]'); if (p) startRP(PERSONAS.find(x => x.id === p.dataset.p));
    if (e.target.closest('[data-rp-send]')) sendRP();
    if (e.target.closest('[data-rp-home]')) rpHome();
  });
  function startRP(persona) {
    rp.persona = persona; rp.history = [];
    $('#aiRpPane').innerHTML = `<div class="card" style="display:flex;gap:10px;align-items:center"><span style="font-size:1.8rem">🥊</span><span><b>${esc(persona.name)}</b><br><small class="muted">${esc(persona.d)}</small></span></div>
      <div class="chat" id="rpChat"><div class="note">📞 הלקוח ענה לטלפון. תפתחו את השיחה.</div></div>
      <div id="rpCompose"><div class="compose"><textarea class="field" id="rpIn" placeholder="מה אתם אומרים?"></textarea><button class="mic" id="rpMic">🎙️</button></div>
      <button class="btn block" data-rp-send style="margin-top:8px">שלח ←</button></div>`;
    bindMic($('#rpMic'), $('#rpIn'));
    $('#rpIn').addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendRP(); } });
  }
  async function sendRP() {
    const inp = $('#rpIn'); const t = inp && inp.value.trim(); if (!t || rp.busy) return;
    rp.busy = true; inp.value = '';
    rp.history.push({ role: 'seller', text: t });
    const chat = $('#rpChat');
    chat.insertAdjacentHTML('beforeend', `<div class="bubble me"><small>את/ה</small>${esc(t)}</div><div class="bubble client muted" id="rpTyping">…</div>`);
    try {
      const r = await window.MM_AI.roleplay({ persona: rp.persona, history: rp.history });
      $('#rpTyping').remove();
      if (r.reply) { rp.history.push({ role: 'client', text: r.reply }); chat.insertAdjacentHTML('beforeend', `<div class="bubble client"><small>${esc(rp.persona.name)}</small>${esc(r.reply)}</div>`); }
      if (r.done) {
        const score = Math.max(0, Math.min(100, Math.round(r.score || 0))), pts = score * 4;
        if (score >= 80) confetti();
        stats.games++; addXP(pts, `ציון ${score}`);
        chat.insertAdjacentHTML('beforeend', `<div class="card end"><div class="muted">ציון המאמן</div><div class="score">${score}</div>
          <p style="margin:8px 0"><b>${r.closed ? '✅ הלקוח הסכים להירשם!' : '❌ הלקוח לא נסגר'}</b></p>
          <div class="stack" style="text-align:right"><div class="qa"><b>👍 מה עבד: </b>${esc(r.good)}</div><div class="tip"><b>🎯 לשפר: </b>${esc(r.improve)}</div></div>
          <p class="muted small" style="margin-top:8px">+${pts} נקודות</p><button class="btn block sec" data-rp-home>עוד לקוח 🥊</button></div>`);
        $('#rpCompose').classList.add('hide');
      }
      chat.lastElementChild.scrollIntoView({ behavior: 'smooth', block: 'end' });
    } catch (e) { const ty = $('#rpTyping'); if (ty) ty.textContent = '⚠ ' + e.message; rp.history.pop(); }
    rp.busy = false;
  }

  // ═════════ אימון: בליץ + טבלה ═════════
  let boardTab = 'xp';
  function renderTrainHome() {
    const r = rankFor(stats.xp);
    $('#rankCard').innerHTML = `<span class="ic">${r.cur.icon}</span><span style="flex:1"><small>הדרגה שלך</small><b>${r.cur.name}</b>
      <small>${stats.xp.toLocaleString('he-IL')} נקודות${r.next ? ` · עוד ${(r.next.min - stats.xp).toLocaleString('he-IL')} ל${r.next.icon} ${r.next.name}` : ' · הדרגה הכי גבוהה!'}</small>
      <div class="prog"><i style="width:${r.pct}%"></i></div></span>`;
    renderBoard();
  }
  async function renderBoard() {
    let rows = [];
    if (window.MM_SCORES && window.MM_SCORES.enabled) { try { rows = await window.MM_SCORES.list(); } catch (e) {} }
    const mine = { id: ME.id, name: ME.name, xp: stats.xp, best: stats.best, deals: stats.deals, games: stats.games };
    rows = rows.filter(r => r.id !== ME.id).concat([mine]);
    rows.sort((a, b) => (b[boardTab] || 0) - (a[boardTab] || 0));
    const medal = i => ['🥇', '🥈', '🥉'][i] || (i + 1);
    const unit = { xp: 'נקודות', deals: 'סגירות', best: 'שיא' }[boardTab];
    $('#board').innerHTML = rows.map((r, i) => `<div class="row ${i === 0 ? 'p1' : ''} ${r.id === ME.id ? 'me' : ''}"><span class="pos">${medal(i)}</span>
      <span class="nm">${esc(r.name)} ${rankFor(r.xp || 0).cur.icon}<small>${rankFor(r.xp || 0).cur.name} · ${r.deals || 0} סגירות</small></span>
      <span class="pts">${(r[boardTab] || 0).toLocaleString('he-IL')}<small>${unit}</small></span></div>`).join('');
    $('#boardNote').textContent = window.MM_SCORES && window.MM_SCORES.enabled ? 'הטבלה מתעדכנת אצל כל הצוות.' : 'הטבלה המשותפת תופעל כשהשרת יחובר. עד אז רואים רק את הנתונים שלך.';
  }
  $('#boardTabs').addEventListener('click', e => { const b = e.target.closest('[data-b]'); if (!b) return; boardTab = b.dataset.b; $$('#boardTabs button').forEach(x => x.classList.toggle('on', x === b)); renderBoard(); });
  document.addEventListener('click', e => {
    const m = e.target.closest('[data-mode]'); if (!m) return;
    if (m.dataset.mode === 'blitz') { if (location.hash !== '#train') location.hash = 'train'; setTimeout(startBlitz, 60); }
    if (m.dataset.mode === 'rp') { location.hash = 'ai'; setTimeout(() => $('#aiTabs [data-t="rp"]').click(), 60); }
  });

  const G = { deck: [], i: 0, score: 0, streak: 0, right: 0, timer: null, t0: 0, locked: false, opts: [] };
  const SECS = 15;
  function startBlitz() {
    const pool = OBJECTIONS.filter(o => FAST[o.id] && FAST[o.id].quiz).sort(() => Math.random() - .5).slice(0, 10);
    Object.assign(G, { deck: pool, i: 0, score: 0, streak: 0, right: 0 });
    $('#trainHome').classList.add('hide'); $('#game').classList.remove('hide');
    showQ();
  }
  function showQ() {
    const o = G.deck[G.i], f = FAST[o.id];
    G.opts = f.quiz.map((t, k) => ({ t, ok: k === 0 })).sort(() => Math.random() - .5); G.locked = false;
    const st = G.streak >= 5 ? ' · x2' : G.streak >= 3 ? ' · x1.5' : '';
    $('#game').innerHTML = `<div class="game-hud"><span class="pill">${G.i + 1}/${G.deck.length}</span><span class="pill">⭐ ${G.score.toLocaleString('he-IL')}</span>
      <span class="pill streak">🔥 ${G.streak}${st}</span><span class="spacer"></span><button class="copy" id="quit">יציאה</button></div>
      <div class="tbar"><i id="qbar"></i></div>
      <div class="muted small" style="text-align:center">הלקוח אומר:</div><div class="quote">${esc(o.q)}</div>
      <div class="answers">${G.opts.map((x, k) => `<button data-k="${k}">${esc(x.t)}</button>`).join('')}</div><div id="fb"></div>`;
    G.t0 = Date.now(); clearInterval(G.timer);
    G.timer = setInterval(() => {
      const left = SECS - (Date.now() - G.t0) / 1000;
      const bar = $('#qbar'); if (bar) bar.style.width = Math.max(0, left / SECS * 100) + '%';
      if (left <= 0) answer(-1);
    }, 100);
  }
  function answer(k) {
    if (G.locked) return; G.locked = true; clearInterval(G.timer);
    const f = FAST[G.deck[G.i].id];
    const left = Math.max(0, SECS - (Date.now() - G.t0) / 1000);
    const ok = k >= 0 && G.opts[k].ok;
    $$('.answers button').forEach((b, j) => { b.disabled = true; if (G.opts[j].ok) b.classList.add('ok'); else if (j === k) b.classList.add('bad'); });
    let pts = 0;
    if (ok) { G.streak++; G.right++; pts = Math.round((100 + left * 10) * (G.streak >= 5 ? 2 : G.streak >= 3 ? 1.5 : 1)); G.score += pts; }
    else G.streak = 0;
    $('#fb').innerHTML = `<div class="pop" style="color:${ok ? 'var(--green)' : 'var(--red)'}">${ok ? `+${pts} ${G.streak >= 3 ? '🔥' : '✓'}` : k < 0 ? '⏰ נגמר הזמן' : '✗ לא הפעם'}</div>
      <div class="card stack"><div class="small"><b>למה: </b>${esc(f.why)}</div>${say(f.fast)}</div>
      <button class="btn block big sec" id="nextQ">${G.i + 1 < G.deck.length ? 'הבא ←' : 'לתוצאה 🏁'}</button>`;
    $('#nextQ').scrollIntoView({ behavior: 'smooth', block: 'end' });
  }
  $('#game').addEventListener('click', e => {
    const b = e.target.closest('.answers button'); if (b) { answer(+b.dataset.k); return; }
    if (e.target.closest('#nextQ')) { G.i++; if (G.i < G.deck.length) { showQ(); window.scrollTo(0, 0); } else endBlitz(); }
    if (e.target.closest('#quit')) { clearInterval(G.timer); exitGame(); }
    if (e.target.closest('[data-again]')) startBlitz();
    if (e.target.closest('[data-exit]')) exitGame();
  });
  function endBlitz() {
    const newBest = G.score > stats.best;
    if (newBest) stats.best = G.score;
    stats.games++;
    const acc = Math.round(G.right / G.deck.length * 100);
    const title = acc === 100 ? 'מושלם! כריש אמיתי 🦈' : acc >= 80 ? 'מעולה! 🔥' : acc >= 50 ? 'לא רע. עוד סיבוב?' : 'זה הזמן לעבור על הבנק 📚';
    $('#game').innerHTML = `<div class="card end"><div style="font-size:2.4rem">${acc >= 80 ? '🏆' : '🎯'}</div><h2 style="margin:6px 0">${title}</h2>
      <div class="score">${G.score.toLocaleString('he-IL')}</div><p class="muted">${G.right}/${G.deck.length} נכונות · ${acc}% דיוק${newBest ? ' · 🎉 שיא אישי חדש!' : ''}</p>
      <div class="stack sec"><button class="btn big" data-again>⚡ עוד סיבוב</button><button class="btn ghost" data-exit>לטבלה 🏅</button></div></div>`;
    if (newBest || acc >= 80) confetti();
    addXP(G.score, null);
    window.scrollTo(0, 0);
  }
  function exitGame() { $('#game').classList.add('hide'); $('#trainHome').classList.remove('hide'); renderTrainHome(); }

  // ═════════ עוד: קורסים ═════════
  function explainBlock(id) {
    const e = EX[id]; if (!e) return '';
    return `<p style="margin-top:6px">${esc(e.what)}</p><div style="margin-top:10px">${say(e.pitch)}</div>
      <details><summary>עוד: משל, מה עושים בעבודה, שאלות</summary><div class="kv">
      <div><b>🎯 משל: </b>${esc(e.like)}</div><div><b>💼 בעבודה: </b>${esc(e.day)}</div>
      ${(e.qa || []).map(([q, a]) => `<div class="qa"><b>ל: ${esc(q)}</b><br>${esc(a)}</div>`).join('')}</div></details>`;
  }
  const bundleCard = b => `<article class="card course bundle"><span class="badge hot">חבילה · 4 קורסים</span><h3 style="margin-top:8px">${esc(b.name)}</h3>
    <div class="price">${nis(b.price)}<s>${nis(b.list)}</s></div><div class="meta">כ-${nis(b.price / 12)} לחודש · כל קורס ${nis(b.price / 4)}<br>${b.courses.map(id => esc(courseById(id).name)).join(' · ')}</div>
    ${explainBlock(b.id)}<p class="small" style="margin-top:10px"><a href="${courseUrl(b.id)}" target="_blank" rel="noopener">לעמוד באתר ←</a></p></article>`;
  const courseCard = c => `<article class="card course"><span class="badge ${c.beginner ? '' : 'v'}">${c.beginner ? 'מתאים למתחילים' : 'דורש רקע'}</span>
    <h3 style="margin-top:8px">${esc(c.name)}</h3><div class="meta">${esc(c.hours)} · ${nis(F.single)}</div>${explainBlock(c.id)}
    <details><summary>פרטים טכניים</summary><dl><dt>למי</dt><dd>${esc(c.who)}</dd><dt>דרישות קדם</dt><dd>${esc(c.pre)}</dd><dt>תפקידים</dt><dd>${esc(c.roles)}</dd><dt>נקודות מכירה</dt><dd>${esc(c.sell)}</dd></dl></details>
    <p class="small" style="margin-top:10px"><a href="${courseUrl(c.id)}" target="_blank" rel="noopener">לעמוד באתר ←</a></p></article>`;
  let cf = 'bundles';
  function drawCourses() {
    $('#courseFilter').innerHTML = [['bundles', '⭐ חבילות'], ['beg', 'למתחילים'], ...COURSE_GROUPS.map(g => [g.id, g.name])].map(([v, t]) => `<button class="chip ${cf === v ? 'on' : ''}" data-g="${v}">${esc(t)}</button>`).join('');
    $('#courseList').innerHTML = cf === 'bundles' ? BUNDLES.map(bundleCard).join('') : COURSES.filter(c => cf === 'beg' ? c.beginner : c.g === cf).map(courseCard).join('');
  }
  drawCourses();
  $('#courseFilter').addEventListener('click', e => { const b = e.target.closest('[data-g]'); if (b) { cf = b.dataset.g; drawCourses(); } });
  $('#glossary').innerHTML = (window.GLOSSARY || []).map(([t, d]) => `<div class="card" style="padding:12px"><b>${esc(t)}</b><p class="muted small" style="margin-top:4px">${esc(d)}</p></div>`).join('');

  // מחשבון
  $('#calcList').innerHTML = COURSES.map(c => `<label><input type="checkbox" value="${c.id}"> ${esc(c.name)}</label>`).join('');
  for (let i = 1; i <= 12; i++) $('#calcPays').insertAdjacentHTML('beforeend', `<option ${i === 12 ? 'selected' : ''}>${i}</option>`);
  function calc() {
    const sel = $$('#calcList input:checked').map(i => i.value), n = +$('#calcPays').value, out = $('#calcOut');
    if (!sel.length) { out.innerHTML = '<p class="muted">סמנו קורסים.</p>'; return; }
    const singles = sel.length * F.single;
    let best = null; BUNDLES.forEach(b => { const hit = b.courses.filter(c => sel.includes(c)).length; if (hit >= 2 && (!best || hit > best.hit)) best = { b, hit }; });
    let h = `<div class="muted">${sel.length} קורסים בודדים</div><div class="big-num">${nis(singles)}</div><div class="muted">${n} תשלומים: ${nis(singles / n)} לחודש</div>`;
    if (best) h += `<div class="card bundle sec"><b>💡 עדיף: ${esc(best.b.name)}</b><div class="big-num">${nis(best.b.price)}</div>
      <div class="muted">${best.hit} מהקורסים שבחרתם${best.hit < 4 ? ` + עוד ${4 - best.hit} בחבילה` : ''}${singles > best.b.price ? ` · חיסכון ${nis(singles - best.b.price)}` : ''}<br>${n} תשלומים: ${nis(best.b.price / n)} לחודש · ${nis(best.b.price / n / 30)} ליום</div></div>`;
    out.innerHTML = h + '<p class="muted small" style="margin-top:8px">פריסה בקורס בודד: לאשר מול ההנהלה.</p>';
  }
  $('#calcList').addEventListener('change', calc); $('#calcPays').addEventListener('change', calc); calc();

  // וואטסאפ, תסריטים, שאלות, שיטה, קווים אדומים
  $('#waList').innerHTML = WHATSAPP.map(w => `<div class="card wa"><b>${esc(w.t)}</b><pre>${esc(w.m)}</pre><button class="btn ghost block" data-copy="${esc(w.m)}">העתק הודעה</button></div>`).join('');
  $('#scriptNav').innerHTML = SCRIPTS.map(s => `<button class="chip" data-s="${s.id}">${esc(s.title)}</button>`).join('');
  $('#scriptList').innerHTML = SCRIPTS.map(s => `<article class="card" id="s-${s.id}"><span class="badge hot">${esc(s.tag)}</span><h3 style="margin:8px 0 4px">${esc(s.title)}</h3><p class="muted small" style="margin-bottom:10px">${esc(s.when)}</p>${renderScript(s.body)}</article>`).join('');
  $('#scriptNav').addEventListener('click', e => { const b = e.target.closest('[data-s]'); if (b) $('#s-' + b.dataset.s).scrollIntoView({ behavior: 'smooth' }); });
  $('#discList').innerHTML = DISCOVERY.map(d => `<div class="card"><b>${esc(d.g)}</b><ul class="clean" style="margin-top:8px">${d.qs.map(q => `<li>${esc(q)}</li>`).join('')}</ul></div>`).join('');
  $('#principles').innerHTML = PRINCIPLES.map(p => `<div class="card"><span class="badge hot">${p.n}</span><h3 style="margin:8px 0 4px">${esc(p.t)}</h3><p class="muted small">${esc(p.d)}</p></div>`).join('');
  $('#mentorName').textContent = MENTOR.name; $('#mentorLink').href = MENTOR.channel;
  $('#videos').innerHTML = MENTOR.videos.map(v => `<a class="tile" href="https://www.youtube.com/watch?v=${v.id}" target="_blank" rel="noopener"><span class="ic">▶️</span><span><b>${esc(v.t)}</b></span></a>`).join('');
  $('#rulesList').innerHTML = RED_LINES.map(r => `<div class="card red"><b>⛔ ${esc(r.t)}</b><p class="muted small" style="margin-top:4px">${esc(r.d)}</p></div>`).join('');

  // ערכת נושא
  $('#themeBtn').addEventListener('click', () => {
    const light = document.documentElement.getAttribute('data-theme') === 'light';
    if (light) document.documentElement.removeAttribute('data-theme'); else document.documentElement.setAttribute('data-theme', 'light');
    try { localStorage.setItem('mm-theme', light ? 'dark' : 'light'); } catch (e) {}
  });

  route();
};
