/**
 * Desglose del precio de un pedido (oferta, cupón, propina) para el
 * seguimiento, el pago y el recibo.
 */
import { dinero, esc } from './formato.js';

export function desglosePrecio(pedido, { conPropina = true } = {}) {
  const p = pedido.precio;
  const filas = [];
  if (p.oferta) {
    filas.push(['Precio sugerido', `<span class="tachado">${dinero(p.sugerido)}</span>`]);
    filas.push(['Tu oferta aceptada', dinero(p.oferta)]);
  } else {
    if (p.visita) filas.push(['Visita', dinero(p.visita)]);
    filas.push(['Mano de obra', dinero(p.manoObra)]);
    if (p.recargo) filas.push(['Recargo por urgencia', dinero(p.recargo)]);
  }
  if (p.descuento) filas.push([`Cupón ${esc(p.cupon)}`, `−${dinero(p.descuento)}`, 'verde']);
  const propina = conPropina && pedido.pago?.propina ? pedido.pago.propina : 0;
  if (propina) filas.push(['Propina', dinero(propina)]);
  const total = p.total + propina;

  return `
    <dl class="desglose tarjeta">
      ${filas.map(([dt, dd, clase]) => `<div${clase ? ` class="${clase}"` : ''}><dt>${dt}</dt><dd>${dd}</dd></div>`).join('')}
      <div class="total"><dt>${pedido.pago ? 'Total pagado' : 'Total'}</dt><dd>${dinero(total)}</dd></div>
    </dl>`;
}
