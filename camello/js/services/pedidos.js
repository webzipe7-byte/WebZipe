/**
 * Pedidos de servicio y su ciclo de vida.
 * El estado lo cambia el maestro desde su app (aceptar, salir, llegar, terminar)
 * y el cliente lo ve al instante.
 */
import { almacen, generarId } from './almacen.js';
import { db } from './nube.js';
import { sincronizar } from './sincronizar.js';

const CLAVE = 'pedidos';

/** Orden de los estados y textos que ve el usuario. */
export const ESTADOS = [
  { id: 'buscando', nombre: 'Buscando', titulo: 'Confirmando con el maestro', detalle: 'Le avisamos de tu solicitud.' },
  { id: 'aceptado', nombre: 'Aceptado', titulo: 'Aceptó tu solicitud', detalle: 'Se está preparando para salir.' },
  { id: 'en_camino', nombre: 'En camino', titulo: 'Va en camino', detalle: 'Ten lista la entrada.' },
  { id: 'en_proceso', nombre: 'En proceso', titulo: 'Trabajando en tu servicio', detalle: 'Te avisamos cuando termine.' },
  { id: 'finalizado', nombre: 'Finalizado', titulo: 'Servicio terminado', detalle: 'Revisa el trabajo y paga.' },
];

/**
 * Estado actual del pedido.
 * Devuelve { id, indice, avance (0..1 dentro del estado), terminado }.
 */
export function estadoDe(pedido, ahora = Date.now()) {
  if (pedido.cancelado) return { id: 'cancelado', indice: -1, avance: 0 };
  const indice = Math.max(0, ESTADOS.findIndex((s) => s.id === pedido.estado));
  const id = ESTADOS[indice].id;
  let avance = id === 'finalizado' ? 1 : 0;
  if (id === 'en_camino') {
    const viaje = Math.max(1, pedido.minutosLlegada || 15) * 60000;
    avance = Math.min(0.95, (ahora - (pedido.tiempos?.en_camino || ahora)) / viaje);
  }
  return { id, indice, avance };
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

export const sePuedeCancelar = (pedido) => ['buscando', 'aceptado'].includes(estadoDe(pedido).id);

const todos = () => almacen.leer(CLAVE, []);

const ponerEnCopia = (datos) => sincronizar.ponerPedido(datos);

export const pedidos = {
  /** El cliente envía la solicitud. La crea el servidor (estado, fechas y código). */
  async crear(datos) {
    if (!/^[0-9a-f-]{36}$/.test(String(datos.trabajadorId))) throw new Error('Elige un maestro de la lista.');
    const id = generarId('p_');
    // Código que la persona le pide al maestro al llegar, para confirmar que es él
    const pin = String(Math.floor(1000 + Math.random() * 9000));
    const numero = String(Math.floor(100000 + Math.random() * 900000));
    const creado = await db.funcion('crear_pedido', { p_id: id, p_trabajador: datos.trabajadorId, p_datos: { ...datos, numero }, p_pin: pin });
    return sincronizar.ponerPedido(creado, pin);
  },

  async delUsuario(usuarioId) {
    return todos()
      .filter((p) => p.usuarioId === usuarioId)
      .sort((a, b) => b.creado - a.creado);
  },

  /** Lectura inmediata para el aviso de pedido activo y el seguimiento. */
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
    return ponerEnCopia(await db.funcion('actualizar_pedido', { p_id: id, p_accion: 'cancelar', p_valor: { motivo } }));
  },

  async registrarPago(id, pago) {
    return ponerEnCopia(await db.funcion('actualizar_pedido', { p_id: id, p_accion: 'pagar', p_valor: pago }));
  },

  async calificar(id, calificacion) {
    return ponerEnCopia(await db.funcion('actualizar_pedido', { p_id: id, p_accion: 'calificar', p_valor: calificacion }));
  },

  /** Avisa cada vez que cambia algún pedido (en este teléfono o desde el otro). */
  escuchar: (fn) => almacen.escuchar('pedidos', fn),

  /* ---------- Lado del maestro ---------- */

  /** Pedidos asignados a un maestro, del más nuevo al más viejo. */
  delMaestro: (maestroId) =>
    todos()
      .filter((p) => p.trabajadorId === maestroId)
      .sort((a, b) => b.creado - a.creado),

  /**
   * El maestro cambia el estado de su pedido. Las reglas las revisa el servidor.
   * accion: aceptar | rechazar | salir | llegar (con el código del cliente) | terminar
   */
  async avanzar(id, maestroId, accion, { pin = '' } = {}) {
    const p = pedidos.obtener(id);
    if (!p || p.trabajadorId !== maestroId) throw new Error('Este pedido no es tuyo.');
    const r = await db.funcion('avanzar_pedido', { p_id: id, p_accion: accion, p_pin: String(pin).trim() });
    if (r?.error) throw new Error(r.error);
    return ponerEnCopia(r);
  },
};
