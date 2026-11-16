/**
 * Chat de cada pedido entre el cliente y el maestro.
 *
 * Los mensajes se guardan en la misma base de datos (tabla chat:<pedido>) y
 * las dos pantallas se actualizan solas cuando llega uno nuevo.
 */
import { almacen } from './almacen.js';
import { db, usuarioNube } from './nube.js';
import { sincronizar } from './sincronizar.js';

export const RESPUESTAS_RAPIDAS = ['¿Ya vienes?', 'Estoy en la puerta', 'Toca el timbre, por favor', 'Gracias'];
export const RESPUESTAS_MAESTRO = ['Voy en camino', 'Ya llegué', 'Estoy buscando la dirección', '¿Me confirma el apto?'];

export const MAX_MENSAJE = 300;

const clave = (pedidoId) => `chat:${pedidoId}`;

/** Mensajes viejos usaban de: 'yo' / 'maestro'. */
const rolDe = (m) => m.rol || (m.de === 'yo' ? 'cliente' : 'trabajador');

export const chat = {
  mensajes: (pedidoId) => almacen.leer(clave(pedidoId), []).map((m) => ({ ...m, rol: rolDe(m) })),

  /** rol: quién escribe ('cliente' o 'trabajador'). Llega al otro teléfono al instante. */
  async enviar(pedidoId, texto, { rol = 'cliente' } = {}) {
    const limpio = String(texto).trim().slice(0, MAX_MENSAJE);
    if (!limpio) return;
    const [fila] = await db.crear('mensajes', { pedido_id: pedidoId, autor: usuarioNube().id, rol, texto: limpio });
    if (fila) sincronizar.ponerMensaje(fila);
  },

  /** Cuántos mensajes de la otra persona no se han visto. */
  sinLeer(pedidoId, rol) {
    const visto = almacen.leer(`visto:${pedidoId}:${rol}`, 0);
    return chat.mensajes(pedidoId).filter((m) => m.rol !== rol && m.fecha > visto).length;
  },

  marcarVisto: (pedidoId, rol) => almacen.guardar(`visto:${pedidoId}:${rol}`, Date.now()),

  escuchar: (pedidoId, fn) => almacen.escuchar(clave(pedidoId), fn),
};
