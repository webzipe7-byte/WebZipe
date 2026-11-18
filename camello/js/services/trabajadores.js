/**
 * Maestros: solo personas reales que crearon su cuenta de maestro.
 * No hay maestros de ejemplo.
 */
import { categoriaPorId } from '../data/categorias.js';
import { RECARGO_URGENCIA } from '../config.js';
import { almacen, esperar } from './almacen.js';
import { sincronizar, VIVO_MS } from './sincronizar.js';
import { maestrosRegistrados, usuarioPublico } from './auth.js';
import { distanciaKm, posicionEnVivo } from './ubicacion.js';

const COLORES = ['#7a3519', '#0F766E', '#B45309', '#7C3AED', '#0369A1', '#4D7C0F'];

/**
 * Convierte la cuenta de un maestro registrado en la ficha que ven los clientes.
 * La calificación y el número de trabajos salen de sus pedidos reales.
 */
export function fichaMaestro(u, desde = null) {
  if (!u?.maestro) return null;
  // Reseñas que yo le dejé (las demás son privadas de cada cliente)
  const calificados = almacen.leer('pedidos', []).filter((p) => p.trabajadorId === u.id && p.calificacion?.estrellas);
  // Sin calificaciones todavía: se muestra como "Nuevo", no se inventa un puntaje
  const promedio = u.calificaciones ? u.calificacionSuma / u.calificaciones : null;
  const [nombre, ...resto] = u.nombre.split(' ');
  const cat = categoriaPorId(u.maestro.categoria);
  const aqui = posicionEnVivo(u.id);
  const km = desde && aqui ? distanciaKm(desde, aqui) : 1.5;
  return {
    id: u.id,
    real: true,
    categoria: u.maestro.categoria,
    nombre,
    apellido: resto.join(' '),
    anios: u.maestro.anios,
    calificacion: promedio === null ? null : Math.round(promedio * 10) / 10,
    trabajos: u.trabajosHechos || 0,
    distanciaKm: Math.round(Math.max(0.2, km) * 10) / 10,
    factorPrecio: 1,
    especialidades: cat ? [cat.nombre] : [],
    verificado: false,
    mujer: false,
    color: COLORES[u.id.length % COLORES.length],
    enLinea: !!u.maestro.conectado,
    visto: u.visto || 0,
    resenas: calificados
      .slice(-3)
      .reverse()
      .map((p) => ({
        cliente: (usuarioPublico(p.usuarioId)?.nombre || 'Cliente').split(' ')[0],
        estrellas: p.calificacion.estrellas,
        texto: p.calificacion.comentario || 'Sin comentario.',
        hace: new Date(p.calificacion.fecha).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' }),
      })),
  };
}

const maestroPorId = (id) => fichaMaestro(maestrosRegistrados().find((u) => u.id === id));

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
  /** desde: punto del cliente, para calcular la distancia a los maestros conectados. */
  /**
   * Maestros conectados de un oficio en la ciudad del servicio.
   * Pregunta al servidor; si no hay señal, usa los que ya se conocen.
   */
  async disponibles(categoriaId, opciones = {}) {
    let delServidor = null;
    if (opciones.ciudad) {
      try {
        delServidor = new Set(await sincronizar.maestrosConectados(categoriaId, opciones.ciudad));
      } catch (e) {
        if (e.codigo !== 'red') throw e;
      }
    }
    const lista = trabajadores.disponiblesLocal(categoriaId, opciones);
    // Si el servidor respondió, manda él: quien no vino ya no está disponible
    return delServidor ? lista.filter((t) => delServidor.has(t.id)) : lista;
  },

  /** Igual que disponibles, pero solo con lo que ya está en el teléfono (para refrescar la lista al instante). */
  disponiblesLocal(categoriaId, { urgente = true, desde = null, ciudad = '' } = {}) {
    return maestrosRegistrados()
      .filter((u) => u.maestro.conectado && u.maestro.categoria === categoriaId && (!ciudad || u.ciudad === ciudad) && Date.now() - (u.visto || 0) < VIVO_MS)
      .map((u) => fichaMaestro(u, desde))
      .map((t) => ({ ...t, minutos: minutosLlegada(t.distanciaKm), precio: cotizar(t, { urgente }) }));
  },

  async porId(id) {
    await esperar(300);
    const t = maestroPorId(id);
    if (!t) throw new Error('No encontramos a este trabajador.');
    return { ...t, minutos: minutosLlegada(t.distanciaKm) };
  },

  /** Versión sin espera, para pantallas que ya tienen el pedido cargado. */
  /** Si el maestro borró su cuenta, se muestra solo como "Maestro". */
  buscarLocal: (id) =>
    maestroPorId(id) || { id, nombre: 'Maestro', apellido: '', categoria: 'cerrajero', calificacion: null, trabajos: 0, anios: 0, especialidades: [], resenas: [], color: '#7a3519' },
};

export const ORDENES = {
  cercano: { nombre: 'Más cerca', fn: (a, b) => a.distanciaKm - b.distanciaKm },
  calificacion: { nombre: 'Mejor calificado', fn: (a, b) => (b.calificacion ?? 0) - (a.calificacion ?? 0) || b.trabajos - a.trabajos },
  precio: { nombre: 'Menor precio', fn: (a, b) => a.precio.total - b.precio.total },
};
