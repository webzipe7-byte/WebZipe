/**
 * Billetera: métodos de pago guardados.
 *
 * Demo: de una tarjeta solo se guardan la franquicia y los últimos 4 dígitos.
 * El número completo nunca se almacena. En producción la tarjeta se registra
 * directamente en la pasarela de pagos (tokenización) y aquí solo queda el token.
 */
import { auth } from './auth.js';
import { esperar, generarId } from './almacen.js';

/** Algoritmo de Luhn: detecta números de tarjeta mal escritos. */
export function tarjetaValida(numero) {
  const d = numero.replace(/\D/g, '');
  if (d.length < 13 || d.length > 19) return false;
  let suma = 0;
  for (let i = 0; i < d.length; i++) {
    let n = Number(d[d.length - 1 - i]);
    if (i % 2 === 1) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    suma += n;
  }
  return suma % 10 === 0;
}

export function franquicia(numero) {
  const d = numero.replace(/\D/g, '');
  if (/^4/.test(d)) return 'Visa';
  if (/^(5[1-5]|2[2-7])/.test(d)) return 'Mastercard';
  if (/^3[47]/.test(d)) return 'American Express';
  if (/^(30|36|38)/.test(d)) return 'Diners';
  return 'Tarjeta';
}

/** Valida MM/AA y que no esté vencida. */
export function vencimientoValido(texto) {
  const m = /^(\d{2})\s*\/\s*(\d{2})$/.exec(texto.trim());
  if (!m) return false;
  const mes = Number(m[1]);
  const anio = 2000 + Number(m[2]);
  if (mes < 1 || mes > 12) return false;
  const fin = new Date(anio, mes, 0, 23, 59);
  return fin >= new Date();
}

export const ICONO_METODO = { tarjeta: 'tarjeta', nequi: 'celular', efectivo: 'billete' };

export const billetera = {
  metodos: (usuario) => usuario.metodos,

  metodo: (usuario, id) => usuario.metodos.find((m) => m.id === id) || usuario.metodos[0],

  async agregarTarjeta(usuarioId, { numero, nombre }) {
    await esperar(900);
    const d = numero.replace(/\D/g, '');
    const marca = franquicia(d);
    const metodo = { id: generarId('tj_'), tipo: 'tarjeta', nombre: `${marca} •••• ${d.slice(-4)}`, titular: nombre.trim() };
    return auth.modificar(usuarioId, (u) => {
      u.metodos.push(metodo);
      u.metodoPreferido = metodo.id;
    });
  },

  async agregarNequi(usuarioId, telefono) {
    await esperar(700);
    const d = telefono.replace(/\D/g, '').slice(-10);
    const metodo = { id: generarId('nq_'), tipo: 'nequi', nombre: `Nequi •••• ${d.slice(-4)}` };
    return auth.modificar(usuarioId, (u) => {
      u.metodos.push(metodo);
      u.metodoPreferido = metodo.id;
    });
  },

  preferir: (usuarioId, metodoId) => auth.modificar(usuarioId, (u) => (u.metodoPreferido = metodoId)),

  eliminar: (usuarioId, metodoId) =>
    auth.modificar(usuarioId, (u) => {
      u.metodos = u.metodos.filter((m) => m.id !== metodoId || m.tipo === 'efectivo');
      if (!u.metodos.some((m) => m.id === u.metodoPreferido)) u.metodoPreferido = u.metodos[0].id;
    }),
};
