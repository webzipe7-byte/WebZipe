/**
 * Pago simulado.
 * Para pagos reales, este archivo es el único que cambia: aquí se conecta la
 * pasarela (Wompi, Mercado Pago, Stripe, etc.) y se devuelve el mismo objeto.
 */
import { esperar, generarId } from './almacen.js';
import { pedidos } from './pedidos.js';

export const pagos = {
  async pagar(pedido, metodo) {
    await esperar(1600);
    const pago = {
      id: generarId('pay_'),
      metodo,
      total: pedido.precio.total,
      estado: metodo === 'efectivo' ? 'efectivo' : 'aprobado',
      fecha: Date.now(),
    };
    pedidos.registrarPago(pedido.id, pago);
    return pago;
  },
};
