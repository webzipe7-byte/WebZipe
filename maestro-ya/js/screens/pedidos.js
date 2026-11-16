/**
 * Historial de pedidos.
 */
import { pedidos, estadoDe, etapaDe, ESTADOS } from '../services/pedidos.js';
import { trabajadores } from '../services/trabajadores.js';
import { categoriaPorId } from '../data/categorias.js';
import { sesion } from '../estado.js';
import { navInferior, iconoCategoria, esqueletoTarjetas, vacio, errorVista } from '../ui/componentes.js';
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
      ul.innerHTML = lista
        .map((p) => {
          const cat = categoriaPorId(p.categoria);
          const t = trabajadores.buscarLocal(p.trabajadorId);
          const [estado, color] = etiquetaEstado(p);
          return `
          <li>
            <a class="tarjeta pedido-item" href="#/pedido/${p.id}">
              ${iconoCategoria(cat, 44)}
              <span class="pedido-info">
                <b>${esc(cat.nombreCorto || cat.nombre)}</b>
                <small class="tenue">${esc(t ? `${t.nombre} ${t.apellido}` : '')} · ${esc(fechaHora(p.creado))}</small>
                <span class="etiqueta etiqueta-${color}">${esc(estado)}</span>
              </span>
              <span class="pedido-valor">${dinero(p.precio.total)}${icono('derecha', { tamano: 18 })}</span>
            </a>
          </li>`;
        })
        .join('');
    } catch (err) {
      ul.innerHTML = `<li>${errorVista(err.message)}</li>`;
      ul.querySelector('[data-accion="reintentar"]').addEventListener('click', cargar);
    }
  }

  cargar();
  return montarPedidoActivo(raiz.querySelector('#activo'));
}
