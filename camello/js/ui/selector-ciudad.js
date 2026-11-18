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

/** Departamentos con sus ciudades, en orden alfabético. */
const DEPARTAMENTOS = [...new Set(CIUDADES.map((c) => c.departamento))]
  .sort((a, b) => a.localeCompare(b, 'es'))
  .map((d) => ({ nombre: d, ciudades: CIUDADES.filter((c) => c.departamento === d).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')) }));

/**
 * Abre el menú lateral de ciudades (entra desde la izquierda, como el menú de WebZipe):
 * buscador arriba, departamentos en mayúsculas y cada uno abre sus ciudades.
 * Devuelve la ciudad elegida, o null si se cierra sin elegir.
 */
export function abrirSelectorCiudad({ actual = '', conGps = false } = {}) {
  return new Promise((resolver) => {
    const elegida = ciudadPorId(actual);
    const fondo = document.createElement('div');
    fondo.className = 'selector-pantalla cajon-fondo';
    fondo.innerHTML = `
      <aside class="cajon" role="dialog" aria-modal="true" aria-label="Elige tu ciudad">
        <section class="cajon-panel" data-panel="principal">
          <header class="cajon-cabeza">
            <button type="button" class="cajon-x" data-cerrar aria-label="Cerrar">${icono('cerrar', { tamano: 22 })}</button>
            <span class="cajon-titulo">Tu ciudad</span>
          </header>
          <div class="selector-buscar cajon-buscar">
            ${icono('buscar', { tamano: 18 })}
            <input type="search" placeholder="Buscar ciudad o departamento" autocomplete="off" autocapitalize="words"
              enterkeyhint="search" aria-label="Buscar ciudad" aria-controls="cajon-lista">
            <button type="button" class="selector-limpiar" data-limpiar aria-label="Borrar búsqueda" hidden>${icono('cerrar', { tamano: 14 })}</button>
          </div>
          <nav class="cajon-lista" id="cajon-lista" aria-label="Ciudades"></nav>
          <footer class="cajon-pie">
            ${conGps ? `<button type="button" class="selector-gps cajon-accion" data-gps>${icono('ubicacion', { tamano: 18 })}<span>Usar mi ubicación</span></button><small class="cajon-gps-nota" hidden></small>` : ''}
            <p class="cajon-nota">${elegida ? `Ahora: <b>${esc(elegida.nombre)}</b>, ${esc(elegida.departamento)}` : `${CIUDADES.length} ciudades de Colombia`}</p>
          </footer>
        </section>
        <section class="cajon-panel cajon-sub" data-panel="sub" hidden aria-live="polite"></section>
      </aside>`;
    document.body.appendChild(fondo);
    document.body.classList.add('sin-scroll');
    requestAnimationFrame(() => fondo.classList.add('abierto'));

    const principal = fondo.querySelector('[data-panel="principal"]');
    const sub = fondo.querySelector('[data-panel="sub"]');
    const input = fondo.querySelector('input');
    const lista = fondo.querySelector('.cajon-lista');
    const limpiar = fondo.querySelector('[data-limpiar]');
    let resultados = [];

    const opcion = (c, n, q = '') => `
      <button type="button" role="option" class="selector-opcion${c.id === actual ? ' actual' : ''}" data-id="${c.id}" aria-selected="${c.id === actual}">
        ${n ? `<span class="cajon-num">${String(n).padStart(2, '0')}</span>` : ''}
        <span class="cajon-ciudad"><b>${resaltar(c.nombre, q)}</b><small>${esc(c.departamento)}</small></span>
        ${c.id === actual ? icono('check', { tamano: 18 }) : ''}
      </button>`;

    // Lista principal: ciudades principales y departamentos (cada uno abre sus ciudades)
    function pintarMenu() {
      const marca = (d) => (elegida && elegida.departamento === d ? ' tiene-actual' : '');
      lista.innerHTML = `
        <button type="button" class="cajon-item destacado" data-depto="__principales">
          <span>Ciudades principales</span><small>${PRINCIPALES}</small>${icono('derecha', { tamano: 16 })}
        </button>
        <p class="cajon-grupo">Por departamento</p>
        ${DEPARTAMENTOS.map(
          (d) => `<button type="button" class="cajon-item${marca(d.nombre)}" data-depto="${esc(d.nombre)}">
            <span>${esc(d.nombre)}</span><small>${d.ciudades.length}</small>${icono('derecha', { tamano: 16 })}
          </button>`
        ).join('')}`;
    }

    function pintar() {
      const q = input.value;
      limpiar.hidden = !q;
      const encontradas = buscarCiudades(q);
      if (encontradas === null) {
        resultados = [];
        return pintarMenu();
      }
      resultados = encontradas;
      lista.innerHTML = encontradas.length
        ? `<p class="cajon-grupo">${encontradas.length} resultado${encontradas.length > 1 ? 's' : ''}</p>
           <div role="listbox" aria-label="Resultados">${encontradas.map((c) => opcion(c, 0, q)).join('')}</div>`
        : `<div class="selector-vacio">
            ${icono('buscar', { tamano: 30 })}
            <b>No encontramos "${esc(q.trim())}"</b>
            <small>Revisa cómo está escrito o entra por el departamento. Si tu municipio no aparece, todavía no estamos ahí.</small>
          </div>`;
    }

    // Submenú de un departamento (entra desde la derecha, como "Servicios" en WebZipe)
    function abrirDepto(nombre) {
      const principales = nombre === '__principales';
      const ciudades = principales ? CIUDADES_SELECTOR.slice(0, PRINCIPALES) : DEPARTAMENTOS.find((d) => d.nombre === nombre).ciudades;
      sub.innerHTML = `
        <header class="cajon-cabeza sub">
          <button type="button" class="cajon-volver" data-volver aria-label="Volver">${icono('atras', { tamano: 20 })}</button>
          <span class="cajon-titulo">${esc(principales ? 'Principales' : nombre)}</span>
          <button type="button" class="cajon-x" data-cerrar aria-label="Cerrar">${icono('cerrar', { tamano: 22 })}</button>
        </header>
        <p class="cajon-intro">${
          principales
            ? 'Las ciudades con más maestros. Toca la tuya.'
            : `${ciudades.length === 1 ? 'La ciudad' : `Las ${ciudades.length} ciudades`} de ${esc(nombre)} donde está Camello.`
        }</p>
        <div class="cajon-lista" role="listbox" aria-label="Ciudades de ${esc(nombre)}">${ciudades.map((c, i) => opcion(c, i + 1)).join('')}</div>`;
      sub.hidden = false;
      requestAnimationFrame(() => sub.classList.add('abierto'));
      principal.setAttribute('aria-hidden', 'true');
      sub.querySelector('.selector-opcion')?.focus();
    }

    function cerrarDepto() {
      sub.classList.remove('abierto');
      principal.removeAttribute('aria-hidden');
      setTimeout(() => (sub.hidden = true), 250);
      input.focus();
    }

    function cerrar(ciudad = null) {
      document.removeEventListener('keydown', teclas);
      document.body.classList.remove('sin-scroll');
      fondo.classList.remove('abierto');
      setTimeout(() => fondo.remove(), 250);
      resolver(ciudad);
    }

    function teclas(e) {
      if (e.key !== 'Escape') return;
      if (!sub.hidden) cerrarDepto();
      else cerrar();
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
    fondo.addEventListener('click', (e) => {
      if (e.target === fondo) return cerrar();
      const ciudad = e.target.closest('[data-id]');
      if (ciudad) return cerrar(ciudadPorId(ciudad.dataset.id));
      const depto = e.target.closest('[data-depto]');
      if (depto) return abrirDepto(depto.dataset.depto);
      if (e.target.closest('[data-volver]')) return cerrarDepto();
      if (e.target.closest('[data-cerrar]')) return cerrar();
    });
    document.addEventListener('keydown', teclas);

    const gps = fondo.querySelector('[data-gps]');
    const nota = fondo.querySelector('.cajon-gps-nota');
    gps?.addEventListener('click', async () => {
      gps.disabled = true;
      gps.querySelector('span').textContent = 'Buscando dónde estás…';
      try {
        const c = ciudadMasCercana(await miUbicacion());
        if (c) return cerrar(c);
        nota.textContent = 'Estás lejos de las ciudades donde funcionamos. Búscala en la lista.';
      } catch (err) {
        nota.textContent = err.message;
      }
      nota.hidden = false;
      gps.querySelector('span').textContent = 'Usar mi ubicación';
      gps.disabled = false;
    });

    pintar();
    input.focus();
  });
}
