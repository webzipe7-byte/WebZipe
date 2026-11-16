/**
 * Cupones de descuento.
 * En el demo el catálogo vive aquí; en producción lo administra el servidor.
 */
import { auth } from './auth.js';
import { esperar } from './almacen.js';

export const CATALOGO = {
  BIENVENIDO: { titulo: '20% en tu primer camello', porcentaje: 0.2, tope: 20000, soloPrimero: true },
  CAMELLO10: { titulo: '10% en cualquier servicio', porcentaje: 0.1, tope: 15000 },
  HOGAR5000: { titulo: '$5.000 de descuento', valor: 5000, minimo: 50000 },
};

/** Calcula el descuento de un cupón sobre un valor. */
export function descuentoDe(codigo, subtotal) {
  const c = CATALOGO[codigo];
  if (!c) return 0;
  if (c.minimo && subtotal < c.minimo) return 0;
  const bruto = c.valor ?? subtotal * c.porcentaje;
  return Math.min(Math.round(bruto / 1000) * 1000, c.tope ?? Infinity, subtotal);
}

export const cupones = {
  /** Cupones del usuario que todavía se pueden usar. */
  disponibles(usuario, { tienePedidos = false } = {}) {
    return usuario.cupones
      .filter((c) => !c.usado && CATALOGO[c.codigo])
      .filter((c) => !(CATALOGO[c.codigo].soloPrimero && tienePedidos))
      .map((c) => ({ ...c, ...CATALOGO[c.codigo] }));
  },

  usados: (usuario) => usuario.cupones.filter((c) => c.usado).map((c) => ({ ...c, ...CATALOGO[c.codigo] })),

  async agregar(usuarioId, texto) {
    await esperar(600);
    const codigo = texto.trim().toUpperCase().replace(/\s+/g, '');
    if (!codigo) throw new Error('Escribe el código del cupón.');
    if (!CATALOGO[codigo]) throw new Error('Ese código no existe o ya venció.');
    let repetido = false;
    const usuario = auth.modificar(usuarioId, (u) => {
      if (u.cupones.some((c) => c.codigo === codigo)) repetido = true;
      else u.cupones.push({ codigo, agregado: Date.now(), usado: null });
    });
    if (repetido) throw new Error('Ya tienes este cupón en tu cuenta.');
    return usuario;
  },

  marcarUsado: (usuarioId, codigo, pedidoId) =>
    auth.modificar(usuarioId, (u) => {
      const c = u.cupones.find((x) => x.codigo === codigo && !x.usado);
      if (c) c.usado = { fecha: Date.now(), pedidoId };
    }),
};
