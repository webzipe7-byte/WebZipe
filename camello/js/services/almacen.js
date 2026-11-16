/**
 * Base de datos de Camello: una sola, compartida por clientes y maestros.
 *
 * Tablas (claves con prefijo "camello:"):
 *   usuarios        clientes y maestros (campo `rol`)
 *   pedidos         solicitudes de servicio de todos
 *   chat:<pedido>   mensajes entre el cliente y el maestro de ese pedido
 *   ubicacion:<id>  última posición GPS de cada maestro conectado
 *
 * Hoy vive en el dispositivo (localStorage). Para que clientes y maestros
 * se vean desde teléfonos distintos, este archivo se cambia por uno que hable
 * con una base en la nube (Firebase, Supabase…) con las mismas funciones:
 * leer, guardar, borrar y escuchar.
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
      avisarCambio(clave);
      return true;
    } catch {
      // Espacio lleno: se libera lo más viejo (chats y pedidos cerrados) y se intenta otra vez
      liberarEspacio();
      try {
        localStorage.setItem(PREFIJO + clave, texto);
        avisarCambio(clave);
        return true;
      } catch {
        return false;
      }
    }
  },

  borrar(clave) {
    try {
      localStorage.removeItem(PREFIJO + clave);
      avisarCambio(clave);
    } catch {
      /* sin acceso al almacenamiento: no hay nada que borrar */
    }
  },

  /**
   * Avisa cuando cambia una clave, en esta pestaña o en otra
   * (por ejemplo, el cliente y el maestro abiertos a la vez).
   * `claves` puede ser un texto o una lista; una clave que termina en ':'
   * escucha todas las que empiezan así ('chat:').
   * Devuelve la función para dejar de escuchar.
   */
  escuchar(claves, fn) {
    const lista = [].concat(claves);
    const coincide = (k) => lista.some((c) => (c.endsWith(':') ? k.startsWith(c) : k === c));
    const local = (e) => coincide(e.detail) && fn(e.detail);
    const otra = (e) => e.key?.startsWith(PREFIJO) && coincide(e.key.slice(PREFIJO.length)) && fn(e.key.slice(PREFIJO.length));
    window.addEventListener('camello:cambio', local);
    window.addEventListener('storage', otra);
    return () => {
      window.removeEventListener('camello:cambio', local);
      window.removeEventListener('storage', otra);
    };
  },
};

function avisarCambio(clave) {
  try {
    window.dispatchEvent(new CustomEvent('camello:cambio', { detail: clave }));
  } catch {
    /* fuera del navegador no hay a quién avisar */
  }
}

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
