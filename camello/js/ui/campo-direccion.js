/**
 * Campo de dirección con sugerencias reales y confirmación en el mapa.
 *
 * 1. Mientras escribe, aparecen lugares y calles reales de su ciudad.
 * 2. Si elige una sugerencia, ya queda el punto exacto.
 * 3. Si escribe una dirección sin elegir, al continuar se busca y se abre el
 *    mapa para que confirme o mueva el pin hasta la puerta.
 */
import { sugerir, ubicarDireccion } from '../services/geocodificar.js';
import { ciudadPorId } from '../data/ciudades.js';
import { CENTRO } from '../services/ubicacion.js';
import { abrirMapaElegir } from './mapa-elegir.js';
import { icono } from './iconos.js';
import { esc } from './formato.js';

/** Un punto es confiable si viene del GPS, de una sugerencia o del mapa (no de versiones viejas). */
export const puntoConfiable = (p) => !!(p && Number.isFinite(p.lat) && Number.isFinite(p.lng) && p.fuente);

export function campoDireccion({ valor = '', etiqueta = 'Dirección' } = {}) {
  return `
    <div class="campo campo-direccion" data-campo="direccion">
      <label for="f-direccion">${esc(etiqueta)}</label>
      <div class="campo-caja dir-caja">
        <input id="f-direccion" name="direccion" value="${esc(valor)}" maxlength="120" autocomplete="off"
          placeholder="Ej: Jardín Plaza o Calle 10 # 5-20" role="combobox" aria-autocomplete="list"
          aria-expanded="false" aria-controls="dir-sugerencias" aria-describedby="e-direccion">
        <ul class="dir-sugerencias" id="dir-sugerencias" role="listbox" aria-label="Sugerencias" hidden></ul>
      </div>
      <p class="dir-punto" hidden></p>
      <p class="campo-error" id="e-direccion" role="alert"></p>
    </div>`;
}

/**
 * Activa el campo. Opciones:
 *  ciudad(): id de la ciudad elegida
 *  punto: punto que ya tenía (por ejemplo, del GPS)
 *  alCambiarCiudad(id): si eligen una sugerencia de otra ciudad
 * Devuelve { punto, ponerPunto, asegurar }.
 */
export function activarDireccion(raiz, { ciudad = () => '', punto = null, alCambiarCiudad = () => {} } = {}) {
  const input = raiz.querySelector('#f-direccion');
  const lista = raiz.querySelector('#dir-sugerencias');
  const estado = raiz.querySelector('.dir-punto');
  let actual = puntoConfiable(punto) ? punto : null;
  let sugerencias = [];
  let marcada = -1;
  let espera = null;
  let consulta = null;

  function mostrarEstado() {
    estado.hidden = !actual;
    if (!actual) return;
    const de = { gps: 'con tu GPS', busqueda: 'en el mapa', mapa: 'en el mapa' }[actual.fuente] || 'en el mapa';
    estado.innerHTML = `${icono('check', { tamano: 14 })} <span>Ubicada ${de}</span> <button type="button" class="enlace" data-ajustar>Ver o ajustar</button>`;
    estado.querySelector('[data-ajustar]').addEventListener('click', ajustar);
  }

  function cerrarLista() {
    lista.hidden = true;
    lista.innerHTML = '';
    input.setAttribute('aria-expanded', 'false');
    marcada = -1;
  }

  function pintarLista() {
    if (!sugerencias.length) return cerrarLista();
    lista.innerHTML = sugerencias
      .map(
        (s, i) => `<li role="option" id="dir-op-${i}" class="dir-op${i === marcada ? ' marcada' : ''}" data-i="${i}" aria-selected="${i === marcada}">
          ${icono('ubicacion', { tamano: 18 })}<span><b>${esc(s.titulo)}</b>${s.detalle ? `<small>${esc(s.detalle)}</small>` : ''}</span>
        </li>`
      )
      .join('');
    lista.hidden = false;
    input.setAttribute('aria-expanded', 'true');
    input.setAttribute('aria-activedescendant', marcada >= 0 ? `dir-op-${marcada}` : '');
  }

  function elegir(i) {
    const s = sugerencias[i];
    if (!s) return;
    input.value = s.detalle ? `${s.titulo}, ${s.detalle.split(',')[0]}` : s.titulo;
    actual = { lat: s.lat, lng: s.lng, fuente: 'busqueda' };
    if (s.ciudad && s.ciudad !== ciudad()) alCambiarCiudad(s.ciudad);
    cerrarLista();
    mostrarEstado();
    limpiarError();
  }

  function limpiarError() {
    raiz.querySelector('[data-campo="direccion"]')?.classList.remove('con-error');
    raiz.querySelector('#e-direccion').textContent = '';
  }

  input.addEventListener('input', () => {
    // Si cambia el texto, el punto anterior ya no sirve
    actual = null;
    mostrarEstado();
    clearTimeout(espera);
    consulta?.abort();
    const texto = input.value.trim();
    if (texto.length < 3) return cerrarLista();
    espera = setTimeout(async () => {
      consulta = new AbortController();
      try {
        sugerencias = await sugerir(texto, ciudad(), { signal: consulta.signal });
        marcada = -1;
        if (document.activeElement === input) pintarLista();
      } catch {
        /* sin señal o búsqueda cancelada: se puede seguir escribiendo */
      }
    }, 300);
  });

  input.addEventListener('keydown', (e) => {
    if (lista.hidden) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      marcada = (marcada + (e.key === 'ArrowDown' ? 1 : -1) + sugerencias.length) % sugerencias.length;
      pintarLista();
    } else if (e.key === 'Enter' && marcada >= 0) {
      e.preventDefault();
      elegir(marcada);
    } else if (e.key === 'Escape') {
      cerrarLista();
    }
  });
  // pointerdown para que el toque gane antes de que el campo pierda el foco
  lista.addEventListener('pointerdown', (e) => {
    const op = e.target.closest('[data-i]');
    if (!op) return;
    e.preventDefault();
    elegir(Number(op.dataset.i));
  });
  input.addEventListener('blur', () => setTimeout(cerrarLista, 150));

  async function ajustar() {
    const p = await abrirMapaElegir({ centro: actual, titulo: '¿Es aquí?', mensaje: 'Mueve el mapa hasta que el pin quede en la puerta.', zoom: 18 });
    if (p) {
      actual = p;
      mostrarEstado();
    }
  }

  mostrarEstado();

  return {
    get punto() {
      return actual;
    },
    ponerPunto(p, texto) {
      actual = p;
      if (texto) input.value = texto;
      cerrarLista();
      mostrarEstado();
      limpiarError();
    },
    /** Garantiza un punto real: lo busca y la persona lo confirma en el mapa. Devuelve null si cancela. */
    async asegurar() {
      if (actual) return actual;
      const p = await ubicarConMapa(input.value.trim(), ciudad());
      if (p) {
        actual = p;
        mostrarEstado();
      }
      return p;
    },
  };
}

/** Busca una dirección escrita y abre el mapa para que la persona confirme o corrija el punto. */
export async function ubicarConMapa(texto, ciudadId) {
  const ciudad = ciudadPorId(ciudadId);
  const encontrada = await ubicarDireccion(texto, ciudadId);
  const centro = encontrada || ciudad || CENTRO;
  return abrirMapaElegir({
    centro,
    zoom: encontrada ? (encontrada.exacta ? 18 : 17) : 14,
    titulo: encontrada?.exacta ? '¿Es aquí?' : encontrada ? 'Encontramos la zona' : 'Marca el lugar',
    mensaje: encontrada?.exacta
      ? 'Revisa que el pin quede en la puerta.'
      : encontrada
        ? 'Mueve el mapa hasta que el pin quede en la puerta exacta.'
        : `No encontramos "${texto}" en el mapa. Mueve el mapa hasta el lugar del servicio.`,
  });
}
