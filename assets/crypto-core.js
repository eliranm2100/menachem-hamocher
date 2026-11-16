// מנחם המוכר: הצפנת תוכן ומשתמשים. עובד גם בדפדפן וגם ב-Node.
// vault.json = { v, users: [...], data: {iv, ct} }
// התוכן מוצפן במפתח ראשי K (AES-GCM). לכל משתמש זוג מפתחות ECDH:
// המפתח הפרטי מוצפן בסיסמה (PBKDF2), ו-K עטוף עבור המפתח הציבורי.
// כך מנהל יכול להוסיף משתמש או להחליף את K (לחסימת משתמש) בלי לדעת סיסמאות של אחרים.
const subtle = globalThis.crypto.subtle;
const enc = new TextEncoder();
const dec = new TextDecoder();
const ITER = 310000;
const EC = { name: 'ECDH', namedCurve: 'P-256' };

export const b64 = buf => { let s = ''; new Uint8Array(buf).forEach(b => s += String.fromCharCode(b)); return btoa(s); };
export const unb64 = str => Uint8Array.from(atob(str), c => c.charCodeAt(0));
const rand = n => globalThis.crypto.getRandomValues(new Uint8Array(n));

export async function sha256hex(str) {
  const h = await subtle.digest('SHA-256', enc.encode(str));
  return [...new Uint8Array(h)].map(b => b.toString(16).padStart(2, '0')).join('');
}
export const userId = name => sha256hex('mm:' + name.trim().toLowerCase());

const importAes = raw => subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt', 'decrypt']);
async function pwKey(password, salt) {
  const base = await subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveKey']);
  return subtle.deriveKey({ name: 'PBKDF2', salt, iterations: ITER, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}
async function aesEnc(key, bytes) {
  const iv = rand(12);
  return { iv: b64(iv), ct: b64(await subtle.encrypt({ name: 'AES-GCM', iv }, key, bytes)) };
}
async function aesDec(key, box) {
  return new Uint8Array(await subtle.decrypt({ name: 'AES-GCM', iv: unb64(box.iv) }, key, unb64(box.ct)));
}
const ecdhAes = (priv, pub) => subtle.deriveKey({ name: 'ECDH', public: pub }, priv, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);

export const newMasterKey = () => rand(32);

async function wrapFor(pubJwk, kRaw) {
  const pub = await subtle.importKey('jwk', pubJwk, EC, false, []);
  const eph = await subtle.generateKey(EC, true, ['deriveKey']);
  const shared = await ecdhAes(eph.privateKey, pub);
  return { epk: await subtle.exportKey('jwk', eph.publicKey), ...(await aesEnc(shared, kRaw)) };
}

export async function makeUser(name, password, role, kRaw) {
  const pair = await subtle.generateKey(EC, true, ['deriveKey']);
  const pubJwk = await subtle.exportKey('jwk', pair.publicKey);
  const privJwk = await subtle.exportKey('jwk', pair.privateKey);
  const salt = rand(16);
  const pk = await pwKey(password, salt);
  const K = await importAes(kRaw);
  return {
    id: await userId(name), role,
    name: await aesEnc(K, enc.encode(name.trim())),
    salt: b64(salt), pub: pubJwk,
    priv: await aesEnc(pk, enc.encode(JSON.stringify(privJwk))),
    wrap: await wrapFor(pubJwk, kRaw)
  };
}

// מחזיר את K (bytes) או זורק שגיאה אם הסיסמה שגויה
export async function unlock(vault, name, password) {
  const id = await userId(name);
  const u = vault.users.find(x => x.id === id);
  if (!u) throw new Error('bad');
  const pk = await pwKey(password, unb64(u.salt));
  const privJwk = JSON.parse(dec.decode(await aesDec(pk, u.priv)));
  const priv = await subtle.importKey('jwk', privJwk, EC, false, ['deriveKey']);
  const epk = await subtle.importKey('jwk', u.wrap.epk, EC, false, []);
  const kRaw = await aesDec(await ecdhAes(priv, epk), u.wrap);
  return { kRaw, user: u };
}

export async function decryptData(vault, kRaw) {
  return dec.decode(await aesDec(await importAes(kRaw), vault.data));
}
export async function encryptData(kRaw, text) {
  return aesEnc(await importAes(kRaw), enc.encode(text));
}
export async function userName(u, kRaw) {
  return dec.decode(await aesDec(await importAes(kRaw), u.name));
}

// החלפת מפתח ראשי: אחרי מחיקת משתמש, כדי שמי שנמחק לא יוכל לפענח יותר
export async function rotate(vault, oldK, plaintext) {
  const newK = newMasterKey();
  const K2 = await importAes(newK);
  const users = [];
  for (const u of vault.users) {
    const name = await userName(u, oldK);
    users.push({ ...u, name: await aesEnc(K2, enc.encode(name)), wrap: await wrapFor(u.pub, newK) });
  }
  const learned = [];
  for (const l of vault.learned || []) learned.push({ id: l.id, box: await encryptData(newK, await decryptData({ data: l.box }, oldK)) });
  return { kRaw: newK, vault: { ...vault, users, learned, data: await encryptData(newK, plaintext) } };
}

// התנגדויות שנוספו ע"י ה-AI: נשמרות מוצפנות ב-vault.learned = [{id, box}]
export async function decryptLearned(vault, kRaw) {
  const out = [];
  for (const l of vault.learned || []) {
    try { out.push({ ...JSON.parse(await decryptData({ data: l.box }, kRaw)), id: l.id }); } catch (e) {}
  }
  return out;
}
