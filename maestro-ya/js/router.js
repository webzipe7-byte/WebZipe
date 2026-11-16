/**
 * Enrutador por hash (#/ruta). Funciona en cualquier hosting estático,
 * incluido GitHub Pages, sin configurar el servidor.
 */

const rutas = [];
let limpiarActual = null;

/**
 * Registra una ruta.
 * patron: '/pedido/:id'
 * pantalla: async (raiz, params) => (opcional) función de limpieza
 * opciones.publica: true si no requiere sesión
 */
export function ruta(patron, pantalla, opciones = {}) {
  const claves = [];
  const regex = new RegExp(
    '^' +
      patron.replace(/:(\w+)/g, (_, k) => {
        claves.push(k);
        return '([^/]+)';
      }) +
      '$'
  );
  rutas.push({ regex, claves, pantalla, ...opciones });
}

export const ir = (destino, { reemplazar = false } = {}) => {
  const hash = '#' + destino;
  if (reemplazar) location.replace(hash);
  else location.hash = hash;
};

// Cuántas pantallas se han visto en esta sesión: si es la primera, "atrás" va al respaldo
let vistas = 0;

export const atras = (respaldo = '/inicio') => {
  if (vistas > 1) history.back();
  else ir(respaldo, { reemplazar: true });
};

export function iniciarRouter({ raiz, haySesion, inicioPublico, inicioPrivado }) {
  async function resolver() {
    const camino = location.hash.slice(1) || (haySesion() ? inicioPrivado : inicioPublico);

    let encontrada = null;
    let params = {};
    for (const r of rutas) {
      const m = camino.match(r.regex);
      if (m) {
        encontrada = r;
        r.claves.forEach((k, i) => (params[k] = decodeURIComponent(m[i + 1])));
        break;
      }
    }

    if (!encontrada) return ir(haySesion() ? inicioPrivado : inicioPublico, { reemplazar: true });
    if (!encontrada.publica && !haySesion()) return ir(inicioPublico, { reemplazar: true });
    if (encontrada.soloSinSesion && haySesion()) return ir(inicioPrivado, { reemplazar: true });

    vistas++;
    if (typeof limpiarActual === 'function') limpiarActual();
    limpiarActual = null;

    raiz.classList.remove('entra');
    void raiz.offsetWidth; // reinicia la animación de entrada
    raiz.classList.add('entra');
    window.scrollTo(0, 0);

    limpiarActual = await encontrada.pantalla(raiz, params);
    raiz.querySelector('h1')?.focus({ preventScroll: true });
  }

  window.addEventListener('hashchange', resolver);
  resolver();
}
