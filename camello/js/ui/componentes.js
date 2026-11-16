/**
 * Piezas de interfaz reutilizables. Todas devuelven HTML como texto.
 */
import { icono } from './iconos.js';
import { esc, iniciales } from './formato.js';
import { categoriaPorId } from '../data/categorias.js';

/** Barra superior de las pantallas de flujo (con botón atrás). */
export function barra(titulo, { atras = true, derecha = '' } = {}) {
  return `
    <header class="barra">
      ${atras ? `<button class="barra-btn" data-accion="atras" aria-label="Volver">${icono('atras')}</button>` : '<span class="barra-btn"></span>'}
      <h1 class="barra-titulo">${esc(titulo)}</h1>
      <span class="barra-btn">${derecha}</span>
    </header>`;
}

/** Navegación inferior de las 3 secciones principales. */
export function navInferior(activa) {
  const items = [
    ['inicio', 'Inicio', '#/inicio', 'inicio'],
    ['pedidos', 'Pedidos', '#/pedidos', 'pedidos'],
    ['billetera', 'Billetera', '#/billetera', 'billetera'],
    ['cuenta', 'Cuenta', '#/cuenta', 'perfil'],
  ];
  return `
    <nav class="nav" aria-label="Secciones">
      ${items
        .map(
          ([id, nombre, ruta, ic]) => `
        <a href="${ruta}" class="nav-item${activa === id ? ' activo' : ''}" ${activa === id ? 'aria-current="page"' : ''}>
          ${icono(ic)}<span>${nombre}</span>
        </a>`
        )
        .join('')}
    </nav>`;
}

/** Indicador de pasos: "Paso 2 de 3" con barras. */
export function pasos(actual, total, etiqueta) {
  return `
    <div class="pasos" aria-label="Paso ${actual} de ${total}">
      <div class="pasos-barras">
        ${Array.from({ length: total }, (_, i) => `<span class="${i < actual ? 'lleno' : ''}"></span>`).join('')}
      </div>
      <p class="pasos-texto">Paso ${actual} de ${total} · ${esc(etiqueta)}</p>
    </div>`;
}

/** Foto del trabajador: iniciales sobre el color de su categoría. */
export function avatar(t, tamano = 56) {
  const color = t.color || categoriaPorId(t.categoria).color;
  return `<span class="avatar" style="--av:${color};width:${tamano}px;height:${tamano}px;font-size:${Math.round(tamano * 0.36)}px">${esc(
    iniciales(t.nombre, t.apellido)
  )}${t.verificado ? `<i class="avatar-ok" title="Identidad verificada">${icono('check', { tamano: 10 })}</i>` : ''}</span>`;
}

/** Icono de la categoría en su cuadro de color. */
export function iconoCategoria(cat, tamano = 48) {
  return `<span class="cat-ico" style="--cat:${cat.color};width:${tamano}px;height:${tamano}px">${icono(cat.icono, { tamano: Math.round(tamano * 0.5) })}</span>`;
}

export function calificacion(valor, trabajos) {
  return `<span class="califica">${icono('estrella', { tamano: 15, relleno: true })}<b>${valor.toFixed(1)}</b>${
    trabajos != null ? `<span class="tenue">(${trabajos})</span>` : ''
  }</span>`;
}

export function estrellasFijas(n, tamano = 14) {
  return `<span class="estrellas-fijas" aria-label="${n} de 5 estrellas">${Array.from({ length: 5 }, (_, i) =>
    icono('estrella', { tamano, relleno: i < n, clase: i < n ? 'on' : '' })
  ).join('')}</span>`;
}

/** Esqueletos de carga. */
export function esqueletoTarjetas(n = 3) {
  return Array.from(
    { length: n },
    () => `
    <div class="tarjeta esqueleto" aria-hidden="true">
      <span class="sk sk-circulo"></span>
      <div class="sk-lineas"><span class="sk" style="width:60%"></span><span class="sk" style="width:85%"></span><span class="sk" style="width:40%"></span></div>
    </div>`
  ).join('');
}

/** Estado vacío: ilustración simple, título, texto y una acción. */
export function vacio({ icono: ic = 'pedidos', titulo, texto, accion, ruta }) {
  return `
    <div class="vacio">
      <span class="vacio-ico">${icono(ic, { tamano: 34 })}</span>
      <h2>${esc(titulo)}</h2>
      <p>${esc(texto)}</p>
      ${accion ? `<a class="btn btn-primario" href="${ruta}">${esc(accion)}</a>` : ''}
    </div>`;
}

/** Estado de error con reintento. */
export function errorVista(mensaje = 'Algo salió mal.') {
  return `
    <div class="vacio error-vista" role="alert">
      <span class="vacio-ico">${icono('wifi', { tamano: 34 })}</span>
      <h2>No pudimos cargar esto</h2>
      <p>${esc(mensaje)}</p>
      <button class="btn btn-secundario" data-accion="reintentar">Reintentar</button>
    </div>`;
}

/** Campo de formulario con etiqueta y espacio para el error. */
export function campo({ id, etiqueta, tipo = 'text', valor = '', ayuda = '', auto = '', modo = '', max = '' }) {
  const esClave = tipo === 'password';
  return `
    <div class="campo" data-campo="${id}">
      <label for="f-${id}">${esc(etiqueta)}</label>
      <div class="campo-caja">
        <input id="f-${id}" name="${id}" type="${tipo}" value="${esc(valor)}" ${auto ? `autocomplete="${auto}"` : ''} ${
    modo ? `inputmode="${modo}"` : ''
  } ${max ? `maxlength="${max}"` : ''} aria-describedby="e-${id}${ayuda ? ` a-${id}` : ''}">
        ${esClave ? `<button type="button" class="campo-ojo" data-accion="ver-clave" aria-label="Mostrar contraseña">${icono('ojo', { tamano: 20 })}</button>` : ''}
      </div>
      ${ayuda ? `<p class="campo-ayuda" id="a-${id}">${esc(ayuda)}</p>` : ''}
      <p class="campo-error" id="e-${id}" role="alert"></p>
    </div>`;
}

/** Muestra u oculta el error de un campo. */
export function marcarError(raiz, id, mensaje) {
  const c = raiz.querySelector(`[data-campo="${id}"]`);
  if (!c) return;
  c.classList.toggle('con-error', !!mensaje);
  c.querySelector('.campo-error').textContent = mensaje || '';
  c.querySelector('input,textarea')?.setAttribute('aria-invalid', mensaje ? 'true' : 'false');
}

/** Activa los botones de "ver contraseña" dentro de un contenedor. */
export function activarOjos(raiz) {
  raiz.querySelectorAll('[data-accion="ver-clave"]').forEach((b) => {
    b.addEventListener('click', () => {
      const input = b.parentElement.querySelector('input');
      const ver = input.type === 'password';
      input.type = ver ? 'text' : 'password';
      b.innerHTML = icono(ver ? 'ojoNo' : 'ojo', { tamano: 20 });
      b.setAttribute('aria-label', ver ? 'Ocultar contraseña' : 'Mostrar contraseña');
    });
  });
}

/** Pone un botón en modo "cargando". */
export function cargando(boton, activo, texto) {
  if (activo) {
    boton.dataset.texto = boton.innerHTML;
    boton.disabled = true;
    boton.classList.add('cargando');
    boton.innerHTML = `<span class="girador" aria-hidden="true"></span>${esc(texto || 'Un momento…')}`;
  } else {
    boton.disabled = false;
    boton.classList.remove('cargando');
    if (boton.dataset.texto) boton.innerHTML = boton.dataset.texto;
  }
}

/** Aviso flotante breve. */
export function aviso(mensaje, tipo = 'info') {
  let caja = document.getElementById('avisos');
  if (!caja) {
    caja = document.createElement('div');
    caja.id = 'avisos';
    caja.setAttribute('aria-live', 'polite');
    document.body.appendChild(caja);
  }
  const el = document.createElement('div');
  el.className = `aviso aviso-${tipo}`;
  el.textContent = mensaje;
  caja.appendChild(el);
  setTimeout(() => el.classList.add('sale'), 2600);
  setTimeout(() => el.remove(), 3000);
}
