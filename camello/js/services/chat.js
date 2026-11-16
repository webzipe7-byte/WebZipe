/**
 * Chat de cada pedido entre el cliente y el maestro.
 *
 * Los mensajes se guardan en la misma base de datos (tabla chat:<pedido>) y
 * las dos pantallas se actualizan solas cuando llega uno nuevo.
 * Con los maestros de ejemplo (que no tienen cuenta) responde una respuesta automática.
 */
import { almacen, generarId } from './almacen.js';

export const RESPUESTAS_RAPIDAS = ['¿Ya vienes?', 'Estoy en la puerta', 'Toca el timbre, por favor', 'Gracias'];
export const RESPUESTAS_MAESTRO = ['Voy en camino', 'Ya llegué', 'Estoy buscando la dirección', '¿Me confirma el apto?'];

export const MAX_MENSAJE = 300;
const MAX_MENSAJES = 300;

const AUTOMATICAS = [
  [/ya vienes|cuanto|demora|falta/i, 'Ya voy en camino, llego en unos minutos.'],
  [/puerta|llegu|afuera|aqui|aquí/i, 'Perfecto, ya casi estoy ahí.'],
  [/timbre|porter/i, 'Listo, le aviso al portero cuando llegue.'],
  [/gracias/i, '¡Con gusto! Cualquier cosa me escribes por aquí.'],
  [/repuesto|material|precio|cuesta|valor/i, 'Cuando revise te digo si hace falta algún repuesto, antes de comprar nada.'],
];

const clave = (pedidoId) => `chat:${pedidoId}`;

/** Mensajes viejos usaban de: 'yo' / 'maestro'. */
const rolDe = (m) => m.rol || (m.de === 'yo' ? 'cliente' : 'trabajador');

export const chat = {
  mensajes: (pedidoId) => almacen.leer(clave(pedidoId), []).map((m) => ({ ...m, rol: rolDe(m) })),

  /**
   * rol: quién escribe ('cliente' o 'trabajador').
   * respuestaAutomatica: solo para los maestros de ejemplo.
   */
  enviar(pedidoId, texto, { rol = 'cliente', respuestaAutomatica = false } = {}) {
    const limpio = String(texto).trim().slice(0, MAX_MENSAJE);
    if (!limpio) return;
    const lista = chat.mensajes(pedidoId);
    lista.push({ id: generarId('m_'), rol, texto: limpio, fecha: Date.now() });
    almacen.guardar(clave(pedidoId), lista.slice(-MAX_MENSAJES));

    if (respuestaAutomatica) {
      const regla = AUTOMATICAS.find(([r]) => r.test(limpio));
      setTimeout(() => {
        const actual = chat.mensajes(pedidoId);
        actual.push({ id: generarId('m_'), rol: 'trabajador', texto: regla ? regla[1] : 'Recibido 👍', fecha: Date.now() });
        almacen.guardar(clave(pedidoId), actual.slice(-MAX_MENSAJES));
      }, 1400 + Math.random() * 900);
    }
  },

  /** Cuántos mensajes de la otra persona no se han visto. */
  sinLeer(pedidoId, rol) {
    const visto = almacen.leer(`visto:${pedidoId}:${rol}`, 0);
    return chat.mensajes(pedidoId).filter((m) => m.rol !== rol && m.fecha > visto).length;
  },

  marcarVisto: (pedidoId, rol) => almacen.guardar(`visto:${pedidoId}:${rol}`, Date.now()),

  escuchar: (pedidoId, fn) => almacen.escuchar(clave(pedidoId), fn),
};
