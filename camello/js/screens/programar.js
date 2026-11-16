/**
 * Programar un servicio: primero se elige el servicio y la solicitud
 * abre con "Programar" ya marcado.
 */
import { CATEGORIAS } from '../data/categorias.js';
import { borrador, sesion } from '../estado.js';
import { ir, atras } from '../router.js';
import { barra, iconoCategoria } from '../ui/componentes.js';
import { icono } from '../ui/iconos.js';
import { esc } from '../ui/formato.js';

export function pantallaProgramar(raiz) {
  raiz.innerHTML = `
    ${barra('Programar un servicio')}
    <main class="contenido">
      <h1 tabindex="-1">¿Qué servicio quieres programar?</h1>
      <p class="intro">Elige el día y la hora en el último paso. Programar no tiene recargo.</p>
      <ul class="lista">
        ${CATEGORIAS.map(
          (c) => `<li><button class="tarjeta fila-opcion" data-cat="${c.id}">${iconoCategoria(c, 44)}<b>${esc(c.nombre)}</b>${icono('derecha', { tamano: 18 })}</button></li>`
        ).join('')}
      </ul>
    </main>`;
  raiz.querySelector('[data-accion="atras"]').addEventListener('click', () => atras('/inicio'));
  raiz.querySelectorAll('[data-cat]').forEach((b) =>
    b.addEventListener('click', () => {
      borrador.nuevo(b.dataset.cat);
      const d = sesion.usuario.direcciones?.[0];
      borrador.guardar({ cuando: { tipo: 'programado' }, ...(d ? { direccion: d } : {}) });
      ir(`/solicitud/${b.dataset.cat}`);
    })
  );
}
