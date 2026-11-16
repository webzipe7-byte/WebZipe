/**
 * Configuración general de la app.
 * Todo lo que cambia entre el demo y la versión real vive aquí.
 */

export const APP = {
  nombre: 'Maestro Ya',
  version: '0.1.0',
  ciudad: 'Cali',
  moneda: 'COP',
  locale: 'es-CO',
};

/**
 * Origen de los datos.
 * 'local'  → datos de ejemplo guardados en el dispositivo (demo).
 * 'api'    → servidor real (pendiente). Ver js/services/README del proyecto.
 */
export const FUENTE_DATOS = 'local';

/** Recargo cuando el servicio es urgente ("Lo antes posible"). */
export const RECARGO_URGENCIA = 0.2;

/**
 * Duración de cada estado en la simulación del pedido (milisegundos).
 * Cuando exista la cuenta del trabajador, estos tiempos desaparecen:
 * el trabajador cambiará el estado desde su app.
 */
export const SIMULACION = {
  buscando: 5000,
  aceptado: 6000,
  enCamino: 20000, // el tiempo real de llegada se comprime a esto
  enProceso: 15000,
};

/** Métodos de pago disponibles (todos simulados por ahora). */
export const METODOS_PAGO = [
  { id: 'tarjeta', nombre: 'Tarjeta terminada en 4242', icono: 'tarjeta' },
  { id: 'nequi', nombre: 'Nequi', icono: 'celular' },
  { id: 'efectivo', nombre: 'Efectivo al finalizar', icono: 'billete' },
];
