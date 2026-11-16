/**
 * Chat con el maestro (simulado).
 * El maestro responde solo con mensajes de ejemplo. En producción este archivo
 * se conecta a un servicio de mensajería en tiempo real (WebSocket, Firebase, etc.).
 */
import { almacen, generarId } from './almacen.js';

export const RESPUESTAS_RAPIDAS = ['¿Ya vienes?', 'Estoy en la puerta', 'Toca el timbre, por favor', 'Gracias'];

const AUTOMATICAS = [
  [/ya vienes|cuanto|demora|falta/i, 'Ya voy en camino, llego en unos minutos.'],
  [/puerta|llegu|afuera|aqui|aquí/i, 'Perfecto, ya casi estoy ahí.'],
  [/timbre|porter/i, 'Listo, le aviso al portero cuando llegue.'],
  [/gracias/i, '¡Con gusto! Cualquier cosa me escribes por aquí.'],
  [/repuesto|material|precio|cuesta|valor/i, 'Cuando revise te digo si hace falta algún repuesto, antes de comprar nada.'],
];

const clave = (pedidoId) => `chat:${pedidoId}`;

export const chat = {
  mensajes: (pedidoId) => almacen.leer(clave(pedidoId), []),

  enviar(pedidoId, texto, alResponder) {
    const lista = chat.mensajes(pedidoId);
    lista.push({ id: generarId('m_'), de: 'yo', texto, fecha: Date.now() });
    almacen.guardar(clave(pedidoId), lista);

    const regla = AUTOMATICAS.find(([r]) => r.test(texto));
    const respuesta = regla ? regla[1] : 'Recibido 👍';
    setTimeout(() => {
      const actual = chat.mensajes(pedidoId);
      actual.push({ id: generarId('m_'), de: 'maestro', texto: respuesta, fecha: Date.now() });
      almacen.guardar(clave(pedidoId), actual);
      alResponder?.();
    }, 1400 + Math.random() * 900);
    return lista;
  },
};
