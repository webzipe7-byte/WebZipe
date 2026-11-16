/**
 * Inicio: mapa con la ubicación, buscador, lugares guardados, servicios,
 * promoción y "volver a pedir".
 */
import { CATEGORIAS, categoriaPorId } from '../data/categorias.js';
import { buscarCategorias } from '../services/buscar.js';
import { pedidos, etapaDe } from '../services/pedidos.js';
import { cupones } from '../services/cupones.js';
import { sesion, borrador } from '../estado.js';
import { ir } from '../router.js';
import { navInferior, iconoCategoria } from '../ui/componentes.js';
import { montarPedidoActivo } from '../ui/pedido-activo.js';
import { mapaFondo } from '../ui/mapa.js';
import { icono } from '../ui/iconos.js';
import { almacen } from '../services/almacen.js';
import { esc, primerNombre, saludo, dinero, iniciales } from '../ui/formato.js';

const LUGAR = 'lugarInicio';

/** Dirección donde se pedirá el servicio: la elegida en el inicio o la última usada. */
function direccionActual(u) {
  const elegido = almacen.leer(LUGAR);
  if (elegido === 'casa' && u.lugares.casa) return { ...u.lugares.casa, etiqueta: 'Casa' };
  if (elegido === 'trabajo' && u.lugares.trabajo) return { ...u.lugares.trabajo, etiqueta: 'Trabajo' };
  if (u.direcciones?.[0]) return { ...u.direcciones[0], etiqueta: 'Última dirección' };
  if (u.lugares.casa) return { ...u.lugares.casa, etiqueta: 'Casa' };
  return null;
}

export async function pantallaInicio(raiz) {
  const u = sesion.usuario;
  const dir = direccionActual(u);
  const promo = cupones.disponibles(u, { tienePedidos: false })[0];

  raiz.innerHTML = `
    <section class="inicio-mapa">
      ${mapaFondo()}
      <header class="inicio-top">
        <a class="ubicacion-chip" href="#/lugares">
          ${icono('ubicacion', { tamano: 18 })}
          <span><small>${esc(dir?.etiqueta || 'Servicio en')}</small><b>${esc(dir?.texto || 'Agrega tu dirección')}</b></span>
          ${icono('derecha', { tamano: 16 })}
        </a>
        <a class="avatar-boton" href="#/cuenta" aria-label="Tu cuenta">${esc(iniciales(u.nombre))}</a>
      </header>
      <span class="pin-yo" aria-hidden="true"><i></i></span>
    </section>

    <main class="contenido con-nav hoja-inicio">
      <p class="tenue">${saludo()}, ${esc(primerNombre(u.nombre))}</p>
      <h1 tabindex="-1">¿Qué necesitas arreglar?</h1>

      <div id="activo"></div>

      <div class="buscador" role="search">
        ${icono('buscar', { tamano: 20 })}
        <input type="search" id="q" placeholder="Ej: se dañó la chapa" aria-label="Buscar un servicio" autocomplete="off" enterkeyhint="search">
      </div>
      <div class="sugerencias" id="sugerencias" hidden></div>

      <div class="lugares-rapidos">
        ${['casa', 'trabajo']
          .map((l) => {
            const lugar = u.lugares[l];
            const nombre = l === 'casa' ? 'Casa' : 'Trabajo';
            return `<button class="lugar-rapido" data-lugar="${l}">
              <span class="lugar-ico">${icono(l === 'casa' ? 'casa' : 'maletin', { tamano: 18 })}</span>
              <span><b>${nombre}</b><small>${esc(lugar?.texto || 'Agregar')}</small></span>
            </button>`;
          })
          .join('')}
      </div>

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
        <li>
          <a class="categoria programar" href="#/programar">
            <span class="cat-ico" style="--cat:var(--marca);width:52px;height:52px">${icono('calendario', { tamano: 26 })}</span>
            <span>Programar</span>
          </a>
        </li>
      </ul>

      ${
        promo
          ? `<a class="promo" href="#/cupones">
              <span class="promo-ico">${icono('cupon', { tamano: 26 })}</span>
              <span><b>${esc(promo.titulo)}</b><small>Se aplica solo al confirmar · código ${esc(promo.codigo)}</small></span>
              ${icono('derecha', { tamano: 18 })}
            </a>`
          : `<a class="promo invitar" href="#/invitar">
              <span class="promo-ico">${icono('regalo', { tamano: 26 })}</span>
              <span><b>Invita y gana</b><small>Tus amigos reciben 20% en su primer camello</small></span>
              ${icono('derecha', { tamano: 18 })}
            </a>`
      }

      <section id="recientes"></section>

      <ul class="confianza">
        <li>${icono('escudo', { tamano: 20 })}<span>Código de seguridad para saber que es tu maestro</span></li>
        <li>${icono('billete', { tamano: 20 })}<span>Ves el precio antes de pedir</span></li>
        <li>${icono('check', { tamano: 20 })}<span>Pagas cuando el trabajo termina</span></li>
      </ul>
    </main>
    ${navInferior('inicio')}`;

  const elegir = (id) => {
    const b = borrador.nuevo(id);
    if (dir) borrador.guardar({ direccion: { texto: dir.texto, detalle: dir.detalle || '' } });
    ir(`/solicitud/${b.categoria}`);
  };
  raiz.querySelectorAll('[data-cat]').forEach((b) => b.addEventListener('click', () => elegir(b.dataset.cat)));

  // Casa / Trabajo: si ya existe, se usa como dirección; si no, se agrega
  raiz.querySelectorAll('[data-lugar]').forEach((b) =>
    b.addEventListener('click', () => {
      const l = b.dataset.lugar;
      if (!u.lugares[l]) return ir(`/lugares/${l}`);
      almacen.guardar(LUGAR, l);
      pantallaInicio(raiz);
    })
  );

  // Buscador: sugiere la categoría según lo que se escribe
  const q = raiz.querySelector('#q');
  const caja = raiz.querySelector('#sugerencias');
  q.addEventListener('input', () => {
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
  });
  q.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') caja.querySelector('[data-cat]')?.click();
  });

  // Volver a pedir: últimos servicios terminados, sin repetir categoría
  pedidos.delUsuario(u.id).then((lista) => {
    const caja = raiz.querySelector('#recientes');
    if (!caja) return;
    const vistos = new Set();
    const recientes = lista.filter((p) => etapaDe(p) === 'completado' && !vistos.has(p.categoria) && vistos.add(p.categoria)).slice(0, 2);
    if (!recientes.length) return;
    caja.innerHTML = `
      <h2 class="seccion-titulo">Volver a pedir</h2>
      <div class="recientes">
        ${recientes
          .map((p) => {
            const c = categoriaPorId(p.categoria);
            return `<button class="reciente" data-cat="${c.id}">${iconoCategoria(c, 40)}<span><b>${esc(c.nombreCorto || c.nombre)}</b><small>${esc(p.descripcion)}</small></span><small class="tenue">${dinero(p.precio.total)}</small></button>`;
          })
          .join('')}
      </div>`;
    caja.querySelectorAll('[data-cat]').forEach((b) => b.addEventListener('click', () => elegir(b.dataset.cat)));
  });

  return montarPedidoActivo(raiz.querySelector('#activo'));
}
