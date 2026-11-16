/**
 * Bienvenida: el camello en el desierto.
 * Crear cuenta e iniciar sesión solo se habilitan dentro de la app instalada;
 * desde el navegador la única acción es descargarla.
 */
import { icono } from '../ui/iconos.js';
import { abrirInstalar } from '../ui/hoja-instalar.js';
import { instalacion } from '../instalar.js';
import { SILUETA_CAMELLO } from '../ui/silueta.js';

/** Paisaje del desierto con el camello caminando sobre la duna. */
function desierto() {
  return `
    <svg class="desierto" viewBox="0 0 400 380" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      <defs>
        <linearGradient id="cielo" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#fbe3c2"/>
          <stop offset="1" stop-color="#f4c58f"/>
        </linearGradient>
        <clipPath id="sinSuelo"><rect x="0" y="0" width="1254" height="1000"/></clipPath>
      </defs>
      <rect width="400" height="380" fill="url(#cielo)"/>
      <circle cx="300" cy="96" r="44" fill="#fff4e0" opacity=".85"/>
      <path d="M0 238 C70 205 140 214 205 236 S330 206 400 220 V380 H0Z" fill="#ebbb84"/>
      <path d="M0 278 C90 246 170 252 240 270 S350 262 400 270 V380 H0Z" fill="#dda167"/>
      <g transform="translate(206 275) scale(.2) translate(-640 -1000)" clip-path="url(#sinSuelo)">
        <path d="${SILUETA_CAMELLO}" fill="#55250f" fill-rule="evenodd"/>
      </g>
      <path d="M0 300 C110 266 220 268 300 286 S370 296 400 290 V380 H0Z" fill="#cf8f54"/>
      <path d="M0 340 C120 318 260 320 400 334 V380 H0Z" fill="#c07f45" opacity=".9"/>
    </svg>`;
}

export function pantallaBienvenida(raiz) {
  const instalada = instalacion.instalada();

  raiz.innerHTML = `
    <section class="bienvenida">
      ${desierto()}
      <div class="bienvenida-texto">
        <p class="marca-nombre">Camello</p>
        <h1 tabindex="-1">Te hacemos el camello</h1>
        <p>Cerrajeros, plomeros, electricistas y más, cerca de ti. Ves el precio antes de pedir y sigues cada paso desde tu celular.</p>
      </div>
      <div class="pie-acciones">
        ${
          instalada
            ? `<a class="btn btn-primario btn-bloque" href="#/registro">Crear cuenta</a>
               <a class="btn btn-texto btn-bloque" href="#/entrar">Ya tengo cuenta</a>`
            : `<button class="btn btn-primario btn-bloque" data-accion="instalar">${icono('descargar', { tamano: 20 })} Descargar la app</button>
               <button class="btn btn-bloque btn-bloqueado" disabled>${icono('candado', { tamano: 18 })} Crear cuenta</button>
               <button class="btn btn-bloque btn-bloqueado" disabled>${icono('candado', { tamano: 18 })} Ya tengo cuenta</button>
               <p class="nota-instalar">Para crear tu cuenta o entrar, primero descarga la app. Es gratis y ocupa muy poco espacio.</p>`
        }
      </div>
    </section>`;

  raiz.querySelector('[data-accion="instalar"]')?.addEventListener('click', abrirInstalar);
}
