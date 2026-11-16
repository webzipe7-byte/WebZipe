/**
 * Pedidos de servicio y su ciclo de vida.
 *
 * El estado del pedido NO se guarda paso a paso: se calcula a partir de la hora
 * en que empezó (`inicio`) y de los tiempos de SIMULACION. Así el seguimiento
 * sigue funcionando aunque la persona cierre y vuelva a abrir la app.
 *
 * Para la versión real, `estadoDe()` se reemplaza por el estado que envía
 * el servidor (o el trabajador desde su app) y lo demás sigue igual.
 */
import { almacen, esperar, generarId } from './almacen.js';
import { SIMULACION } from '../config.js';

const CLAVE = 'pedidos';

/** Orden de los estados y textos que ve el usuario. */
export const ESTADOS = [
  { id: 'buscando', nombre: 'Buscando', titulo: 'Confirmando con el maestro', detalle: 'Le avisamos de tu solicitud.' },
  { id: 'aceptado', nombre: 'Aceptado', titulo: 'Aceptó tu solicitud', detalle: 'Se está preparando para salir.' },
  { id: 'en_camino', nombre: 'En camino', titulo: 'Va en camino', detalle: 'Ten lista la entrada.' },
  { id: 'en_proceso', nombre: 'En proceso', titulo: 'Trabajando en tu servicio', detalle: 'Te avisamos cuando termine.' },
  { id: 'finalizado', nombre: 'Finalizado', titulo: 'Servicio terminado', detalle: 'Revisa el trabajo y paga.' },
];

const DURACION = {
  buscando: SIMULACION.buscando,
  aceptado: SIMULACION.aceptado,
  en_camino: SIMULACION.enCamino,
  en_proceso: SIMULACION.enProceso,
};

/**
 * Estado actual del pedido.
 * Devuelve { id, indice, avance (0..1 dentro del estado), terminado }.
 */
export function estadoDe(pedido, ahora = Date.now()) {
  if (pedido.cancelado) return { id: 'cancelado', indice: -1, avance: 0 };
  if (!pedido.inicio) return { id: 'agendado', indice: 1, avance: 0 };

  let transcurrido = ahora - pedido.inicio;
  for (let i = 0; i < ESTADOS.length - 1; i++) {
    const id = ESTADOS[i].id;
    if (transcurrido < DURACION[id]) {
      return { id, indice: i, avance: transcurrido / DURACION[id], restanteMs: DURACION[id] - transcurrido };
    }
    transcurrido -= DURACION[id];
  }
  return { id: 'finalizado', indice: ESTADOS.length - 1, avance: 1 };
}

/** Etapa del pedido desde el punto de vista del usuario (para el historial y avisos). */
export function etapaDe(pedido, ahora = Date.now()) {
  const e = estadoDe(pedido, ahora);
  if (e.id === 'cancelado') return 'cancelado';
  if (e.id !== 'finalizado') return 'activo';
  if (!pedido.pago) return 'por_pagar';
  if (!pedido.calificacion) return 'por_calificar';
  return 'completado';
}

export const sePuedeCancelar = (pedido) => ['buscando', 'aceptado', 'agendado'].includes(estadoDe(pedido).id);

const todos = () => almacen.leer(CLAVE, []);
const guardarTodos = (lista) => almacen.guardar(CLAVE, lista);

function actualizar(id, cambios) {
  const lista = todos();
  const i = lista.findIndex((p) => p.id === id);
  if (i < 0) throw new Error('No encontramos este pedido.');
  lista[i] = { ...lista[i], ...cambios };
  guardarTodos(lista);
  return lista[i];
}

export const pedidos = {
  async crear(datos) {
    await esperar(900);
    const programado = datos.cuando.tipo === 'programado';
    const pedido = {
      id: generarId('p_'),
      numero: String(Math.floor(100000 + Math.random() * 900000)),
      creado: Date.now(),
      inicio: programado ? null : Date.now(),
      cancelado: null,
      pago: null,
      calificacion: null,
      ...datos,
    };
    guardarTodos([pedido, ...todos()]);
    return pedido;
  },

  async delUsuario(usuarioId) {
    await esperar(500);
    return todos()
      .filter((p) => p.usuarioId === usuarioId)
      .sort((a, b) => b.creado - a.creado);
  },

  /** Lectura inmediata (sin espera) para el aviso de pedido activo y el seguimiento. */
  obtener: (id) => todos().find((p) => p.id === id) || null,

  activoDe(usuarioId) {
    return (
      todos()
        .filter((p) => p.usuarioId === usuarioId)
        .sort((a, b) => b.creado - a.creado)
        .find((p) => ['activo', 'por_pagar', 'por_calificar'].includes(etapaDe(p))) || null
    );
  },

  async cancelar(id, motivo) {
    await esperar(600);
    const p = pedidos.obtener(id);
    if (!p || !sePuedeCancelar(p)) throw new Error('El maestro ya va en camino. Ya no se puede cancelar.');
    return actualizar(id, { cancelado: { fecha: Date.now(), motivo } });
  },

  /** Solo para el demo: arranca ya un servicio programado. */
  iniciarAhora(id) {
    return actualizar(id, { inicio: Date.now() });
  },

  registrarPago(id, pago) {
    return actualizar(id, { pago });
  },

  async calificar(id, calificacion) {
    await esperar(700);
    return actualizar(id, { calificacion: { ...calificacion, fecha: Date.now() } });
  },
};
