/**
 * Aviso fijo con el pedido en curso. Se muestra en Inicio, Pedidos y Perfil
 * para que la persona siempre sepa en qué paso va su servicio.
 */
import { pedidos, estadoDe, etapaDe, ESTADOS } from '../services/pedidos.js';
import { categoriaPorId } from '../data/categorias.js';
import { iconoCategoria } from './componentes.js';
import { icono } from './iconos.js';
import { esc } from './formato.js';
import { sesion } from '../estado.js';

function texto(pedido) {
  const etapa = etapaDe(pedido);
  if (etapa === 'por_pagar') return { titulo: 'Servicio terminado', sub: 'Toca para pagar', ruta: `#/pagar/${pedido.id}` };
  if (etapa === 'por_calificar') return { titulo: 'Califica tu servicio', sub: 'Tu opinión ayuda a otros', ruta: `#/calificar/${pedido.id}` };
  const e = estadoDe(pedido);
  if (e.id === 'agendado') return { titulo: 'Servicio programado', sub: 'Toca para ver el detalle', ruta: `#/pedido/${pedido.id}` };
  const nombre = ESTADOS[e.indice].nombre;
  return { titulo: nombre, sub: `Paso ${e.indice + 1} de ${ESTADOS.length} · Toca para ver`, ruta: `#/pedido/${pedido.id}` };
}

/** Pinta el aviso dentro de `contenedor` y lo mantiene actualizado. Devuelve la función de limpieza. */
export function montarPedidoActivo(contenedor) {
  if (!contenedor || !sesion.usuario) return () => {};

  const pintar = () => {
    const p = pedidos.activoDe(sesion.usuario.id);
    if (!p) {
      contenedor.innerHTML = '';
      return;
    }
    const t = texto(p);
    const cat = categoriaPorId(p.categoria);
    const e = estadoDe(p);
    const progreso = e.id === 'agendado' ? 0 : Math.min(1, (e.indice + e.avance) / (ESTADOS.length - 1));
    contenedor.innerHTML = `
      <a class="activo-aviso" href="${t.ruta}">
        ${iconoCategoria(cat, 40)}
        <span class="activo-texto">
          <b>${esc(t.titulo)}</b>
          <small>${esc(cat.nombreCorto || cat.nombre)} · ${esc(t.sub)}</small>
        </span>
        ${icono('derecha', { tamano: 20 })}
        <span class="activo-progreso" style="--p:${(progreso * 100).toFixed(1)}%"></span>
      </a>`;
  };

  pintar();
  const intervalo = setInterval(pintar, 1000);
  return () => clearInterval(intervalo);
}
