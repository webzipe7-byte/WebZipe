/**
 * Seguridad de cuentas en el dispositivo.
 *
 * - Contraseñas con PBKDF2-SHA256 (210.000 iteraciones) y sal única por usuario.
 * - Bloqueo temporal tras varios intentos fallidos.
 * - Lista de contraseñas demasiado comunes.
 *
 * En producción todo esto vive en el servidor (y el servidor nunca recibe la
 * contraseña sin HTTPS). Aquí protege los datos guardados en el navegador.
 */
import { almacen } from './almacen.js';

const ITERACIONES = 210000;
export const MAX_INTENTOS = 5;
export const BLOQUEO_MS = 5 * 60 * 1000;

const aHex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
const deHex = (hex) => new Uint8Array(hex.match(/.{2}/g).map((h) => parseInt(h, 16)));

export function nuevaSal() {
  const sal = new Uint8Array(16);
  crypto.getRandomValues(sal);
  return aHex(sal);
}

/** Deriva la clave de la contraseña. Devuelve 'pbkdf2$iteraciones$sal$hash'. */
export async function derivar(clave, sal = nuevaSal(), iteraciones = ITERACIONES) {
  if (!window.crypto?.subtle) {
    throw new Error('Abre Camello desde la app instalada o con https para proteger tu contraseña.');
  }
  const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(clave), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: deHex(sal), iterations: iteraciones }, base, 256);
  return `pbkdf2$${iteraciones}$${sal}$${aHex(bits)}`;
}

/** Compara en tiempo constante para no dar pistas por la demora. */
function iguales(a, b) {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

/** Hash antiguo (SHA-256 sin sal) de las primeras versiones del demo. */
async function sha256(texto) {
  const r = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(texto));
  return aHex(r);
}

/**
 * Verifica una contraseña contra lo guardado.
 * Devuelve { ok, actualizar } — actualizar=true si el hash es de un formato viejo.
 */
export async function verificar(clave, guardado) {
  if (!guardado) return { ok: false };
  if (guardado.startsWith('pbkdf2$')) {
    const [, iter, sal] = guardado.split('$');
    return { ok: iguales(await derivar(clave, sal, Number(iter)), guardado), actualizar: Number(iter) < ITERACIONES };
  }
  return { ok: iguales(await sha256(clave), guardado), actualizar: true };
}

/* ---------- Intentos fallidos ---------- */
const CLAVE_INTENTOS = 'intentos';

export const intentos = {
  /** Milisegundos que faltan de bloqueo para esta llave (correo, cupones…), o 0. */
  bloqueado(llave) {
    const r = almacen.leer(CLAVE_INTENTOS, {})[llave];
    if (!r?.hasta) return 0;
    return Math.max(0, r.hasta - Date.now());
  },
  fallo(llave) {
    const todos = almacen.leer(CLAVE_INTENTOS, {});
    const r = todos[llave] && (!todos[llave].hasta || todos[llave].hasta > Date.now()) ? todos[llave] : { n: 0 };
    r.n += 1;
    if (r.n >= MAX_INTENTOS) r.hasta = Date.now() + BLOQUEO_MS;
    todos[llave] = r;
    almacen.guardar(CLAVE_INTENTOS, todos);
    return MAX_INTENTOS - r.n;
  },
  limpiar(llave) {
    const todos = almacen.leer(CLAVE_INTENTOS, {});
    delete todos[llave];
    almacen.guardar(CLAVE_INTENTOS, todos);
  },
};

export const minutosRestantes = (ms) => Math.max(1, Math.ceil(ms / 60000));

/* ---------- Contraseñas débiles ---------- */
const COMUNES = new Set([
  '12345678', '123456789', '1234567890', 'password', 'password1', 'contraseña', 'contrasena1', 'qwerty123',
  'abc12345', 'abcd1234', 'colombia1', 'colombia123', 'teamo123', 'iloveyou1', 'admin123', 'camello1', 'camello123',
  'qwerty12', '11111111', '00000000', 'a1234567', 'america1', 'millonarios1', 'nacional1',
]);

/** Revisa que la contraseña no sea obvia. Devuelve el mensaje de error o ''. */
export function claveDebil(clave, { nombre = '', correo = '' } = {}) {
  const c = clave.toLowerCase();
  if (COMUNES.has(c)) return 'Esa contraseña es muy común. Elige otra.';
  if (/^(.)\1+$/.test(c) || /(0123|1234|2345|3456|4567|5678|6789|abcd|qwer)/.test(c) && c.length < 10) {
    return 'Evita secuencias como 1234 o abcd.';
  }
  const partes = [nombre.split(/\s+/)[0], correo.split('@')[0]].map((x) => x?.toLowerCase()).filter((x) => x && x.length >= 4);
  if (partes.some((p) => c.includes(p))) return 'No uses tu nombre o tu correo en la contraseña.';
  return '';
}
