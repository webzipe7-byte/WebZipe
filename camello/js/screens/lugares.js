/**
 * Lugares: elegir dónde se pide el servicio y guardar Casa y Trabajo.
 */
import { auth } from '../services/auth.js';
import { almacen } from '../services/almacen.js';
import { sesion } from '../estado.js';
import { ir, atras } from '../router.js';
import { barra, campo, marcarError, cargando, aviso } from '../ui/componentes.js';
import { icono } from '../ui/iconos.js';
import { esc } from '../ui/formato.js';

const NOMBRES = { casa: 'Casa', trabajo: 'Trabajo' };

export function pantallaLugares(raiz) {
  const u = sesion.usuario;
  const elegido = almacen.leer('lugarInicio');

  const fila = (clave, ico, titulo, d, activo) => `
    <li>
      <button class="tarjeta fila-opcion${activo ? ' elegida' : ''}" data-elegir="${clave}">
        <span class="lugar-ico">${icono(ico, { tamano: 18 })}</span>
        <span class="fila-texto"><b>${esc(titulo)}</b><small>${esc(d ? d.texto + (d.detalle ? ' · ' + d.detalle : '') : 'Agregar dirección')}</small></span>
        ${activo ? icono('check', { tamano: 20, clase: 'ok' }) : ''}
      </button>
      ${NOMBRES[clave] && d ? `<a class="fila-editar" href="#/lugares/${clave}" aria-label="Editar ${titulo}">${icono('editar', { tamano: 18 })}</a>` : ''}
    </li>`;

  raiz.innerHTML = `
    ${barra('¿Dónde es el servicio?')}
    <main class="contenido">
      <h1 class="oculto" tabindex="-1">¿Dónde es el servicio?</h1>
      <ul class="lista lugares">
        ${fila('casa', 'casa', 'Casa', u.lugares.casa, elegido === 'casa' && u.lugares.casa)}
        ${fila('trabajo', 'maletin', 'Trabajo', u.lugares.trabajo, elegido === 'trabajo' && u.lugares.trabajo)}
      </ul>
      ${
        u.direcciones?.length
          ? `<h2 class="seccion-titulo">Recientes</h2>
            <ul class="lista lugares">${u.direcciones.map((d, i) => fila('r' + i, 'reloj', d.texto, { texto: d.detalle || 'Usada antes' }, !elegido && i === 0)).join('')}</ul>`
          : ''
      }
      <p class="nota-demo">También puedes escribir otra dirección cuando pidas el servicio.</p>
    </main>`;

  raiz.querySelector('[data-accion="atras"]').addEventListener('click', () => atras('/inicio'));
  raiz.querySelectorAll('[data-elegir]').forEach((b) =>
    b.addEventListener('click', () => {
      const c = b.dataset.elegir;
      if (NOMBRES[c]) {
        if (!u.lugares[c]) return ir(`/lugares/${c}`);
        almacen.guardar('lugarInicio', c);
      } else {
        // Una dirección reciente pasa a ser la primera
        auth.recordarDireccion(u.id, u.direcciones[Number(c.slice(1))]);
        sesion.set(auth.usuarioActual());
        almacen.borrar('lugarInicio');
      }
      ir('/inicio', { reemplazar: true });
    })
  );
}

export function pantallaEditarLugar(raiz, { tipo }) {
  if (!NOMBRES[tipo]) return ir('/lugares', { reemplazar: true });
  const actual = sesion.usuario.lugares[tipo];

  raiz.innerHTML = `
    ${barra(NOMBRES[tipo])}
    <main class="contenido">
      <h1 tabindex="-1">${actual ? 'Editar' : 'Agregar'} ${NOMBRES[tipo].toLowerCase()}</h1>
      <p class="intro">La usaremos cuando pidas un servicio en ${tipo === 'casa' ? 'tu casa' : 'tu trabajo'}.</p>
      <form class="formulario" novalidate>
        ${campo({ id: 'direccion', etiqueta: 'Dirección', valor: actual?.texto || '', auto: 'street-address', ayuda: 'Ej: Calle 5 # 38-20, San Fernando' })}
        ${campo({ id: 'detalle', etiqueta: 'Apto, casa o referencia (opcional)', valor: actual?.detalle || '' })}
        <button class="btn btn-primario btn-bloque" type="submit">Guardar</button>
        ${actual ? '<button class="btn btn-texto peligro btn-bloque" type="button" data-accion="borrar">Quitar esta dirección</button>' : ''}
      </form>
    </main>`;

  const form = raiz.querySelector('form');
  raiz.querySelector('[data-accion="atras"]').addEventListener('click', () => atras('/lugares'));

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const texto = form.direccion.value.trim();
    if (texto.length < 6 || texto.length > 120) {
      marcarError(form, 'direccion', 'Escribe la dirección completa, con número.');
      return form.direccion.focus();
    }
    const boton = form.querySelector('[type="submit"]');
    cargando(boton, true, 'Guardando…');
    await new Promise((r) => setTimeout(r, 400));
    sesion.set(
      auth.modificar(sesion.usuario.id, (u) => {
        u.lugares[tipo] = { texto, detalle: form.detalle.value.trim() };
      })
    );
    almacen.guardar('lugarInicio', tipo);
    aviso(`${NOMBRES[tipo]} guardada.`, 'exito');
    ir('/inicio', { reemplazar: true });
  });

  form.querySelector('[data-accion="borrar"]')?.addEventListener('click', () => {
    sesion.set(auth.modificar(sesion.usuario.id, (u) => (u.lugares[tipo] = null)));
    if (almacen.leer('lugarInicio') === tipo) almacen.borrar('lugarInicio');
    ir('/lugares', { reemplazar: true });
  });
}
