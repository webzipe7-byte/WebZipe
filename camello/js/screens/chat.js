/**
 * Chat con el maestro durante el servicio (simulado).
 */
import { pedidos, etapaDe } from '../services/pedidos.js';
import { trabajadores } from '../services/trabajadores.js';
import { chat, RESPUESTAS_RAPIDAS } from '../services/chat.js';
import { ir, atras } from '../router.js';
import { barra, avatar } from '../ui/componentes.js';
import { icono } from '../ui/iconos.js';
import { esc, hora } from '../ui/formato.js';

export function pantallaChat(raiz, { id }) {
  const pedido = pedidos.obtener(id);
  if (!pedido) return ir('/pedidos', { reemplazar: true });
  const t = trabajadores.buscarLocal(pedido.trabajadorId);
  const abierto = etapaDe(pedido) === 'activo';

  raiz.innerHTML = `
    ${barra(`${t.nombre} ${t.apellido}`)}
    <main class="chat" aria-live="polite">
      <p class="chat-aviso">${icono('candado', { tamano: 14 })} Chat protegido: ni tu número ni el del maestro se comparten.</p>
      <ol class="chat-mensajes" id="mensajes"></ol>
    </main>
    ${
      abierto
        ? `<div class="chat-pie">
            <div class="chips chat-rapidas">${RESPUESTAS_RAPIDAS.map((r) => `<button class="chip" data-rapida="${esc(r)}">${esc(r)}</button>`).join('')}</div>
            <form class="chat-form">
              <input id="texto" placeholder="Escribe un mensaje" autocomplete="off" aria-label="Mensaje" maxlength="300">
              <button class="circulo enviar" aria-label="Enviar">${icono('enviar', { tamano: 20 })}</button>
            </form>
          </div>`
        : '<p class="chat-cerrado">El chat se cierra cuando termina el servicio.</p>'
    }`;

  raiz.querySelector('[data-accion="atras"]').addEventListener('click', () => atras(`/pedido/${id}`));
  const lista = raiz.querySelector('#mensajes');

  const pintar = () => {
    const mensajes = chat.mensajes(id);
    lista.innerHTML = mensajes.length
      ? mensajes
          .map(
            (m) => `<li class="msg ${m.de === 'yo' ? 'mio' : 'suyo'}">
              ${m.de === 'yo' ? '' : avatar(t, 28)}
              <span class="burbuja">${esc(m.texto)}<time>${hora(m.fecha)}</time></span>
            </li>`
          )
          .join('')
      : `<li class="chat-vacio">${avatar(t, 56)}<p>Escríbele a ${esc(t.nombre)} si necesitas darle una indicación.</p></li>`;
    lista.lastElementChild?.scrollIntoView({ block: 'end' });
  };
  pintar();

  const enviar = (texto) => {
    if (!texto.trim()) return;
    chat.enviar(id, texto.trim(), pintar);
    pintar();
  };
  const form = raiz.querySelector('.chat-form');
  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    const input = form.querySelector('input');
    enviar(input.value);
    input.value = '';
    input.focus();
  });
  raiz.querySelectorAll('[data-rapida]').forEach((b) => b.addEventListener('click', () => enviar(b.dataset.rapida)));
}
