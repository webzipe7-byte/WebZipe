/**
 * Lista de maestros disponibles y perfil de cada uno.
 */
import { trabajadores, ORDENES, cotizar } from '../services/trabajadores.js';
import { categoriaPorId, oficioDe } from '../data/categorias.js';
import { borrador, sesion } from '../estado.js';
import { ir, atras } from '../router.js';
import { barra, avatar, calificacion, esqueletoTarjetas, errorVista, estrellasFijas, vacio } from '../ui/componentes.js';
import { icono } from '../ui/iconos.js';
import { esc, dinero, fechaHora } from '../ui/formato.js';

/** Resumen corto de la solicitud que se está armando. */
export function resumenSolicitud(b) {
  const cuando = b.cuando?.tipo === 'programado' ? fechaHora(b.cuando.fecha) : 'Lo antes posible';
  return `
    <div class="resumen-mini">
      <span>${icono(b.cuando?.tipo === 'programado' ? 'calendario' : 'urgente', { tamano: 16 })}${esc(cuando)}</span>
      <span>${icono('ubicacion', { tamano: 16 })}${esc(b.direccion?.texto || '')}</span>
    </div>`;
}

export async function pantallaTrabajadores(raiz) {
  const b = borrador.leer();
  if (!b?.categoria || !b.direccion || !b.cuando) return ir('/inicio', { reemplazar: true });
  const cat = categoriaPorId(b.categoria);
  const urgente = b.cuando.tipo === 'urgente';
  let orden = 'cercano';
  let soloMaestras = !!b.soloMaestras;
  let lista = [];

  raiz.innerHTML = `
    ${barra(`${cat.plural} disponibles`)}
    <main class="contenido">
      ${resumenSolicitud(b)}
      <h1 class="oculto" tabindex="-1">Elige a tu maestro</h1>
      <div class="chips orden" role="radiogroup" aria-label="Ordenar">
        ${Object.entries(ORDENES).map(([id, o]) => `<button type="button" class="chip${id === orden ? ' activo' : ''}" data-orden="${id}" role="radio" aria-checked="${id === orden}">${esc(o.nombre)}</button>`).join('')}
      </div>
      <label class="interruptor">
        <span><b>Solo maestras</b><small>Muestra únicamente mujeres</small></span>
        <input type="checkbox" id="soloMaestras" ${soloMaestras ? 'checked' : ''}>
        <i aria-hidden="true"></i>
      </label>
      <p class="tenue pequeno">Precio estimado con visita incluida${urgente ? ' y recargo por urgencia' : ''}. Lo confirmas antes de pedir.</p>
      <ul class="lista" id="lista">${esqueletoTarjetas(4)}</ul>
    </main>`;

  raiz.querySelector('[data-accion="atras"]').addEventListener('click', () => {
    borrador.guardar({ paso: 3 });
    atras(`/solicitud/${b.categoria}`);
  });

  const ul = raiz.querySelector('#lista');

  const pintar = () => {
    const bloqueados = sesion.usuario.bloqueados || [];
    const visibles = lista.filter((t) => !bloqueados.includes(t.id) && (!soloMaestras || t.mujer));
    if (!visibles.length) {
      ul.innerHTML = soloMaestras
        ? `<li>${vacio({ icono: 'usuarios', titulo: 'No hay maestras libres ahora', texto: 'Quita el filtro o programa el servicio para otro momento.' })}</li>`
        : `<li>${vacio({ icono: 'buscar', titulo: 'No hay maestros libres ahora', texto: 'Prueba programar el servicio para otro momento.', accion: 'Cambiar horario', ruta: `#/solicitud/${b.categoria}` })}</li>`;
      return;
    }
    // Los maestros conectados ahora mismo van primero
    const ordenada = [...visibles].sort((x, y) => (y.enLinea ? 1 : 0) - (x.enLinea ? 1 : 0) || ORDENES[orden].fn(x, y));
    ul.innerHTML = ordenada
      .map(
        (t) => `
      <li>
        <a class="tarjeta trabajador" href="#/trabajador/${t.id}">
          ${avatar(t, 58)}
          <span class="trabajador-info">
            <b>${esc(t.nombre)} ${esc(t.apellido)}</b>
            ${t.enLinea ? '<span class="en-linea">En línea ahora</span>' : ''}
            <span class="fila-datos">${calificacion(t.calificacion)}<span>${t.trabajos} trabajos</span></span>
            <span class="fila-datos tenue">${String(t.distanciaKm).replace('.', ',')} km${urgente ? ` · llega en ${t.minutos} min` : ''}</span>
          </span>
          <span class="trabajador-precio"><small>Estimado</small><b>${dinero(t.precio.total)}</b></span>
        </a>
      </li>`
      )
      .join('');
  };

  raiz.querySelectorAll('[data-orden]').forEach((c) =>
    c.addEventListener('click', () => {
      orden = c.dataset.orden;
      raiz.querySelectorAll('[data-orden]').forEach((x) => {
        x.classList.toggle('activo', x === c);
        x.setAttribute('aria-checked', x === c);
      });
      pintar();
    })
  );

  raiz.querySelector('#soloMaestras').addEventListener('change', (e) => {
    soloMaestras = e.target.checked;
    borrador.guardar({ soloMaestras });
    if (lista.length) pintar();
  });

  async function cargar() {
    ul.innerHTML = esqueletoTarjetas(4);
    try {
      lista = await trabajadores.disponibles(b.categoria, { urgente, desde: b.direccion?.coords });
      pintar();
    } catch (err) {
      ul.innerHTML = `<li>${errorVista(err.message)}</li>`;
      ul.querySelector('[data-accion="reintentar"]').addEventListener('click', cargar);
    }
  }
  cargar();
}

export async function pantallaTrabajador(raiz, { id }) {
  const b = borrador.leer();
  if (!b?.categoria) return ir('/inicio', { reemplazar: true });
  const urgente = b.cuando?.tipo === 'urgente';

  raiz.innerHTML = `${barra('Perfil del maestro')}<main class="contenido"><ul class="lista">${esqueletoTarjetas(2)}</ul></main>`;
  raiz.querySelector('[data-accion="atras"]').addEventListener('click', () => atras('/trabajadores'));

  let t;
  try {
    t = await trabajadores.porId(id);
  } catch (err) {
    raiz.querySelector('main').innerHTML = errorVista(err.message);
    raiz.querySelector('[data-accion="reintentar"]').addEventListener('click', () => pantallaTrabajador(raiz, { id }));
    return;
  }
  const cat = categoriaPorId(t.categoria);
  const precio = cotizar(t, { urgente });

  raiz.innerHTML = `
    ${barra(t.mujer ? 'Perfil de la maestra' : 'Perfil del maestro')}
    <main class="contenido con-pie">
      <section class="perfil-cabeza">
        ${avatar(t, 92)}
        <h1 tabindex="-1">${esc(t.nombre)} ${esc(t.apellido)}</h1>
        <p class="tenue">${esc(oficioDe(t))}${t.verificado ? ` · <span class="ok">${icono('escudo', { tamano: 15 })} Verificado</span>` : ''}</p>
      </section>

      <ul class="metricas">
        <li><b>${icono('estrella', { tamano: 16, relleno: true })} ${t.calificacion.toFixed(1)}</b><span>Calificación</span></li>
        <li><b>${t.trabajos}</b><span>Trabajos</span></li>
        <li><b>${t.anios} años</b><span>Experiencia</span></li>
      </ul>

      <section class="bloque">
        <h2>Especialidades</h2>
        <div class="chips estaticos">${t.especialidades.map((e) => `<span class="chip">${esc(e)}</span>`).join('')}</div>
      </section>

      <section class="bloque">
        <h2>Precio estimado</h2>
        <dl class="desglose">
          ${precio.visita ? `<div><dt>Visita</dt><dd>${dinero(precio.visita)}</dd></div>` : ''}
          <div><dt>Mano de obra estimada</dt><dd>${dinero(precio.manoObra)}</dd></div>
          ${precio.recargo ? `<div><dt>Recargo por urgencia</dt><dd>${dinero(precio.recargo)}</dd></div>` : ''}
          <div class="total"><dt>Total estimado</dt><dd>${dinero(precio.total)}</dd></div>
        </dl>
        <p class="tenue pequeno">Si hacen falta repuestos, el maestro te los cotiza antes de comprarlos.</p>
      </section>

      <section class="bloque">
        <h2>Lo que dicen sus clientes</h2>
        ${t.resenas.length ? '' : '<p class="tenue">Todavía no tiene reseñas. ¡Puedes ser su primer cliente!</p>'}
        <ul class="resenas">
          ${t.resenas
            .map(
              (r) => `
            <li>
              <div class="resena-cabeza"><b>${esc(r.cliente)}</b>${estrellasFijas(r.estrellas)}<span class="tenue">${esc(r.hace)}</span></div>
              <p>${esc(r.texto)}</p>
            </li>`
            )
            .join('')}
        </ul>
      </section>
    </main>
    <div class="pie-fijo">
      <button class="btn btn-primario btn-bloque" data-accion="elegir">Solicitar a ${esc(t.nombre.split(' ')[0])} · ${dinero(precio.total)}</button>
    </div>`;

  raiz.querySelector('[data-accion="atras"]').addEventListener('click', () => atras('/trabajadores'));
  raiz.querySelector('[data-accion="elegir"]').addEventListener('click', () => {
    borrador.guardar({ trabajadorId: t.id });
    ir('/confirmar');
  });
}
