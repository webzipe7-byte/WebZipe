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
    const texto = JSON.stringify(valor);
    try {
      localStorage.setItem(PREFIJO + clave, texto);
      return true;
    } catch {
      // Espacio lleno: se libera lo más viejo (chats y pedidos cerrados) y se intenta otra vez
      liberarEspacio();
      try {
        localStorage.setItem(PREFIJO + clave, texto);
        return true;
      } catch {
        return false;
      }
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

/** Máximo de pedidos guardados por dispositivo (los cerrados más viejos se descartan). */
export const MAX_PEDIDOS = 200;

/** Borra chats de pedidos viejos y recorta el historial. */
export function liberarEspacio() {
  try {
    const pedidos = JSON.parse(localStorage.getItem(PREFIJO + 'pedidos') || '[]');
    if (!Array.isArray(pedidos)) return;
    const recientes = pedidos.sort((a, b) => b.creado - a.creado).slice(0, Math.floor(MAX_PEDIDOS / 2));
    const vivos = new Set(recientes.map((p) => p.id));
    Object.keys(localStorage)
      .filter((k) => k.startsWith(PREFIJO + 'chat:') && !vivos.has(k.slice((PREFIJO + 'chat:').length)))
      .forEach((k) => localStorage.removeItem(k));
    localStorage.setItem(PREFIJO + 'pedidos', JSON.stringify(recientes));
  } catch {
    /* no hay nada más que liberar */
  }
}

/** Simula la demora de un servidor para que se vean los estados de carga. */
export const esperar = (ms = 600) => new Promise((resolver) => setTimeout(resolver, ms));

export const generarId = (prefijo = '') =>
  prefijo + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
