/**
 * Utilidades de formato y seguridad para las plantillas.
 */
import { APP } from '../config.js';

/** Escapa texto del usuario antes de meterlo en HTML. */
export function esc(valor) {
  return String(valor ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const fmtDinero = new Intl.NumberFormat(APP.locale, { style: 'currency', currency: APP.moneda, maximumFractionDigits: 0 });
export const dinero = (n) => fmtDinero.format(n).replace(/\s/g, '');

export const fecha = (ms, opciones = { day: 'numeric', month: 'short' }) =>
  new Date(ms).toLocaleDateString(APP.locale, opciones);

export const hora = (ms) => new Date(ms).toLocaleTimeString(APP.locale, { hour: 'numeric', minute: '2-digit' });

export function fechaHora(ms) {
  const d = new Date(ms);
  const hoy = new Date();
  const manana = new Date();
  manana.setDate(hoy.getDate() + 1);
  const mismoDia = (a, b) => a.toDateString() === b.toDateString();
  const dia = mismoDia(d, hoy) ? 'Hoy' : mismoDia(d, manana) ? 'Mañana' : fecha(ms, { weekday: 'short', day: 'numeric', month: 'short' });
  return `${dia}, ${hora(ms)}`;
}

export const primerNombre = (nombre = '') => nombre.trim().split(/\s+/)[0] || '';

export const iniciales = (nombre = '', apellido = '') =>
  ((nombre[0] || '') + (apellido[0] || nombre.split(' ')[1]?.[0] || '')).toUpperCase();

export function saludo() {
  const h = new Date().getHours();
  if (h < 12) return 'Buenos días';
  if (h < 19) return 'Buenas tardes';
  return 'Buenas noches';
}

/** Frase para cuándo llega el maestro: "mañana a las 10:00 a. m." */
export function fechaFrase(ms) {
  const d = new Date(ms);
  const hoy = new Date();
  const manana = new Date();
  manana.setDate(hoy.getDate() + 1);
  const mismoDia = (a, b) => a.toDateString() === b.toDateString();
  const dia = mismoDia(d, hoy)
    ? 'hoy'
    : mismoDia(d, manana)
      ? 'mañana'
      : 'el ' + fecha(ms, { weekday: 'long', day: 'numeric', month: 'long' });
  return `${dia} a las ${hora(ms)}`;
}
