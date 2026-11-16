/**
 * Seguimiento del pedido. También sirve como detalle de pedidos anteriores.
 * Se actualiza solo cada medio segundo según el estado calculado.
 */
import { pedidos, estadoDe, etapaDe, ESTADOS, sePuedeCancelar } from '../services/pedidos.js';
import { trabajadores } from '../services/trabajadores.js';
import { categoriaPorId } from '../data/categorias.js';
import { ir, atras } from '../router.js';
import { barra, avatar, calificacion, estrellasFijas, vacio, aviso, cargando } from '../ui/componentes.js';
import { icono } from '../ui/iconos.js';
import { esc, dinero, fechaHora, fechaFrase } from '../ui/formato.js';
import { METODOS_PAGO } from '../config.js';
import { mapaSimulado, actualizarMapa } from '../ui/mapa.js';

export function pantallaSeguimiento(raiz, { id }) {
  let pedido = pedidos.obtener(id);
  if (!pedido) {
    raiz.innerHTML = `${barra('Pedido')}<main class="contenido">${vacio({ icono: 'pedidos', titulo: 'No encontramos este pedido', texto: 'Puede que se haya borrado de este dispositivo.', accion: 'Ver mis pedidos', ruta: '#/pedidos' })}</main>`;
    raiz.querySelector('[data-accion="atras"]').addEventListener('click', () => atras('/pedidos'));
    return;
  }

  const t = trabajadores.buscarLocal(pedido.trabajadorId);
  const cat = categoriaPorId(pedido.categoria);
  const metodo = METODOS_PAGO.find((m) => m.id === pedido.metodoPago);
  let ultimaClave = '';

  raiz.innerHTML = `
    ${barra(`Pedido #${pedido.numero}`)}
    <main class="contenido con-pie" id="cuerpo"></main>
    <div class="pie-fijo" id="pie"></div>
    <div class="dialogo" id="dialogo" hidden></div>`;
  raiz.querySelector('[data-accion="atras"]').addEventListener('click', () => atras('/pedidos'));

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
    return { titulo: est.titulo.replace('el maestro', t.nombre), detalle: est.detalle, clase: '' };
  }

  function pintar() {
    pedido = pedidos.obtener(id);
    const e = estadoDe(pedido);
    const etapa = etapaDe(pedido);
    const c = cabeza(e, etapa);

    // Solo se repinta todo cuando cambia algo visible; el mapa y el tiempo se actualizan aparte
    const clave = `${e.id}|${etapa}|${c.titulo}`;
    if (clave === ultimaClave) {
      if (e.id === 'en_camino') actualizarMapa(cuerpo.querySelector('.mapa'), e);
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

      ${enCurso && ['aceptado', 'en_camino', 'en_proceso', 'buscando'].includes(e.id) ? mapaSimulado(e) : ''}

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
        <span><b>${esc(t.nombre)} ${esc(t.apellido)}</b><span class="fila-datos">${calificacion(t.calificacion)}<small class="tenue">${esc(cat.nombre)}</small></span></span>
        ${
          enCurso && e.id !== 'buscando'
            ? `<span class="acciones-circulo">
                <button class="circulo" data-accion="llamar" aria-label="Llamar a ${esc(t.nombre)}">${icono('telefono', { tamano: 20 })}</button>
                <button class="circulo" data-accion="chat" aria-label="Escribir a ${esc(t.nombre)}">${icono('chat', { tamano: 20 })}</button>
              </span>`
            : ''
        }
      </section>

      <ul class="detalle-lista tarjeta">
        <li>${icono('pedidos', { tamano: 20 })}<span><small>Problema</small>${esc(pedido.descripcion)}</span></li>
        <li>${icono('ubicacion', { tamano: 20 })}<span><small>Dirección</small>${esc(pedido.direccion.texto)}${pedido.direccion.detalle ? ` · ${esc(pedido.direccion.detalle)}` : ''}</span></li>
        <li>${icono('calendario', { tamano: 20 })}<span><small>Solicitado</small>${esc(fechaHora(pedido.creado))}</span></li>
        <li>${icono(metodo?.icono || 'tarjeta', { tamano: 20 })}<span><small>Pago</small>${esc(metodo?.nombre || '')}</span></li>
      </ul>

      <dl class="desglose tarjeta">
        ${pedido.precio.visita ? `<div><dt>Visita</dt><dd>${dinero(pedido.precio.visita)}</dd></div>` : ''}
        <div><dt>Mano de obra</dt><dd>${dinero(pedido.precio.manoObra)}</dd></div>
        ${pedido.precio.recargo ? `<div><dt>Recargo por urgencia</dt><dd>${dinero(pedido.precio.recargo)}</dd></div>` : ''}
        <div class="total"><dt>${pedido.pago ? 'Total pagado' : 'Total'}</dt><dd>${dinero(pedido.precio.total)}</dd></div>
      </dl>

      ${
        pedido.calificacion
          ? `<section class="bloque"><h2>Tu calificación</h2>
              <div class="tarjeta mi-resena">${estrellasFijas(pedido.calificacion.estrellas, 18)}
                ${pedido.calificacion.etiquetas?.length ? `<div class="chips estaticos">${pedido.calificacion.etiquetas.map((x) => `<span class="chip">${esc(x)}</span>`).join('')}</div>` : ''}
                ${pedido.calificacion.comentario ? `<p>${esc(pedido.calificacion.comentario)}</p>` : ''}
              </div></section>`
          : ''
      }

      ${sePuedeCancelar(pedido) ? '<button class="btn btn-texto peligro btn-bloque" data-accion="cancelar">Cancelar pedido</button>' : ''}
      ${e.id === 'agendado' ? '<p class="nota-demo">Demo: <button class="enlace" data-accion="iniciar">simular que ya es la hora</button></p>' : ''}`;

    // Acción principal según el momento del pedido
    if (etapa === 'por_pagar') pie.innerHTML = `<a class="btn btn-primario btn-bloque" href="#/pagar/${pedido.id}">Pagar ${dinero(pedido.precio.total)}</a>`;
    else if (etapa === 'por_calificar') pie.innerHTML = `<a class="btn btn-primario btn-bloque" href="#/calificar/${pedido.id}">Calificar a ${esc(t.nombre)}</a>`;
    else if (etapa === 'completado' || etapa === 'cancelado') pie.innerHTML = `<button class="btn btn-secundario btn-bloque" data-accion="repetir">Pedir de nuevo</button>`;
    else pie.innerHTML = '';
    raiz.classList.toggle('sin-pie', !pie.innerHTML);

    actualizarMapa(cuerpo.querySelector('.mapa'), e);
    conectar();
  }

  function conectar() {
    cuerpo.querySelector('[data-accion="llamar"]')?.addEventListener('click', () => aviso('Las llamadas estarán disponibles en la versión completa.'));
    cuerpo.querySelector('[data-accion="chat"]')?.addEventListener('click', () => aviso('El chat con el maestro llega en la próxima versión.'));
    cuerpo.querySelector('[data-accion="iniciar"]')?.addEventListener('click', () => {
      pedidos.iniciarAhora(pedido.id);
      pintar();
    });
    cuerpo.querySelector('[data-accion="cancelar"]')?.addEventListener('click', preguntarCancelar);
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
  const reloj = setInterval(pintar, 500);
  return () => clearInterval(reloj);
}
