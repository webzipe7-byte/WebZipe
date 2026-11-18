/**
 * Centro de seguridad durante un servicio: emergencia, contactos de confianza,
 * código de seguridad y reporte de un problema.
 */
import { icono } from './iconos.js';
import { esc } from './formato.js';
import { sesion } from '../estado.js';
import { APP } from '../config.js';
import { compartirSeguimiento } from '../screens/seguimiento.js';
import { abrirReporte } from './reportar.js';

export function abrirSeguridad(pedido, t) {
  const contactos = sesion.usuario.contactos || [];
  const fondo = document.createElement('div');
  fondo.className = 'dialogo';
  fondo.innerHTML = `
    <div class="dialogo-caja seguridad" role="dialog" aria-modal="true" aria-labelledby="seg-t">
      <h2 id="seg-t">${icono('escudo', { tamano: 24 })} Centro de seguridad</h2>

      <a class="btn btn-peligro btn-bloque" href="tel:${APP.lineaEmergencia}">${icono('telefono', { tamano: 20 })} Llamar a emergencias (${APP.lineaEmergencia})</a>

      <ul class="seguridad-lista">
        <li>
          <button data-accion="compartir">${icono('compartir', { tamano: 20 })}<span><b>Compartir seguimiento</b><small>${
            contactos.length ? `Con tus ${contactos.length} contacto${contactos.length > 1 ? 's' : ''} de confianza o con quien quieras` : 'Envía los datos del servicio a alguien de confianza'
          }</small></span></button>
        </li>
        <li>
          <a href="#/seguridad">${icono('usuarios', { tamano: 20 })}<span><b>Contactos de confianza</b><small>${
            contactos.length ? contactos.map((c) => esc(c.nombre.split(' ')[0])).join(', ') : 'Agrega hasta 5 personas'
          }</small></span></a>
        </li>
        <li>
          <div class="seg-pin">${icono('candado', { tamano: 20 })}<span><b>Código de seguridad: ${esc(pedido.pin)}</b><small>Pídeselo a ${esc(t.nombre)} antes de abrir la puerta.</small></span></div>
        </li>
        <li>
          <button data-accion="reportar">${icono('alerta', { tamano: 20 })}<span><b>Reportar un problema</b><small>Cuéntanos qué pasó con este servicio</small></span></button>
        </li>
      </ul>
      <button class="btn btn-texto btn-bloque" data-cerrar>Cerrar</button>
    </div>`;
  document.body.appendChild(fondo);

  const cerrar = () => fondo.remove();
  fondo.addEventListener('click', (e) => {
    if (e.target === fondo || e.target.closest('[data-cerrar]') || e.target.closest('a[href^="#"]')) cerrar();
  });
  fondo.querySelector('[data-accion="compartir"]').addEventListener('click', () => {
    cerrar();
    compartirSeguimiento(pedido, t);
  });
  fondo.querySelector('[data-accion="reportar"]').addEventListener('click', () => {
    cerrar();
    abrirReporte({ tipo: 'problema', pedidoId: pedido.id });
  });
  fondo.querySelector('[data-cerrar]').focus();
}
