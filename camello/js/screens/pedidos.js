/**
 * Historial de pedidos.
 */
import { pedidos, estadoDe, etapaDe, ESTADOS } from '../services/pedidos.js';
import { trabajadores } from '../services/trabajadores.js';
import { categoriaPorId } from '../data/categorias.js';
import { sesion } from '../estado.js';
import { navInferior, barra, iconoCategoria, esqueletoTarjetas, vacio, errorVista } from '../ui/componentes.js';
import { desglosePrecio } from '../ui/precio.js';
import { logo } from '../ui/logo.js';
import { ir, atras } from '../router.js';
import { montarPedidoActivo } from '../ui/pedido-activo.js';
import { icono } from '../ui/iconos.js';
import { esc, dinero, fechaHora } from '../ui/formato.js';

function etiquetaEstado(p) {
  const etapa = etapaDe(p);
  if (etapa === 'cancelado') return ['Cancelado', 'gris'];
  if (etapa === 'completado') return ['Completado', 'verde'];
  if (etapa === 'por_pagar') return ['Por pagar', 'naranja'];
  if (etapa === 'por_calificar') return ['Por calificar', 'naranja'];
  const e = estadoDe(p);
  if (e.id === 'agendado') return ['Programado', 'azul'];
  return [ESTADOS[e.indice].nombre, 'azul'];
}

export function pantallaPedidos(raiz) {
  raiz.innerHTML = `
    <main class="contenido con-nav">
      <header class="seccion-cabeza"><h1 tabindex="-1">Mis pedidos</h1></header>
      <div id="activo"></div>
      <ul class="lista" id="lista">${esqueletoTarjetas(3)}</ul>
    </main>
    ${navInferior('pedidos')}`;

  const ul = raiz.querySelector('#lista');

  async function cargar() {
    ul.innerHTML = esqueletoTarjetas(3);
    try {
      const lista = await pedidos.delUsuario(sesion.usuario.id);
      if (!lista.length) {
        ul.innerHTML = `<li>${vacio({ icono: 'pedidos', titulo: 'Aún no tienes pedidos', texto: 'Cuando pidas tu primer servicio, lo verás aquí con todo su detalle.', accion: 'Pedir un servicio', ruta: '#/inicio' })}</li>`;
        return;
      }
      // Se muestran de a 20 para que el historial abra rápido aunque haya muchos pedidos
      let mostrados = 0;
      const tarjeta = (p) => {
        const cat = categoriaPorId(p.categoria);
        const t = trabajadores.buscarLocal(p.trabajadorId);
        if (!cat || !t || !p.precio) return '';
        const [estado, color] = etiquetaEstado(p);
        return `
          <li>
            <a class="tarjeta pedido-item" href="#/pedido/${encodeURIComponent(p.id)}">
              ${iconoCategoria(cat, 44)}
              <span class="pedido-info">
                <b>${esc(cat.nombreCorto || cat.nombre)}</b>
                <small class="tenue">${esc(`${t.nombre} ${t.apellido}`)} · ${esc(fechaHora(p.creado))}</small>
                <span class="etiqueta etiqueta-${color}">${esc(estado)}</span>
              </span>
              <span class="pedido-valor">${dinero(p.precio.total)}${icono('derecha', { tamano: 18 })}</span>
            </a>
          </li>`;
      };
      const mas = () => {
        ul.querySelector('.ver-mas')?.remove();
        ul.insertAdjacentHTML('beforeend', lista.slice(mostrados, mostrados + 20).map(tarjeta).join(''));
        mostrados += 20;
        if (mostrados < lista.length) {
          ul.insertAdjacentHTML('beforeend', `<li class="ver-mas"><button class="btn btn-secundario btn-bloque">Ver más pedidos (${lista.length - mostrados})</button></li>`);
          ul.querySelector('.ver-mas button').addEventListener('click', mas);
        }
      };
      ul.innerHTML = '';
      mas();
    } catch (err) {
      ul.innerHTML = `<li>${errorVista(err.message)}</li>`;
      ul.querySelector('[data-accion="reintentar"]').addEventListener('click', cargar);
    }
  }

  cargar();
  return montarPedidoActivo(raiz.querySelector('#activo'));
}

/** Recibo de un servicio pagado. */
export function pantallaRecibo(raiz, { id }) {
  const p = pedidos.obtener(id);
  if (!p?.pago) return ir(`/pedido/${id}`, { reemplazar: true });
  const cat = categoriaPorId(p.categoria);
  const t = trabajadores.buscarLocal(p.trabajadorId);

  raiz.innerHTML = `
    ${barra('Recibo')}
    <main class="contenido">
      <section class="recibo tarjeta">
        <header class="recibo-cabeza">
          ${logo(40)}
          <div><b>Camello</b><small class="tenue">Recibo del pedido #${esc(p.numero)}</small></div>
        </header>
        <h1 tabindex="-1" class="monto">${dinero(p.pago.total)}</h1>
        <p class="tenue centro">${esc(fechaHora(p.pago.fecha))} · ${esc(p.pago.metodoNombre)}</p>
        <ul class="detalle-lista">
          <li>${icono(cat.icono, { tamano: 20 })}<span><small>Servicio</small>${esc(cat.nombre)} · ${esc(p.descripcion)}</span></li>
          <li>${icono('perfil', { tamano: 20 })}<span><small>Maestro</small>${esc(t.nombre)} ${esc(t.apellido)}</span></li>
          <li>${icono('ubicacion', { tamano: 20 })}<span><small>Dirección</small>${esc(p.direccion.texto)}${p.direccion.detalle ? ` · ${esc(p.direccion.detalle)}` : ''}</span></li>
        </ul>
        ${desglosePrecio(p)}
        <p class="nota-demo">Comprobante del servicio. No es una factura electrónica.</p>
      </section>
      <button class="btn btn-secundario btn-bloque" data-accion="imprimir">${icono('descargar', { tamano: 18 })} Guardar o imprimir</button>
    </main>`;
  raiz.querySelector('[data-accion="atras"]').addEventListener('click', () => atras(`/pedido/${id}`));
  raiz.querySelector('[data-accion="imprimir"]').addEventListener('click', () => window.print());
}
