import * as C from './crypto-core.js';

const REPO = 'eliranm2100/menachem-hamocher';
const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const store = {
  get(k) { try { return sessionStorage.getItem(k) || localStorage.getItem(k); } catch (e) { return null; } },
  set(k, v, remember) { try { (remember ? localStorage : sessionStorage).setItem(k, v); } catch (e) {} },
  remembered() { try { return !!localStorage.getItem('mm-k'); } catch (e) { return false; } },
  clear() { try { ['mm-k', 'mm-u'].forEach(k => { sessionStorage.removeItem(k); localStorage.removeItem(k); }); } catch (e) {} }
};

try { const t = localStorage.getItem('mm-theme'); if (t) document.documentElement.setAttribute('data-theme', t); } catch (e) {}

let session = null; // { kRaw, id, role, name, plaintext }

async function fetchVault() {
  const r = await fetch('vault.json?t=' + Date.now(), { cache: 'no-store' });
  if (!r.ok) throw new Error('vault');
  return r.json();
}

async function enter(vault, kRaw, id) {
  const plaintext = await C.decryptData(vault, kRaw);
  const u = vault.users.find(x => x.id === id);
  if (!u) throw new Error('gone');
  session = { kRaw, id, role: u.role, name: await C.userName(u, kRaw), plaintext };
  new Function(plaintext)();
  $('#login').classList.add('hide');
  $('#app').classList.remove('hide');
  $('#whoami').textContent = session.name;
  if (session.role === 'admin') setupAdmin();
  window.startApp();
}

async function boot() {
  const k = store.get('mm-k'), id = store.get('mm-u');
  if (k && id) {
    try { await enter(await fetchVault(), C.unb64(k), id); return; } catch (e) { store.clear(); }
  }
  $('#login').classList.remove('hide');
  $('#loginUser').focus();
}

$('#loginForm').addEventListener('submit', async e => {
  e.preventDefault();
  const btn = $('#loginBtn'), err = $('#loginErr');
  btn.disabled = true; btn.textContent = 'בודק…'; err.textContent = '';
  try {
    const vault = await fetchVault();
    const { kRaw, user } = await C.unlock(vault, $('#loginUser').value, $('#loginPass').value);
    const remember = $('#remember').checked;
    store.clear();
    store.set('mm-k', C.b64(kRaw), remember); store.set('mm-u', user.id, remember);
    await enter(vault, kRaw, user.id);
  } catch (e2) {
    err.textContent = 'שם משתמש או סיסמה שגויים';
  }
  btn.disabled = false; btn.textContent = 'כניסה';
});

$('#logout').addEventListener('click', () => { store.clear(); location.hash = ''; location.reload(); });

// ───────── ניהול משתמשים (מנהל בלבד) ─────────
function setupAdmin() {
  document.querySelector('.tabs').insertAdjacentHTML('beforeend', '<a href="#admin">ניהול משתמשים</a>');
  $('#v-admin').classList.remove('admin-off');
  const tok = $('#ghToken');
  try { tok.value = localStorage.getItem('mm-gh-token') || ''; } catch (e) {}
  tok.addEventListener('change', () => { try { localStorage.setItem('mm-gh-token', tok.value.trim()); } catch (e) {} });
  $('#genPass').addEventListener('click', () => {
    const a = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    $('#newPass').value = [...crypto.getRandomValues(new Uint8Array(12))].map(b => a[b % a.length]).join('');
    $('#newPass').type = 'text';
  });
  $('#addUser').addEventListener('submit', async e => {
    e.preventDefault();
    const name = $('#newName').value.trim(), pass = $('#newPass').value, role = $('#newRole').value;
    if (pass.length < 8) return msg('סיסמה חייבת להיות לפחות 8 תווים', true);
    await mutate(async v => {
      const id = await C.userId(name);
      if (v.users.some(u => u.id === id)) throw new Error('משתמש בשם הזה כבר קיים');
      v.users.push(await C.makeUser(name, pass, role, session.kRaw));
      return v;
    }, `המשתמש "${name}" נוסף. שלחו לו את הקישור, שם המשתמש והסיסמה.`);
    $('#addUser').reset();
  });
  $('#userList').addEventListener('click', async e => {
    const b = e.target.closest('[data-act]'); if (!b) return;
    const id = b.dataset.id, name = b.dataset.name;
    if (b.dataset.act === 'del') {
      if (!confirm(`למחוק את "${name}"? הגישה שלו תיחסם מיד, וכל השאר יישארו מחוברים.`)) return;
      await mutate(async v => {
        v.users = v.users.filter(u => u.id !== id);
        const r = await C.rotate(v, session.kRaw, session.plaintext);
        session.kRaw = r.kRaw;
        store.set('mm-k', C.b64(r.kRaw), store.remembered());
        return r.vault;
      }, `"${name}" נמחק והמפתח הוחלף.`);
    } else if (b.dataset.act === 'reset') {
      const pass = prompt(`סיסמה חדשה ל-"${name}" (לפחות 8 תווים):`);
      if (!pass) return;
      if (pass.length < 8) return msg('סיסמה חייבת להיות לפחות 8 תווים', true);
      await mutate(async v => {
        const i = v.users.findIndex(u => u.id === id);
        v.users[i] = await C.makeUser(name, pass, v.users[i].role, session.kRaw);
        return v;
      }, `הסיסמה של "${name}" עודכנה.`);
    }
  });
  renderUsers();
}

function msg(t, bad) { const m = $('#adminMsg'); m.textContent = t; m.style.color = bad ? 'var(--danger)' : 'var(--seller)'; }

let latestVault = null;
async function renderUsers() {
  const v = latestVault || await fetchVault();
  const rows = [];
  for (const u of v.users) {
    let name = '?';
    try { name = await C.userName(u, session.kRaw); } catch (e) {}
    const me = u.id === session.id;
    rows.push(`<div class="card" style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">
      <b style="flex:1">${esc(name)}${me ? ' (את/ה)' : ''}</b><span class="badge ${u.role === 'admin' ? 'adv' : ''}">${u.role === 'admin' ? 'מנהל' : 'איש מכירות'}</span>
      <button class="chip" data-act="reset" data-id="${u.id}" data-name="${esc(name)}">איפוס סיסמה</button>
      ${me ? '' : `<button class="chip" style="color:var(--danger)" data-act="del" data-id="${u.id}" data-name="${esc(name)}">מחיקה</button>`}</div>`);
  }
  $('#userList').innerHTML = rows.join('');
}

// קורא את הגרסה העדכנית מ-GitHub, מפעיל שינוי, ושומר
async function mutate(fn, okText) {
  const token = $('#ghToken').value.trim();
  if (!token) return msg('צריך להדביק GitHub Token (הוראות למעלה)', true);
  msg('שומר…');
  const api = `https://api.github.com/repos/${REPO}/contents/vault.json`;
  const h = { Authorization: 'Bearer ' + token, Accept: 'application/vnd.github+json' };
  try {
    const cur = await fetch(api + '?ref=main&t=' + Date.now(), { headers: h, cache: 'no-store' });
    if (!cur.ok) throw new Error(cur.status === 401 ? 'הטוקן לא תקין' : 'שגיאה בקריאה מ-GitHub (' + cur.status + ')');
    const meta = await cur.json();
    const vault = JSON.parse(atob(meta.content.replace(/\n/g, '')));
    session.plaintext = await C.decryptData(vault, session.kRaw); // תמיד על התוכן העדכני
    const next = await fn(vault);
    const body = { message: 'עדכון משתמשים', content: btoa(JSON.stringify(next)), sha: meta.sha, branch: 'main' };
    const put = await fetch(api, { method: 'PUT', headers: h, body: JSON.stringify(body) });
    if (!put.ok) throw new Error(put.status === 403 || put.status === 404 ? 'לטוקן אין הרשאת כתיבה למאגר' : 'שגיאה בשמירה (' + put.status + ')');
    latestVault = next;
    await renderUsers();
    msg(okText + ' האתר יתעדכן תוך כדקה.');
  } catch (e) {
    msg(e.message, true);
  }
}

boot();
