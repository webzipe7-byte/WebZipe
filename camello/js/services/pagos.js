/**
 * Pago simulado.
 * Para pagos reales, este archivo es el único que cambia: aquí se conecta la
 * pasarela (Wompi, Mercado Pago, Stripe, etc.) y se devuelve el mismo objeto.
 */
import { esperar, generarId } from './almacen.js';
import { pedidos } from './pedidos.js';

export const pagos = {
  async pagar(pedido, { metodo, propina = 0 }) {
    await esperar(1600);
    const pago = {
      id: generarId('pay_'),
      metodoId: metodo.id,
      metodoNombre: metodo.nombre,
      tipo: metodo.tipo,
      servicio: pedido.precio.total,
      propina,
      total: pedido.precio.total + propina,
      estado: metodo.tipo === 'efectivo' ? 'efectivo' : 'aprobado',
      fecha: Date.now(),
    };
    pedidos.registrarPago(pedido.id, pago);
    return pago;
  },
};
