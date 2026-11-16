/**
 * Búsqueda de trabajadores disponibles y cálculo de precios.
 * En producción: el servidor devuelve los trabajadores cercanos con su ubicación real
 * y el precio lo define la plataforma o el propio trabajador.
 */
import { TRABAJADORES } from '../data/trabajadores.js';
import { categoriaPorId } from '../data/categorias.js';
import { RECARGO_URGENCIA } from '../config.js';
import { esperar } from './almacen.js';

/** Redondea a miles, como se cobra en la vida real. */
const aMiles = (n) => Math.round(n / 1000) * 1000;

/** Minutos estimados de llegada según la distancia (tráfico de ciudad ≈ 18 km/h). */
export const minutosLlegada = (km) => Math.max(8, Math.round((km / 18) * 60) + 5);

export function cotizar(trabajador, { urgente }) {
  const cat = categoriaPorId(trabajador.categoria);
  const visita = cat.visita;
  const manoObra = aMiles(cat.precioBase * trabajador.factorPrecio);
  const recargo = urgente ? aMiles((visita + manoObra) * RECARGO_URGENCIA) : 0;
  return { visita, manoObra, recargo, total: visita + manoObra + recargo };
}

export const trabajadores = {
  async disponibles(categoriaId, { urgente = true } = {}) {
    await esperar(900);
    return TRABAJADORES.filter((t) => t.categoria === categoriaId).map((t) => ({
      ...t,
      minutos: minutosLlegada(t.distanciaKm),
      precio: cotizar(t, { urgente }),
    }));
  },

  async porId(id) {
    await esperar(300);
    const t = TRABAJADORES.find((x) => x.id === id);
    if (!t) throw new Error('No encontramos a este trabajador.');
    return { ...t, minutos: minutosLlegada(t.distanciaKm) };
  },

  /** Versión sin espera, para pantallas que ya tienen el pedido cargado. */
  buscarLocal: (id) => TRABAJADORES.find((x) => x.id === id),
};

export const ORDENES = {
  cercano: { nombre: 'Más cerca', fn: (a, b) => a.distanciaKm - b.distanciaKm },
  calificacion: { nombre: 'Mejor calificado', fn: (a, b) => b.calificacion - a.calificacion || b.trabajos - a.trabajos },
  precio: { nombre: 'Menor precio', fn: (a, b) => a.precio.total - b.precio.total },
};
