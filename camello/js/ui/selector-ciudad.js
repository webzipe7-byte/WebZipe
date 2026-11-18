/**
 * Buscador de ciudades de la app.
 *
 * En los formularios se ve como un campo "Ciudad". Al tocarlo se abre una
 * pantalla con un buscador: se escribe parte del nombre (o del departamento),
 * con o sin tildes, y se elige de la lista. También puede usar el GPS.
 *
 * El valor queda en un <input type="hidden"> con el id indicado, y al cambiar
 * dispara el evento 'change' en ese input, como lo haría un <select>.
 */
import { CIUDADES, CIUDADES_SELECTOR, ciudadPorId, ciudadMasCercana } from '../data/ciudades.js';
import { miUbicacion } from '../services/ubicacion.js';
import { icono } from './iconos.js';
import { esc } from './formato.js';

const PRINCIPALES = 12;

/** Quita tildes y mayúsculas para comparar: "Bogotá" → "bogota". */
const normal = (t) =>
  String(t)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim();

const INDICE = CIUDADES.map((c) => ({ c, nombre: normal(c.nombre), depto: normal(c.departamento) }));

/** Ciudades que coinciden con lo escrito: primero las que empiezan así, luego las que lo contienen. */
export function buscarCiudades(texto) {
  const q = normal(texto);
  if (!q) return null;
  const empieza = [];
  const contiene = [];
  const deDepto = [];
  for (const x of INDICE) {
    if (x.nombre.startsWith(q) || x.nombre.split(/[\s-]+/).some((p) => p.startsWith(q))) empieza.push(x.c);
    else if (x.nombre.includes(q)) contiene.push(x.c);
    else if (x.depto.includes(q)) deDepto.push(x.c);
  }
  const porNombre = (a, b) => a.nombre.localeCompare(b.nombre, 'es');
  return [...empieza.sort(porNombre), ...contiene.sort(porNombre), ...deDepto.sort(porNombre)];
}

/** Resalta en negrita la parte que coincide con la búsqueda. */
function resaltar(nombre, texto) {
  const q = normal(texto);
  const i = q ? normal(nombre).indexOf(q) : -1;
  if (i < 0) return esc(nombre);
  return `${esc(nombre.slice(0, i))}<mark>${esc(nombre.slice(i, i + q.length))}</mark>${esc(nombre.slice(i + q.length))}`;
}

/** HTML del campo para un formulario. */
export function campoCiudad({ id = 'f-ciudad', nombre = 'ciudad', valor = '', etiqueta = 'Ciudad', conGps = false } = {}) {
  const c = ciudadPorId(valor);
  return `
    <div class="campo" data-campo="${esc(nombre)}">
      <span class="campo-etiqueta" id="l-${esc(id)}">${esc(etiqueta)}</span>
      <input type="hidden" id="${esc(id)}" name="${esc(nombre)}" value="${c ? esc(c.id) : ''}">
      <button type="button" class="selector-ciudad${c ? ' lleno' : ''}" data-selector-ciudad="${esc(id)}" data-gps="${conGps ? '1' : ''}"
        aria-labelledby="l-${esc(id)} v-${esc(id)}" aria-describedby="e-${esc(nombre)}" aria-haspopup="dialog">
        ${icono('ubicacion', { tamano: 20 })}
        <span id="v-${esc(id)}">${c ? `<b>${esc(c.nombre)}</b><small>${esc(c.departamento)}</small>` : '<b>Busca tu ciudad</b>'}</span>
        ${icono('buscar', { tamano: 18 })}
      </button>
      <p class="campo-error" id="e-${esc(nombre)}" role="alert"></p>
    </div>`;
}

/** Cambia la ciudad de un campo desde el código (por ejemplo, con el GPS). */
export function ponerCiudad(input, id) {
  const c = ciudadPorId(id);
  if (!input || !c) return;
  input.value = c.id;
  const boton = input.parentElement.querySelector('[data-selector-ciudad]');
  boton.classList.add('lleno');
  boton.querySelector(`#v-${CSS.escape(input.id)}`).innerHTML = `<b>${esc(c.nombre)}</b><small>${esc(c.departamento)}</small>`;
  input.dispatchEvent(new Event('change', { bubbles: true }));
}

/** Activa todos los campos de ciudad que haya dentro de `raiz`. */
export function activarCiudades(raiz) {
  raiz.querySelectorAll('[data-selector-ciudad]').forEach((boton) => {
    boton.addEventListener('click', async () => {
      const input = raiz.querySelector(`#${CSS.escape(boton.dataset.selectorCiudad)}`);
      const elegida = await abrirSelectorCiudad({ actual: input.value, conGps: !!boton.dataset.gps });
      if (elegida) {
        ponerCiudad(input, elegida.id);
        const caja = boton.closest('.campo');
        caja?.classList.remove('con-error');
        const error = caja?.querySelector('.campo-error');
        if (error) error.textContent = '';
      }
      boton.focus();
    });
  });
}

/** Abre la pantalla de búsqueda. Devuelve la ciudad elegida, o null si se cierra sin elegir. */
export function abrirSelectorCiudad({ actual = '', conGps = false } = {}) {
  return new Promise((resolver) => {
    const pantalla = document.createElement('div');
    pantalla.className = 'selector-pantalla';
    pantalla.setAttribute('role', 'dialog');
    pantalla.setAttribute('aria-modal', 'true');
    pantalla.setAttribute('aria-label', 'Elige tu ciudad');
    pantalla.innerHTML = `
      <header class="selector-cabeza">
        <button type="button" class="barra-btn" data-cerrar aria-label="Cerrar">${icono('atras', { tamano: 22 })}</button>
        <h2>Elige tu ciudad</h2>
      </header>
      <div class="selector-buscar">
        ${icono('buscar', { tamano: 20 })}
        <input type="search" placeholder="Escribe tu ciudad o departamento" autocomplete="off" autocapitalize="words"
          enterkeyhint="search" aria-label="Buscar ciudad" aria-controls="lista-ciudades">
        <button type="button" class="selector-limpiar" data-limpiar aria-label="Borrar búsqueda" hidden>${icono('cerrar', { tamano: 16 })}</button>
      </div>
      ${
        conGps
          ? `<button type="button" class="selector-gps" data-gps>${icono('ubicacion', { tamano: 20 })}<span><b>Usar mi ubicación</b><small>Elegimos la ciudad donde estás</small></span></button>`
          : ''
      }
      <div class="selector-lista" id="lista-ciudades" role="listbox" aria-label="Ciudades"></div>`;
    document.body.appendChild(pantalla);
    document.body.classList.add('sin-scroll');

    const input = pantalla.querySelector('input');
    const lista = pantalla.querySelector('.selector-lista');
    const limpiar = pantalla.querySelector('[data-limpiar]');
    let resultados = [];

    const fila = (c, q = '') => `
      <button type="button" role="option" class="selector-opcion${c.id === actual ? ' actual' : ''}" data-id="${c.id}" aria-selected="${c.id === actual}">
        <span><b>${resaltar(c.nombre, q)}</b><small>${esc(c.departamento)}</small></span>
        ${c.id === actual ? icono('check', { tamano: 18 }) : ''}
      </button>`;

    function pintar() {
      const q = input.value;
      limpiar.hidden = !q;
      const encontradas = buscarCiudades(q);
      if (encontradas === null) {
        resultados = CIUDADES_SELECTOR;
        lista.innerHTML = `
          <p class="selector-grupo">Ciudades principales</p>
          ${CIUDADES_SELECTOR.slice(0, PRINCIPALES).map((c) => fila(c)).join('')}
          <p class="selector-grupo">Todas las ciudades (A–Z)</p>
          ${CIUDADES_SELECTOR.slice(PRINCIPALES).map((c) => fila(c)).join('')}`;
        return;
      }
      resultados = encontradas;
      lista.innerHTML = encontradas.length
        ? `<p class="selector-grupo">${encontradas.length} resultado${encontradas.length > 1 ? 's' : ''}</p>${encontradas.map((c) => fila(c, q)).join('')}`
        : `<div class="selector-vacio">
            ${icono('buscar', { tamano: 32 })}
            <b>No encontramos "${esc(q.trim())}"</b>
            <small>Revisa cómo está escrito. Si tu municipio no aparece, todavía no estamos ahí.</small>
          </div>`;
    }

    function cerrar(ciudad = null) {
      document.removeEventListener('keydown', teclas);
      pantalla.remove();
      document.body.classList.remove('sin-scroll');
      resolver(ciudad);
    }

    function teclas(e) {
      if (e.key === 'Escape') cerrar();
    }

    input.addEventListener('input', pintar);
    input.addEventListener('keydown', (e) => {
      // Enter elige el primer resultado de la búsqueda
      if (e.key === 'Enter' && input.value.trim() && resultados.length) {
        e.preventDefault();
        cerrar(resultados[0]);
      }
    });
    limpiar.addEventListener('click', () => {
      input.value = '';
      pintar();
      input.focus();
    });
    lista.addEventListener('click', (e) => {
      const b = e.target.closest('[data-id]');
      if (b) cerrar(ciudadPorId(b.dataset.id));
    });
    pantalla.querySelector('[data-cerrar]').addEventListener('click', () => cerrar());
    document.addEventListener('keydown', teclas);

    const gps = pantalla.querySelector('[data-gps]');
    gps?.addEventListener('click', async () => {
      gps.disabled = true;
      gps.querySelector('small').textContent = 'Buscando dónde estás…';
      try {
        const c = ciudadMasCercana(await miUbicacion());
        if (c) return cerrar(c);
        gps.querySelector('small').textContent = 'Estás lejos de las ciudades donde funcionamos. Búscala en la lista.';
      } catch (err) {
        gps.querySelector('small').textContent = err.message;
      }
      gps.disabled = false;
    });

    pintar();
    // Si ya había una elegida, se muestra en la lista
    lista.querySelector('.actual')?.scrollIntoView({ block: 'center' });
    input.focus();
  });
}
