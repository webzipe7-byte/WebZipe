'use strict';
/* Mis Finanzas — PWA. Datos 100% locales (localStorage); contraseñas con PBKDF2. */
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const LS = { users: 'fin_users', session: 'fin_session', data: u => 'fin_data_' + u };
const load = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
const save = (k, v) => localStorage.setItem(k, JSON.stringify(v));
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : Date.now() + '-' + Math.random().toString(16).slice(2));
const todayStr = () => { const d = new Date(); return new Date(d - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10); };
const monthOf = ds => ds.slice(0, 7);

let user = null, data = null, regPromise = null, mode = 'login', deferredInstall = null;

/* ---------- Service worker & instalación ---------- */
if ('serviceWorker' in navigator) {
  regPromise = navigator.serviceWorker.register('sw.js').catch(() => null);
}
window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault(); deferredInstall = e;
  $('#installBtn').hidden = false; $('#installBtn2').hidden = false;
});
window.addEventListener('appinstalled', () => { $('#installBtn').hidden = true; $('#installBtn2').hidden = true; toast('¡Aplicación instalada!'); });
async function install() { if (!deferredInstall) return; deferredInstall.prompt(); await deferredInstall.userChoice; deferredInstall = null; $('#installBtn').hidden = $('#installBtn2').hidden = true; }
$('#installBtn').onclick = $('#installBtn2').onclick = install;

/* ---------- Utilidades UI ---------- */
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.remove('hidden'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.add('hidden'), 3000); }
const money = n => new Intl.NumberFormat('es', { style: 'currency', currency: data?.currency || 'USD' }).format(n || 0);

/* ---------- Autenticación ---------- */
const b64 = buf => btoa(String.fromCharCode(...new Uint8Array(buf)));
const unb64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
async function hashPass(pass, saltB64) {
  const salt = saltB64 ? unb64(saltB64) : crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(pass), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: 150000 }, key, 256);
  return { salt: b64(salt), hash: b64(bits) };
}
$$('.tab').forEach(b => b.onclick = () => {
  mode = b.dataset.mode;
  $$('.tab').forEach(x => x.classList.toggle('active', x === b));
  $('#regWrap').classList.toggle('hidden', mode !== 'register');
  for (const id of ['#authPass2', '#authEmail', '#authPhone']) $(id).required = mode === 'register';
  $('#authSubmit').textContent = mode === 'register' ? 'Crear cuenta' : 'Entrar';
  $('#authPass').autocomplete = mode === 'register' ? 'new-password' : 'current-password';
  $('#authError').textContent = '';
});
$('#authForm').onsubmit = async e => {
  e.preventDefault();
  const name = $('#authUser').value.trim().toLowerCase(), pass = $('#authPass').value, err = $('#authError');
  err.textContent = ''; err.style.color = '';
  if (!crypto.subtle) { err.textContent = 'Se necesita HTTPS para usar cuentas seguras.'; return; }
  const users = load(LS.users, {});
  if (mode === 'register') {
    if (users[name]) { err.textContent = 'Ese usuario ya existe.'; return; }
    if (pass !== $('#authPass2').value) { err.textContent = 'Las contraseñas no coinciden.'; return; }
    const email = $('#authEmail').value.trim().toLowerCase(), phone = $('#authPhone').value.trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { err.textContent = 'Escribe un correo válido.'; return; }
    if (phone.replace(/\D/g, '').length < 7) { err.textContent = 'Escribe un número de teléfono válido.'; return; }
    if (Object.values(users).some(u => u.email === email)) { err.textContent = 'Ese correo ya está registrado.'; return; }
    users[name] = { ...(await hashPass(pass)), email, phone }; save(LS.users, users);
    save(LS.data(name), { tx: [], notes: [], limit: 0, currency: 'USD', alerts: {} });
  } else {
    const u = users[name];
    if (!u || (await hashPass(pass, u.salt)).hash !== u.hash) { err.textContent = 'Usuario o contraseña incorrectos.'; return; }
  }
  localStorage.setItem(LS.session, name);
  $('#authForm').reset(); startApp(name);
};
$('#logoutBtn').onclick = () => { localStorage.removeItem(LS.session); clearInterval(startApp.timer); user = data = null; $('#app').classList.add('hidden'); $('#auth').classList.remove('hidden'); };

/* ---------- Recuperar contraseña (código por correo con EmailJS) ---------- */
let reset = null; // { name, code, exp, tries } solo en memoria
const rsMsg = (t, ok) => { const m = $('#rsMsg'); m.textContent = t; m.style.color = ok ? 'var(--pos)' : ''; };
$('#forgotBtn').onclick = () => { $('#authForm').classList.add('hidden'); $('#resetForm').classList.remove('hidden'); $('#rsEmail').value = $('#authUser').value.includes('@') ? $('#authUser').value : ''; rsMsg(''); };
$('#rsBack').onclick = () => { reset = null; $('#resetForm').classList.add('hidden'); $('#rsStep2').classList.add('hidden'); $('#authForm').classList.remove('hidden'); };
$('#rsSend').onclick = async () => {
  const email = $('#rsEmail').value.trim().toLowerCase(), cfg = window.FIN_CONFIG?.emailjs;
  if (!email) return rsMsg('Escribe tu correo.');
  if (!cfg?.serviceId || !cfg?.templateId || !cfg?.publicKey) return rsMsg('El envío de correos aún no está configurado (ver README: config.js).');
  const entry = Object.entries(load(LS.users, {})).find(([, u]) => u.email === email);
  const msg = 'Si el correo está registrado, te enviamos un código. Revisa tu bandeja y el spam.';
  if (!entry) return rsMsg(msg, true);
  const code = String(crypto.getRandomValues(new Uint32Array(1))[0] % 1e6).padStart(6, '0');
  rsMsg('Enviando…', true);
  try {
    const r = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ service_id: cfg.serviceId, template_id: cfg.templateId, user_id: cfg.publicKey,
        template_params: { to_email: email, username: entry[0], code, minutes: 10 } })
    });
    if (!r.ok) throw new Error(await r.text());
  } catch { return rsMsg('No se pudo enviar el correo. Inténtalo más tarde.'); }
  reset = { name: entry[0], code, exp: Date.now() + 10 * 60000, tries: 0 };
  $('#rsStep2').classList.remove('hidden'); rsMsg(msg, true);
};
$('#resetForm').onsubmit = async e => {
  e.preventDefault();
  if (!reset || Date.now() > reset.exp) { reset = null; return rsMsg('El código expiró. Pide uno nuevo.'); }
  if (++reset.tries > 5) { reset = null; return rsMsg('Demasiados intentos. Pide un código nuevo.'); }
  if ($('#rsCode').value.trim() !== reset.code) return rsMsg('Código incorrecto.');
  const pass = $('#rsPass').value; if (pass.length < 6) return rsMsg('La contraseña debe tener al menos 6 caracteres.');
  const users = load(LS.users, {}); Object.assign(users[reset.name], await hashPass(pass)); save(LS.users, users);
  reset = null; $('#resetForm').reset(); $('#rsBack').click(); $('#authError').textContent = '✅ Contraseña cambiada. Ya puedes entrar.'; $('#authError').style.color = 'var(--pos)';
};

/* ---------- Arranque ---------- */
function startApp(name) {
  user = name; data = Object.assign({ tx: [], notes: [], limit: 0, currency: 'USD', alerts: {} }, load(LS.data(name), {}));
  $('#auth').classList.add('hidden'); $('#app').classList.remove('hidden');
  $('#whoami').textContent = '👤 ' + name;
  $('#txDate').value = todayStr(); $('#txMonth').value = monthOf(todayStr());
  $('#currencySel').value = data.currency; $('#limitInput').value = data.limit || '';
  updateNotifBanner(); renderAll(); checkReminders();
  clearInterval(startApp.timer); startApp.timer = setInterval(checkReminders, 15000);
}
const persist = () => save(LS.data(user), data);
function renderAll() { renderSummary(); renderTx(); renderNotes(); }

$$('.nav').forEach(b => b.onclick = () => {
  $$('.nav').forEach(x => x.classList.toggle('active', x === b));
  $$('.panel').forEach(p => p.classList.toggle('hidden', p.id !== 'tab-' + b.dataset.tab));
});

/* ---------- Notificaciones ---------- */
async function notify(title, body, tag) {
  toast(title);
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  const opts = { body, tag, icon: 'icons/icon-192.png', badge: 'icons/icon-192.png', vibrate: [200, 100, 200] };
  try {
    const reg = await navigator.serviceWorker?.ready;
    if (reg) return reg.showNotification(title, opts);
  } catch {}
  new Notification(title, opts);
}
function updateNotifBanner() {
  const need = 'Notification' in window && Notification.permission === 'default';
  $('#notifBanner').classList.toggle('hidden', !need);
}
$('#enableNotif').onclick = async () => { await Notification.requestPermission(); updateNotifBanner(); };

/* ---------- Resumen y límite ---------- */
function monthTotals(m) {
  let inc = 0, out = 0, cats = {};
  for (const t of data.tx) if (monthOf(t.date) === m) {
    if (t.type === 'ingreso') inc += t.amount; else { out += t.amount; cats[t.cat] = (cats[t.cat] || 0) + t.amount; }
  }
  return { inc, out, cats };
}
function renderSummary() {
  const m = monthOf(todayStr()), { inc, out, cats } = monthTotals(m), lim = data.limit || 0;
  $('#sumIn').textContent = money(inc); $('#sumOut').textContent = money(out);
  const bal = $('#sumBal'); bal.textContent = money(inc - out); bal.className = inc - out >= 0 ? 'pos' : 'neg';
  const pct = lim ? out / lim * 100 : 0, bar = $('#meterBar'), banner = $('#alertBanner');
  bar.style.width = Math.min(pct, 100) + '%';
  bar.style.background = pct >= 100 ? 'var(--neg)' : pct >= 80 ? 'var(--warn)' : 'var(--pos)';
  $('#meterText').textContent = lim ? `${money(out)} de ${money(lim)} (${pct.toFixed(0)}%)` : 'Define un límite para recibir avisos.';
  banner.className = 'banner' + (pct >= 100 ? '' : pct >= 80 ? ' warn' : ' hidden');
  banner.textContent = pct >= 100 ? `⚠️ ¡Has excedido tu límite mensual por ${money(out - lim)}!` : pct >= 80 ? `⚠️ Estás cerca de tu límite: llevas ${pct.toFixed(0)}%.` : '';
  const total = Object.values(cats).reduce((a, b) => a + b, 0);
  $('#catChart').innerHTML = total ? Object.entries(cats).sort((a, b) => b[1] - a[1]).map(([c, v]) =>
    `<div class="bar-row"><span>${esc(c)}</span><div class="track"><div class="fill" style="width:${v / total * 100}%"></div></div><b>${money(v)}</b></div>`).join('')
    : '<p class="muted">Sin gastos este mes.</p>';
  $('#cats').innerHTML = [...new Set(data.tx.map(t => t.cat))].map(c => `<option value="${esc(c)}">`).join('');
}
$('#limitForm').onsubmit = e => {
  e.preventDefault(); data.limit = Math.max(0, parseFloat($('#limitInput').value) || 0); data.alerts = {};
  persist(); renderSummary(); toast('Límite guardado'); checkLimit(false);
};
function checkLimit(fromNewExpense) {
  const lim = data.limit; if (!lim) return;
  const m = monthOf(todayStr()), out = monthTotals(m).out, pct = out / lim * 100;
  if (pct >= 100 && (fromNewExpense || !data.alerts[m + 'x'])) {
    data.alerts[m + 'x'] = 1; persist();
    notify('⚠️ Límite excedido', `Llevas ${money(out)} y tu límite es ${money(lim)}. Te pasaste por ${money(out - lim)}.`, 'limit-over');
  } else if (pct >= 80 && pct < 100 && !data.alerts[m + 'w']) {
    data.alerts[m + 'w'] = 1; persist();
    notify('Estás cerca de tu límite', `Has gastado el ${pct.toFixed(0)}% de ${money(lim)}.`, 'limit-warn');
  }
}

/* ---------- Movimientos ---------- */
$('#txForm').onsubmit = e => {
  e.preventDefault();
  const t = { id: uid(), type: $('#txType').value, amount: parseFloat($('#txAmount').value), cat: $('#txCat').value.trim(), date: $('#txDate').value, desc: $('#txDesc').value.trim() };
  if (!(t.amount > 0) || !t.cat) return;
  data.tx.push(t); persist(); e.target.reset(); $('#txDate').value = todayStr();
  renderAll(); toast(t.type === 'gasto' ? 'Gasto registrado' : 'Ingreso registrado');
  if (t.type === 'gasto') checkLimit(true);
};
$('#txMonth').onchange = renderTx;
function renderTx() {
  const m = $('#txMonth').value || monthOf(todayStr());
  const items = data.tx.filter(t => monthOf(t.date) === m).sort((a, b) => b.date.localeCompare(a.date));
  $('#txEmpty').classList.toggle('hidden', items.length > 0);
  $('#txList').innerHTML = items.map(t => `<li><div class="meta"><span>${esc(t.cat)}${t.desc ? ' · ' + esc(t.desc) : ''}</span><small>${esc(t.date)}</small></div>
    <span class="amt ${t.type === 'gasto' ? 'neg' : 'pos'}">${t.type === 'gasto' ? '−' : '+'}${money(t.amount)}</span>
    <button class="icon-btn" data-del="${t.id}" aria-label="Eliminar">🗑️</button></li>`).join('');
}
$('#txList').onclick = e => {
  const id = e.target.dataset.del; if (!id || !confirm('¿Eliminar este movimiento?')) return;
  data.tx = data.tx.filter(t => t.id !== id); persist(); renderAll();
};

/* ---------- Notas y recordatorios ---------- */
$('#noteForm').onsubmit = async e => {
  e.preventDefault();
  const r = $('#noteRemind').value;
  data.notes.unshift({ id: uid(), title: $('#noteTitle').value.trim(), body: $('#noteBody').value.trim(), remindAt: r ? new Date(r).getTime() : null, notified: false });
  persist(); e.target.reset(); renderNotes(); toast('Nota guardada');
  if (r && 'Notification' in window && Notification.permission === 'default') { await Notification.requestPermission(); updateNotifBanner(); }
};
function renderNotes() {
  $('#noteEmpty').classList.toggle('hidden', data.notes.length > 0);
  $('#noteList').innerHTML = data.notes.map(n => `<li><div class="meta"><b>${esc(n.title)}</b>
    ${n.body ? `<div class="body">${esc(n.body)}</div>` : ''}
    ${n.remindAt ? `<small>${n.notified ? '✅' : '⏰'} ${new Date(n.remindAt).toLocaleString('es')}</small>` : ''}</div>
    <button class="icon-btn" data-delnote="${n.id}" aria-label="Eliminar">🗑️</button></li>`).join('');
}
$('#noteList').onclick = e => {
  const id = e.target.dataset.delnote; if (!id || !confirm('¿Eliminar esta nota?')) return;
  data.notes = data.notes.filter(n => n.id !== id); persist(); renderNotes();
};
function checkReminders() {
  if (!data) return;
  const now = Date.now(); let changed = false;
  for (const n of data.notes) if (n.remindAt && !n.notified && n.remindAt <= now) {
    n.notified = true; changed = true; notify('🔔 Recordatorio: ' + n.title, n.body || 'Tienes una nota pendiente.', 'note-' + n.id);
  }
  if (changed) { persist(); renderNotes(); }
}
document.addEventListener('visibilitychange', () => { if (!document.hidden) checkReminders(); });

/* ---------- Ajustes ---------- */
$('#currencySel').onchange = e => { data.currency = e.target.value; persist(); renderAll(); };
$('#exportBtn').onclick = () => {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
  a.download = `finanzas-${user}-${todayStr()}.json`; a.click(); URL.revokeObjectURL(a.href);
};
$('#importFile').onchange = async e => {
  try {
    const d = JSON.parse(await e.target.files[0].text());
    if (!Array.isArray(d.tx) || !Array.isArray(d.notes)) throw 0;
    if (!confirm('Esto reemplazará tus datos actuales. ¿Continuar?')) return;
    data = Object.assign({ limit: 0, currency: 'USD', alerts: {} }, d); persist(); startApp(user); toast('Datos importados');
  } catch { toast('Archivo no válido'); }
  e.target.value = '';
};
$('#deleteAcc').onclick = () => {
  if (!confirm('Se borrará tu cuenta y todos tus datos de este dispositivo. ¿Seguro?')) return;
  const users = load(LS.users, {}); delete users[user]; save(LS.users, users); localStorage.removeItem(LS.data(user)); $('#logoutBtn').click();
};

/* ---------- Inicio ---------- */
const s = localStorage.getItem(LS.session);
if (s && load(LS.users, {})[s]) startApp(s); else $('#auth').classList.remove('hidden');
