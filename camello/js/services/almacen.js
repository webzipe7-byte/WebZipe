/**
 * Almacenamiento local (localStorage) con prefijo propio.
 * En el demo hace las veces de "base de datos".
 */

const PREFIJO = 'camello:';

export const almacen = {
  leer(clave, porDefecto = null) {
    try {
      const valor = localStorage.getItem(PREFIJO + clave);
      return valor === null ? porDefecto : JSON.parse(valor);
    } catch {
      return porDefecto;
    }
  },

  guardar(clave, valor) {
    try {
      localStorage.setItem(PREFIJO + clave, JSON.stringify(valor));
      return true;
    } catch {
      return false;
    }
  },

  borrar(clave) {
    try {
      localStorage.removeItem(PREFIJO + clave);
    } catch {
      /* sin acceso al almacenamiento: no hay nada que borrar */
    }
  },
};

/** Simula la demora de un servidor para que se vean los estados de carga. */
export const esperar = (ms = 600) => new Promise((resolver) => setTimeout(resolver, ms));

export const generarId = (prefijo = '') =>
  prefijo + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
