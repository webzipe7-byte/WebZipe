/**
 * Configuración general de la app.
 * Todo lo que cambia entre el demo y la versión real vive aquí.
 */

export const APP = {
  nombre: 'Camello',
  lema: 'Te hacemos el camello',
  version: '0.2.0',
  ciudad: 'Cali',
  moneda: 'COP',
  locale: 'es-CO',
  lineaEmergencia: '123',
};

/**
 * Origen de los datos.
 * 'local'  → datos de ejemplo guardados en el dispositivo (demo).
 * 'api'    → servidor real (pendiente). Ver README.
 */
export const FUENTE_DATOS = 'local';

/** Recargo cuando el servicio es urgente ("Lo antes posible"). */
export const RECARGO_URGENCIA = 0.2;

/** "Ofrece tu precio": el maestro acepta ofertas desde este porcentaje del precio sugerido. */
export const OFERTA_MINIMA = 0.8;

/** Propinas sugeridas al pagar. */
export const PROPINAS = [0, 2000, 5000, 10000];

/** Contactos de confianza que pueden seguir un servicio. */
export const MAX_CONTACTOS = 5;

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
