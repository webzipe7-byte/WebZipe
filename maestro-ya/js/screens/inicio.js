import { CATEGORIAS } from '../data/categorias.js';
import { buscarCategorias } from '../services/buscar.js';
import { sesion, borrador } from '../estado.js';
import { ir } from '../router.js';
import { navInferior, iconoCategoria } from '../ui/componentes.js';
import { montarPedidoActivo } from '../ui/pedido-activo.js';
import { icono } from '../ui/iconos.js';
import { esc, primerNombre, saludo } from '../ui/formato.js';
import { APP } from '../config.js';

export function pantallaInicio(raiz) {
  const nombre = primerNombre(sesion.usuario?.nombre);

  raiz.innerHTML = `
    <main class="contenido con-nav">
      <header class="inicio-cabecera">
        <p class="tenue">${saludo()}, ${esc(nombre)}</p>
        <h1 tabindex="-1">¿Qué necesitas arreglar hoy?</h1>
      </header>

      <div id="activo"></div>

      <div class="buscador" role="search">
        ${icono('buscar', { tamano: 20 })}
        <input type="search" id="q" placeholder="Ej: se dañó la chapa" aria-label="Buscar un servicio" autocomplete="off" enterkeyhint="search">
      </div>
      <div class="sugerencias" id="sugerencias" hidden></div>

      <h2 class="seccion-titulo">Servicios</h2>
      <ul class="categorias">
        ${CATEGORIAS.map(
          (c) => `
          <li>
            <button class="categoria" data-cat="${c.id}">
              ${iconoCategoria(c, 52)}
              <span>${esc(c.nombreCorto || c.nombre)}</span>
            </button>
          </li>`
        ).join('')}
      </ul>

      <ul class="confianza">
        <li>${icono('escudo', { tamano: 20 })}<span>Maestros con identidad verificada</span></li>
        <li>${icono('billete', { tamano: 20 })}<span>Ves el precio antes de pedir</span></li>
        <li>${icono('check', { tamano: 20 })}<span>Pagas cuando el trabajo termina</span></li>
      </ul>
      <p class="nota-demo">Demo · maestros, precios y reseñas de ejemplo en ${APP.ciudad}.</p>
    </main>
    ${navInferior('inicio')}`;

  const elegir = (id) => {
    borrador.nuevo(id);
    ir(`/solicitud/${id}`);
  };

  raiz.querySelectorAll('[data-cat]').forEach((b) => b.addEventListener('click', () => elegir(b.dataset.cat)));

  // Buscador: sugiere la categoría según lo que se escribe
  const q = raiz.querySelector('#q');
  const caja = raiz.querySelector('#sugerencias');
  const mostrar = () => {
    const texto = q.value.trim();
    if (texto.length < 2) {
      caja.hidden = true;
      return;
    }
    const res = buscarCategorias(texto);
    caja.hidden = false;
    caja.innerHTML = res.length
      ? res
          .slice(0, 3)
          .map(
            (c) => `
          <button class="sugerencia" data-cat="${c.id}">
            ${iconoCategoria(c, 36)}
            <span><b>${esc(c.nombre)}</b><small>Ver maestros disponibles</small></span>
            ${icono('derecha', { tamano: 18 })}
          </button>`
          )
          .join('')
      : `<p class="sin-resultados">No encontramos "${esc(texto)}". Elige uno de los servicios de abajo.</p>`;
    caja.querySelectorAll('[data-cat]').forEach((b) => b.addEventListener('click', () => elegir(b.dataset.cat)));
  };
  q.addEventListener('input', mostrar);
  q.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const primero = caja.querySelector('[data-cat]');
      if (primero) elegir(primero.dataset.cat);
    }
  });

  return montarPedidoActivo(raiz.querySelector('#activo'));
}
