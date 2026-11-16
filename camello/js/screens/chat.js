/**
 * Chat del pedido. Lo usan el cliente y el maestro: cada uno ve sus
 * mensajes a la derecha y los de la otra persona a la izquierda.
 */
import { pedidos, etapaDe } from '../services/pedidos.js';
import { trabajadores } from '../services/trabajadores.js';
import { usuarioPublico } from '../services/auth.js';
import { chat, RESPUESTAS_RAPIDAS, RESPUESTAS_MAESTRO, MAX_MENSAJE } from '../services/chat.js';
import { sesion } from '../estado.js';
import { ir, atras } from '../router.js';
import { barra, avatar } from '../ui/componentes.js';
import { icono } from '../ui/iconos.js';
import { esc, hora } from '../ui/formato.js';

export function pantallaChat(raiz, { id }) {
  const pedido = pedidos.obtener(id);
  const yo = sesion.usuario;
  const soyMaestro = pedido && pedido.trabajadorId === yo.id;
  // Solo el cliente y el maestro del pedido pueden ver la conversación
  if (!pedido || (!soyMaestro && pedido.usuarioId !== yo.id)) return ir('/pedidos', { reemplazar: true });

  const miRol = soyMaestro ? 'trabajador' : 'cliente';
  const t = trabajadores.buscarLocal(pedido.trabajadorId);
  const cliente = usuarioPublico(pedido.usuarioId);
  const [nombreCliente, ...apellidoCliente] = (cliente?.nombre || 'Cliente').split(' ');
  const otro = soyMaestro ? { nombre: nombreCliente, apellido: apellidoCliente.join(' '), color: '#4D7C0F', categoria: pedido.categoria } : t;
  const volver = soyMaestro ? `/maestro/pedido/${id}` : `/pedido/${id}`;
  const rapidas = soyMaestro ? RESPUESTAS_MAESTRO : RESPUESTAS_RAPIDAS;
  const abierto = () => etapaDe(pedidos.obtener(id)) === 'activo';

  raiz.innerHTML = `
    ${barra(`${otro.nombre} ${otro.apellido}`.trim())}
    <main class="chat" aria-live="polite">
      <p class="chat-aviso">${icono('candado', { tamano: 14 })} Chat protegido: ningún número de teléfono se comparte.</p>
      <ol class="chat-mensajes" id="mensajes"></ol>
    </main>
    <div id="chat-pie"></div>`;

  raiz.querySelector('[data-accion="atras"]').addEventListener('click', () => atras(volver));
  const lista = raiz.querySelector('#mensajes');
  const pie = raiz.querySelector('#chat-pie');

  function pintarPie() {
    if (!abierto()) {
      pie.innerHTML = '<p class="chat-cerrado">El chat se cierra cuando termina el servicio.</p>';
      return;
    }
    if (pie.querySelector('form')) return;
    pie.innerHTML = `
      <div class="chat-pie">
        <div class="chips chat-rapidas">${rapidas.map((r) => `<button class="chip" data-rapida="${esc(r)}">${esc(r)}</button>`).join('')}</div>
        <form class="chat-form">
          <input id="texto" placeholder="Escribe un mensaje" autocomplete="off" aria-label="Mensaje" maxlength="${MAX_MENSAJE}">
          <button class="circulo enviar" aria-label="Enviar">${icono('enviar', { tamano: 20 })}</button>
        </form>
      </div>`;
    const form = pie.querySelector('form');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const input = form.querySelector('input');
      enviar(input.value);
      input.value = '';
      input.focus();
    });
    pie.querySelectorAll('[data-rapida]').forEach((b) => b.addEventListener('click', () => enviar(b.dataset.rapida)));
  }

  function pintar() {
    const mensajes = chat.mensajes(id);
    lista.innerHTML = mensajes.length
      ? mensajes
          .map((m) => {
            const mio = m.rol === miRol;
            return `<li class="msg ${mio ? 'mio' : 'suyo'}">
              ${mio ? '' : avatar(otro, 28)}
              <span class="burbuja">${esc(m.texto)}<time>${hora(m.fecha)}</time></span>
            </li>`;
          })
          .join('')
      : `<li class="chat-vacio">${avatar(otro, 56)}<p>${soyMaestro ? `Escríbele a ${esc(otro.nombre)} si necesitas una indicación para llegar.` : `Escríbele a ${esc(otro.nombre)} si necesitas darle una indicación.`}</p></li>`;
    lista.lastElementChild?.scrollIntoView({ block: 'end' });
    chat.marcarVisto(id, miRol);
    pintarPie();
  }

  function enviar(texto) {
    if (!texto.trim() || !abierto()) return;
    chat.enviar(id, texto, { rol: miRol });
  }

  pintar();
  // Llega un mensaje (de esta pestaña o del otro teléfono/pestaña) o cambia el pedido
  const dejar = chat.escuchar(id, pintar);
  const dejarPedido = pedidos.escuchar(pintarPie);
  return () => {
    dejar();
    dejarPedido();
  };
}
