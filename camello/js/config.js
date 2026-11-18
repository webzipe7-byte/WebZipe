/**
 * Configuración general de la app.
 * Todo lo que cambia entre el demo y la versión real vive aquí.
 */

export const APP = {
  nombre: 'Camello',
  lema: 'Te hacemos el camello',
  version: '0.3.2',
  pais: 'Colombia',
  moneda: 'COP',
  locale: 'es-CO',
  lineaEmergencia: '123',
};


/** Recargo cuando el servicio es urgente ("Lo antes posible"). */
export const RECARGO_URGENCIA = 0.2;

/** "Ofrece tu precio": el maestro acepta ofertas desde este porcentaje del precio sugerido. */
export const OFERTA_MINIMA = 0.8;

/** Propinas sugeridas al pagar. */
export const PROPINAS = [0, 2000, 5000, 10000];

/** Contactos de confianza que pueden seguir un servicio. */
export const MAX_CONTACTOS = 5;
