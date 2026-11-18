/**
 * Registro del pago. Hoy el cliente le paga directo al maestro (efectivo o
 * transferencia) y aquí solo queda constancia.
 * Para cobrar dentro de la app, este archivo es el único que cambia: aquí se
 * conecta la pasarela (Wompi, Mercado Pago…) y se devuelve el mismo objeto.
 */
import { esperar, generarId } from './almacen.js';
import { pedidos } from './pedidos.js';

export const pagos = {
  async pagar(pedido, { metodo, propina = 0 }) {
    await esperar(300);
    const pago = {
      id: generarId('pay_'),
      metodoId: metodo.id,
      metodoNombre: metodo.nombre,
      tipo: metodo.tipo,
      servicio: pedido.precio.total,
      propina,
      total: pedido.precio.total + propina,
      estado: 'directo',
      fecha: Date.now(),
    };
    await pedidos.registrarPago(pedido.id, pago);
    return pago;
  },
};
