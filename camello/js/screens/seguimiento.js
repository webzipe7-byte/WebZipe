/**
 * Seguimiento del pedido. También sirve como detalle de pedidos anteriores.
 * Se actualiza solo cada medio segundo según el estado calculado.
 */
import { pedidos, estadoDe, etapaDe, ESTADOS, sePuedeCancelar } from '../services/pedidos.js';
import { trabajadores } from '../services/trabajadores.js';
import { categoriaPorId, oficioDe } from '../data/categorias.js';
import { ir, atras } from '../router.js';
import { barra, avatar, calificacion, estrellasFijas, vacio, aviso, cargando } from '../ui/componentes.js';
import { icono } from '../ui/iconos.js';
import { esc, dinero, fechaHora, fechaFrase } from '../ui/formato.js';
import { ICONO_METODO } from '../services/billetera.js';
import { abrirSeguridad } from '../ui/seguridad.js';
import { desglosePrecio } from '../ui/precio.js';
import { mapaReal, moverMarcas, puntoCliente, puntoMaestro } from '../ui/mapa-real.js';
import { posicionEnVivo } from '../services/ubicacion.js';
import { chat } from '../services/chat.js';
import { sincronizar } from '../services/sincronizar.js';

/** Mapa del seguimiento: la casa del cliente y, si ya salió, el maestro. */
function puntosSeguimiento(pedido, e) {
  const casa = { ...puntoCliente(pedido), tipo: 'casa' };
  if (['buscando', 'en_proceso', 'finalizado'].includes(e.id)) return [casa];
  return [casa, { ...puntoMaestro(pedido, e), tipo: 'maestro' }];
}

function mapaSeguimiento(pedido, e, t) {
  const vivo = posicionEnVivo(pedido.trabajadorId);
  const nota =
    e.id === 'buscando' ? 'Tu dirección' : e.id === 'en_proceso' ? `${t.nombre} está en tu dirección` : vivo ? `${t.nombre} en vivo` : `Ubicación aproximada de ${t.nombre}`;
  return mapaReal(puntosSeguimiento(pedido, e), { nota });
}

/** Comparte el seguimiento con el menú del teléfono o copia el texto. */
export async function compartirSeguimiento(pedido, t) {
  const cat = categoriaPorId(pedido.categoria);
  const texto = `Estoy recibiendo un servicio de ${cat.nombre.toLowerCase()} con ${t.nombre} ${t.apellido} (Camello, pedido #${pedido.numero}) en ${pedido.direccion.texto}.`;
  const url = location.href.split('#')[0];
  try {
    if (navigator.share) {
      await navigator.share({ title: 'Mi servicio en Camello', text: texto, url });
      return;
    }
    await navigator.clipboard.writeText(`${texto} ${url}`);
    aviso('Copiamos el mensaje. Pégalo en WhatsApp o donde quieras.', 'exito');
  } catch {
    /* la persona cerró el menú de compartir */
  }
}

export function pantallaSeguimiento(raiz, { id }) {
  let pedido = pedidos.obtener(id);
  if (!pedido) {
    raiz.innerHTML = `${barra('Pedido')}<main class="contenido">${vacio({ icono: 'pedidos', titulo: 'No encontramos este pedido', texto: 'Puede que se haya borrado de este dispositivo.', accion: 'Ver mis pedidos', ruta: '#/pedidos' })}</main>`;
    raiz.querySelector('[data-accion="atras"]').addEventListener('click', () => atras('/pedidos'));
    return;
  }

  const t = trabajadores.buscarLocal(pedido.trabajadorId);
  const cat = categoriaPorId(pedido.categoria);
  let ultimaClave = '';

  raiz.innerHTML = `
    ${barra(`Pedido #${pedido.numero}`, { derecha: `<button class="barra-btn seguridad-btn" data-accion="seguridad" aria-label="Centro de seguridad">${icono('escudo', { tamano: 22 })}</button>` })}
    <main class="contenido con-pie" id="cuerpo"></main>
    <div class="pie-fijo" id="pie"></div>
    <div class="dialogo" id="dialogo" hidden></div>`;
  raiz.querySelector('[data-accion="atras"]').addEventListener('click', () => atras('/pedidos'));
  raiz.querySelector('[data-accion="seguridad"]').addEventListener('click', () => abrirSeguridad(pedido, t));

  const cuerpo = raiz.querySelector('#cuerpo');
  const pie = raiz.querySelector('#pie');

  function cabeza(e, etapa) {
    if (e.id === 'cancelado') return { titulo: 'Pedido cancelado', detalle: pedido.cancelado.motivo || 'Cancelaste este servicio.', clase: 'cancelado' };
    if (e.id === 'agendado') return { titulo: 'Servicio programado', detalle: `${t.nombre} llegará ${fechaFrase(pedido.cuando.fecha)}`, clase: '' };
    if (etapa === 'completado') return { titulo: 'Servicio completado', detalle: `Pagado ${fechaHora(pedido.pago.fecha).toLowerCase()}`, clase: 'listo' };
    const est = ESTADOS[e.indice];
    if (e.id === 'en_camino') {
      const min = Math.max(1, Math.ceil(pedido.minutosLlegada * (1 - e.avance)));
      return { titulo: `Llega en ${min} min`, detalle: `${t.nombre} va en camino. Ten lista la entrada.`, clase: '' };
    }
    if (e.id === 'finalizado') return { titulo: est.titulo, detalle: 'Revisa el trabajo y paga para cerrar el servicio.', clase: 'listo' };
    if (e.id === 'buscando') return { titulo: `Esperando que ${t.nombre} acepte`, detalle: 'Ya le llegó tu solicitud a su app.', clase: '' };
    return { titulo: est.titulo.replace('el maestro', t.nombre), detalle: est.detalle, clase: '' };
  }

  function pintar() {
    pedido = pedidos.obtener(id);
    const e = estadoDe(pedido);
    const etapa = etapaDe(pedido);
    const c = cabeza(e, etapa);

    // Solo se repinta todo cuando cambia algo visible; el mapa y el tiempo se actualizan aparte
    const sinLeer = chat.sinLeer(id, 'cliente');
    const clave = `${e.id}|${etapa}|${c.titulo}|${sinLeer}`;
    if (clave === ultimaClave) {
      const fig = cuerpo.querySelector('.mapa-real');
      if (fig && !moverMarcas(fig, puntosSeguimiento(pedido, e))) fig.outerHTML = mapaSeguimiento(pedido, e, t);
      return;
    }
    ultimaClave = clave;

    const enCurso = etapa === 'activo';
    cuerpo.innerHTML = `
      <section class="estado-cabeza ${c.clase}" aria-live="polite">
        <h1 tabindex="-1">${esc(c.titulo)}</h1>
        <p>${esc(c.detalle)}</p>
        ${e.id === 'buscando' ? '<span class="pulso" aria-hidden="true"></span>' : ''}
      </section>

      ${enCurso && ['aceptado', 'en_camino', 'en_proceso', 'buscando'].includes(e.id) ? mapaSeguimiento(pedido, e, t) : ''}

      ${
        e.id !== 'cancelado'
          ? `<ol class="linea-estados" aria-label="Estado del pedido">
          ${ESTADOS.map((s, i) => {
            const hecho = e.id === 'agendado' ? i <= 1 : i < e.indice || e.id === 'finalizado';
            const actual = e.id !== 'agendado' && i === e.indice && e.id !== 'finalizado';
            return `<li class="${hecho ? 'hecho' : ''}${actual ? ' actual' : ''}" ${actual ? 'aria-current="step"' : ''}>
              <span class="punto">${hecho ? icono('check', { tamano: 14 }) : ''}</span>
              <span>${esc(s.nombre)}</span>
            </li>`;
          }).join('')}
        </ol>`
          : ''
      }

      <section class="tarjeta fila-maestro">
        ${avatar(t, 52)}
        <span><b>${esc(t.nombre)} ${esc(t.apellido)}</b><span class="fila-datos">${calificacion(t.calificacion)}<small class="tenue">${esc(oficioDe(t))}</small></span></span>
        ${
          enCurso && e.id !== 'buscando'
            ? `<span class="acciones-circulo">
                <button class="circulo" data-accion="llamar" aria-label="Llamar a ${esc(t.nombre)}">${icono('telefono', { tamano: 20 })}</button>
                <button class="circulo" data-accion="chat" aria-label="Escribir a ${esc(t.nombre)}">${icono('chat', { tamano: 20 })}${sinLeer ? `<span class="burbuja-num">${sinLeer}</span>` : ''}</button>
              </span>`
            : ''
        }
      </section>

      ${
        enCurso && ['aceptado', 'en_camino', 'agendado'].includes(e.id)
          ? `<section class="pin-caja">
              <span><b>Tu código de seguridad</b><small>Pídeselo a ${esc(t.nombre)} al llegar. Si no lo sabe, no le abras.</small></span>
              <strong aria-label="Código ${pedido.pin.split('').join(' ')}">${esc(pedido.pin)}</strong>
            </section>`
          : ''
      }

      ${
        enCurso && e.id !== 'buscando'
          ? `<button class="fila-accion tarjeta" data-accion="compartir">${icono('compartir', { tamano: 20 })}<span><b>Compartir seguimiento</b><small>Que alguien de confianza vea el servicio en vivo</small></span>${icono('derecha', { tamano: 18 })}</button>`
          : ''
      }

      <ul class="detalle-lista tarjeta">
        <li>${icono('pedidos', { tamano: 20 })}<span><small>Problema</small>${esc(pedido.descripcion)}</span></li>
        <li>${icono('ubicacion', { tamano: 20 })}<span><small>Dirección</small>${esc(pedido.direccion.texto)}${pedido.direccion.detalle ? ` · ${esc(pedido.direccion.detalle)}` : ''}</span></li>
        <li>${icono('calendario', { tamano: 20 })}<span><small>Solicitado</small>${esc(fechaHora(pedido.creado))}</span></li>
        <li>${icono(ICONO_METODO[pedido.pago?.tipo || pedido.metodoTipo] || 'tarjeta', { tamano: 20 })}<span><small>Pago</small>${esc(pedido.pago?.metodoNombre || pedido.metodoNombre || '')}</span></li>
      </ul>

      ${desglosePrecio(pedido)}
      ${pedido.pago ? `<a class="btn btn-texto btn-bloque" href="#/recibo/${pedido.id}">${icono('recibo', { tamano: 18 })} Ver recibo</a>` : ''}

      ${
        pedido.calificacion
          ? `<section class="bloque"><h2>Tu calificación</h2>
              <div class="tarjeta mi-resena">${estrellasFijas(pedido.calificacion.estrellas, 18)}
                ${pedido.calificacion.etiquetas?.length ? `<div class="chips estaticos">${pedido.calificacion.etiquetas.map((x) => `<span class="chip">${esc(x)}</span>`).join('')}</div>` : ''}
                ${pedido.calificacion.comentario ? `<p>${esc(pedido.calificacion.comentario)}</p>` : ''}
              </div></section>`
          : ''
      }

`;

    // Acción principal según el momento del pedido
    if (etapa === 'por_pagar') pie.innerHTML = `<a class="btn btn-primario btn-bloque" href="#/pagar/${pedido.id}">Pagar ${dinero(pedido.precio.total)}</a>`;
    else if (etapa === 'por_calificar') pie.innerHTML = `<a class="btn btn-primario btn-bloque" href="#/calificar/${pedido.id}">Calificar a ${esc(t.nombre)}</a>`;
    else if (etapa === 'completado' || etapa === 'cancelado') pie.innerHTML = `<button class="btn btn-secundario btn-bloque" data-accion="repetir">Pedir de nuevo</button>`;
    // Mientras el maestro no haya salido, cancelar siempre está a la vista en la barra de abajo
    else if (sePuedeCancelar(pedido)) pie.innerHTML = `<button class="btn btn-peligro-borde btn-bloque" data-accion="cancelar">${icono('cerrar', { tamano: 18 })} Cancelar pedido</button>`;
    else pie.innerHTML = '';
    raiz.classList.toggle('sin-pie', !pie.innerHTML);

    conectar();
  }

  function conectar() {
    cuerpo.querySelector('[data-accion="llamar"]')?.addEventListener('click', () =>
      aviso('Llamada protegida: tu número no se le muestra al maestro. (Disponible en la versión completa)')
    );
    cuerpo.querySelector('[data-accion="chat"]')?.addEventListener('click', () => ir(`/chat/${pedido.id}`));
    cuerpo.querySelector('[data-accion="compartir"]')?.addEventListener('click', () => compartirSeguimiento(pedido, t));
    pie.querySelector('[data-accion="cancelar"]')?.addEventListener('click', preguntarCancelar);
    pie.querySelector('[data-accion="repetir"]')?.addEventListener('click', () => ir(`/solicitud/${pedido.categoria}`));
  }

  function preguntarCancelar() {
    const dialogo = raiz.querySelector('#dialogo');
    dialogo.hidden = false;
    dialogo.innerHTML = `
      <div class="dialogo-caja" role="dialog" aria-modal="true" aria-labelledby="dlg-t">
        <h2 id="dlg-t">¿Cancelar el pedido?</h2>
        <p>${esc(t.nombre)} dejará de prepararse para ir. No tiene costo porque aún no sale.</p>
        <button class="btn btn-peligro btn-bloque" data-si>Sí, cancelar</button>
        <button class="btn btn-texto btn-bloque" data-no>No, mantener</button>
      </div>`;
    const cerrar = () => {
      dialogo.hidden = true;
      dialogo.innerHTML = '';
    };
    dialogo.querySelector('[data-no]').addEventListener('click', cerrar);
    dialogo.addEventListener('click', (ev) => ev.target === dialogo && cerrar(), { once: true });
    dialogo.querySelector('[data-si]').addEventListener('click', async (ev) => {
      cargando(ev.currentTarget, true, 'Cancelando…');
      try {
        await pedidos.cancelar(pedido.id, 'Cancelaste este servicio.');
        aviso('Pedido cancelado.');
      } catch (err) {
        aviso(err.message, 'error');
      }
      cerrar();
      ultimaClave = '';
      pintar();
    });
    dialogo.querySelector('[data-no]').focus();
  }

  pintar();
  const reloj = setInterval(pintar, 1000);
  // Cambios que hace el maestro desde su app y mensajes nuevos se ven al instante
  const dejar = pedidos.escuchar(pintar);
  const dejarChat = chat.escuchar(id, pintar);
  // Mientras el servicio está activo se consulta dónde va el maestro
  const dejarUbicacion = etapaDe(pedidos.obtener(id) || {}) === 'activo' ? sincronizar.vigilarUbicacion(pedidos.obtener(id).trabajadorId) : () => {};
  return () => {
    clearInterval(reloj);
    dejar();
    dejarChat();
    dejarUbicacion();
  };
}
