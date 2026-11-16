/**
 * Almacenamiento local (localStorage) con prefijo propio.
 * En el demo hace las veces de "base de datos".
 */

const PREFIJO = 'camello:';

export const almacen = {
  /**
   * Lee un valor. Si lo guardado está dañado o no es del mismo tipo que el
   * valor por defecto (lista, objeto…), devuelve el valor por defecto.
   */
  leer(clave, porDefecto = null) {
    try {
      const valor = localStorage.getItem(PREFIJO + clave);
      if (valor === null) return porDefecto;
      const dato = JSON.parse(valor);
      if (Array.isArray(porDefecto) && !Array.isArray(dato)) return porDefecto;
      if (porDefecto && typeof porDefecto === 'object' && !Array.isArray(porDefecto) && (typeof dato !== 'object' || dato === null || Array.isArray(dato))) {
        return porDefecto;
      }
      return dato;
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
