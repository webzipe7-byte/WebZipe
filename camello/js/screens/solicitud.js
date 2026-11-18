/**
 * Nueva solicitud en 3 pasos: ¿Qué pasó? → ¿Dónde? → ¿Cuándo?
 * Cada paso tiene una sola acción principal ("Continuar").
 */
import { categoriaPorId } from '../data/categorias.js';
import { borrador, sesion } from '../estado.js';
import { ir } from '../router.js';
import { barra, pasos, iconoCategoria, campo, marcarError, cargando } from '../ui/componentes.js';
import { icono } from '../ui/iconos.js';
import { esc, fecha } from '../ui/formato.js';
import { RECARGO_URGENCIA } from '../config.js';
import { miUbicacion } from '../services/ubicacion.js';
import { direccionDe } from '../services/geocodificar.js';
import { campoDireccion, activarDireccion, ubicarConMapa, puntoConfiable } from '../ui/campo-direccion.js';
import { ciudadMasCercana, ciudadPorId } from '../data/ciudades.js';
import { campoCiudad, activarCiudades, ponerCiudad } from '../ui/selector-ciudad.js';
import { auth } from '../services/auth.js';
import { realtime } from '../services/nube.js';

/** Guarda el punto confirmado en la dirección guardada (Casa, Trabajo o reciente) para no volver a pedirlo. */
function guardarPuntoDe(d, coords) {
  const mismo = (x) => x && x.texto === d.texto && (x.detalle || '') === (d.detalle || '');
  sesion.set(
    auth.modificar(sesion.usuario.id, (u) => {
      ['casa', 'trabajo'].forEach((k) => mismo(u.lugares?.[k]) && (u.lugares[k].coords = coords));
      (u.direcciones || []).forEach((x) => mismo(x) && (x.coords = coords));
    })
  );
}

/** Casa, Trabajo y direcciones recientes, sin repetir. */
function direccionesGuardadas(u) {
  const lista = [];
  const agregar = (d, etiqueta) => {
    if (d && !lista.some((x) => x.texto.toLowerCase() === d.texto.toLowerCase())) lista.push({ ...d, etiqueta });
  };
  agregar(u?.lugares?.casa, 'Casa');
  agregar(u?.lugares?.trabajo, 'Trabajo');
  (u?.direcciones || []).forEach((d) => agregar(d, ''));
  return lista;
}

const ETIQUETAS = ['¿Qué pasó?', '¿Dónde?', '¿Cuándo?'];
/** Fecha en formato AAAA-MM-DD según la hora local (toISOString usa UTC y puede cambiar el día). */
const fechaLocal = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const HORAS = ['08:00', '09:00', '10:00', '11:00', '12:00', '14:00', '15:00', '16:00', '17:00', '18:00'];

export function pantallaSolicitud(raiz, { categoria }) {
  const cat = categoriaPorId(categoria);
  if (!cat) return ir('/inicio', { reemplazar: true });

  let b = borrador.leer();
  let dir = null; // campo de dirección del paso 2
  if (!b || b.categoria !== categoria) b = borrador.nuevo(categoria);
  let paso = b.paso || 1;

  const irPaso = (n) => {
    paso = n;
    borrador.guardar({ paso });
    pintar();
    window.scrollTo(0, 0);
  };

  function pintar() {
    b = borrador.leer();
    raiz.innerHTML = `
      ${barra(cat.nombreCorto || cat.nombre)}
      <main class="contenido con-pie">
        ${pasos(paso, 3, ETIQUETAS[paso - 1])}
        <form class="formulario" novalidate>
          ${paso === 1 ? pasoQue() : paso === 2 ? pasoDonde() : pasoCuando()}
        </form>
      </main>
      <div class="pie-fijo">
        <button class="btn btn-primario btn-bloque" data-accion="continuar">${paso < 3 ? 'Continuar' : 'Ver maestros disponibles'}</button>
      </div>`;

    raiz.querySelector('[data-accion="atras"]').addEventListener('click', () => (paso > 1 ? irPaso(paso - 1) : ir('/inicio')));
    raiz.querySelector('[data-accion="continuar"]').addEventListener('click', continuar);
    raiz.querySelector('form').addEventListener('submit', (e) => {
      e.preventDefault();
      continuar();
    });
    activarPaso();
  }

  /* ---------- Paso 1: descripción ---------- */
  function pasoQue() {
    return `
      <div class="paso-cabeza">
        ${iconoCategoria(cat, 44)}
        <h1 tabindex="-1">Cuéntanos qué pasó</h1>
      </div>
      <p class="intro">Toca una opción o escríbelo con tus palabras.</p>
      <div class="chips" role="group" aria-label="Problemas frecuentes">
        ${cat.sugerencias.map((s) => `<button type="button" class="chip${b.descripcion === s ? ' activo' : ''}" data-sug="${esc(s)}">${esc(s)}</button>`).join('')}
      </div>
      <div class="campo" data-campo="descripcion">
        <label for="f-descripcion">Describe el problema</label>
        <textarea id="f-descripcion" name="descripcion" rows="4" maxlength="400" placeholder="Ej: la llave gira pero la puerta no abre" aria-describedby="e-descripcion">${esc(b.descripcion || '')}</textarea>
        <p class="campo-error" id="e-descripcion" role="alert"></p>
      </div>`;
  }

  /* ---------- Paso 2: dirección ---------- */
  function pasoDonde() {
    const guardadas = direccionesGuardadas(sesion.usuario);
    const elegida = b.direccion;
    const esGuardada = (d) => elegida && d.texto === elegida.texto && (d.detalle || '') === (elegida.detalle || '');
    // Si no ha elegido nada, se propone la última dirección usada
    if (!elegida && guardadas.length) {
      b = borrador.guardar({ direccion: guardadas[0] });
      return pasoDonde();
    }
    const usarNueva = !elegida || !guardadas.some(esGuardada);
    const ciudad = b.ciudad || elegida?.ciudad || sesion.usuario?.ciudad || '';
    return `
      <h1 tabindex="-1">¿A dónde debe llegar el maestro?</h1>
      ${campoCiudad({ valor: ciudad, etiqueta: 'Ciudad del servicio', conGps: true })}
      ${
        guardadas.length
          ? `<div class="opciones" role="radiogroup" aria-label="Direcciones guardadas">
              ${guardadas
                .map(
                  (d, i) => `
                <label class="opcion">
                  <input type="radio" name="dir" value="${i}" ${esGuardada(d) ? 'checked' : ''}>
                  <span class="opcion-caja">${icono(d.etiqueta === 'Casa' ? 'casa' : d.etiqueta === 'Trabajo' ? 'maletin' : 'ubicacion')}<span><b>${esc(d.etiqueta || d.texto)}</b><small>${esc(d.etiqueta ? d.texto : '')}${d.detalle ? `${d.etiqueta ? ' · ' : ''}${esc(d.detalle)}` : ''}</small></span></span>
                </label>`
                )
                .join('')}
              <label class="opcion">
                <input type="radio" name="dir" value="nueva" ${usarNueva ? 'checked' : ''}>
                <span class="opcion-caja">${icono('mas')}<span><b>Otra dirección</b></span></span>
              </label>
            </div>`
          : ''
      }
      <div class="nueva-dir" ${guardadas.length && !usarNueva ? 'hidden' : ''}>
        <button type="button" class="btn-gps${b.gps ? ' listo' : ''}" data-accion="gps">
          ${icono('ubicacion', { tamano: 22 })}
          <span>${b.gps ? 'Ubicación lista' : 'Usar mi ubicación actual'}<small>${b.gps ? 'El maestro verá tu punto exacto en el mapa' : 'Para que el maestro llegue sin perderse'}</small></span>
        </button>
        ${campoDireccion({ valor: usarNueva ? elegida?.texto || '' : '' })}
        ${campo({ id: 'detalle', etiqueta: 'Apto, casa o referencia (opcional)', valor: usarNueva ? elegida?.detalle || '' : '' })}
      </div>`;
  }

  /* ---------- Paso 3: cuándo ---------- */
  function pasoCuando() {
    const c = b.cuando || { tipo: 'urgente' };
    const dias = [0, 1, 2].map((n) => {
      const d = new Date();
      d.setDate(d.getDate() + n);
      return { valor: fechaLocal(d), nombre: n === 0 ? 'Hoy' : n === 1 ? 'Mañana' : fecha(d, { weekday: 'short', day: 'numeric' }) };
    });
    const ahora = new Date();
    const horasHoy = HORAS.filter((h) => Number(h.slice(0, 2)) > ahora.getHours() + 1);
    const dia = c.dia || (horasHoy.length ? dias[0].valor : dias[1].valor);
    const horas = dia === dias[0].valor ? horasHoy : HORAS;

    return `
      <h1 tabindex="-1">¿Cuándo lo necesitas?</h1>
      <div class="opciones grandes" role="radiogroup" aria-label="Cuándo">
        <label class="opcion">
          <input type="radio" name="tipo" value="urgente" ${c.tipo === 'urgente' ? 'checked' : ''}>
          <span class="opcion-caja">
            <span class="opcion-ico urgente">${icono('urgente')}</span>
            <span><b>Lo antes posible</b><small>Llega en 15 a 40 minutos · recargo del ${Math.round(RECARGO_URGENCIA * 100)}%</small></span>
          </span>
        </label>
        <label class="opcion">
          <input type="radio" name="tipo" value="programado" ${c.tipo === 'programado' ? 'checked' : ''}>
          <span class="opcion-caja">
            <span class="opcion-ico">${icono('calendario')}</span>
            <span><b>Programar</b><small>Elige el día y la hora · sin recargo</small></span>
          </span>
        </label>
      </div>
      <div class="programar" ${c.tipo === 'programado' ? '' : 'hidden'}>
        <p class="etiqueta-grupo">Día</p>
        <div class="chips" role="radiogroup" aria-label="Día">
          ${dias.map((d) => `<button type="button" class="chip${d.valor === dia ? ' activo' : ''}" data-dia="${d.valor}" ${d.valor === dias[0].valor && !horasHoy.length ? 'disabled' : ''}>${esc(d.nombre)}</button>`).join('')}
        </div>
        <p class="etiqueta-grupo">Hora</p>
        <div class="chips horas" role="radiogroup" aria-label="Hora">
          ${horas.map((h) => `<button type="button" class="chip${c.hora === h && c.dia === dia ? ' activo' : ''}" data-hora="${h}">${h}</button>`).join('')}
        </div>
        <p class="campo-error" id="e-hora" role="alert"></p>
      </div>`;
  }

  function activarPaso() {
    if (paso === 1) {
      const ta = raiz.querySelector('textarea');
      raiz.querySelectorAll('[data-sug]').forEach((ch) =>
        ch.addEventListener('click', () => {
          ta.value = ch.dataset.sug;
          raiz.querySelectorAll('[data-sug]').forEach((x) => x.classList.toggle('activo', x === ch));
          marcarError(raiz, 'descripcion', '');
        })
      );
      ta.addEventListener('input', () => borrador.guardar({ descripcion: ta.value }));
    }

    if (paso === 2) {
      const nueva = raiz.querySelector('.nueva-dir');
      const selCiudad = raiz.querySelector('#f-ciudad');
      activarCiudades(raiz);
      const elegida = borrador.leer().direccion;
      dir = activarDireccion(raiz, {
        ciudad: () => selCiudad.value,
        punto: b.gps || (elegida && !raiz.querySelector('[name="dir"]:checked:not([value="nueva"])') ? elegida.coords : null),
        alCambiarCiudad: (id) => ponerCiudad(selCiudad, id),
      });
      selCiudad.addEventListener('change', () => {
        b = borrador.guardar({ ciudad: selCiudad.value });
        marcarError(raiz, 'ciudad', '');
      });
      raiz.querySelectorAll('[name="dir"]').forEach((r) =>
        r.addEventListener('change', () => {
          nueva.hidden = r.value !== 'nueva';
          if (r.value === 'nueva') raiz.querySelector('#f-direccion').focus();
          // Una dirección guardada ya sabe su ciudad
          const d = r.value !== 'nueva' && direccionesGuardadas(sesion.usuario)[Number(r.value)];
          if (d?.ciudad) ponerCiudad(selCiudad, d.ciudad);
        })
      );
      const gps = raiz.querySelector('[data-accion="gps"]');
      gps.addEventListener('click', async () => {
        gps.disabled = true;
        gps.querySelector('span').firstChild.textContent = 'Buscando tu ubicación…';
        try {
          const punto = await miUbicacion();
          // Con el GPS también se sabe la ciudad
          const cerca = ciudadMasCercana(punto);
          const gpsPunto = { lat: punto.lat, lng: punto.lng, fuente: 'gps' };
          b = borrador.guardar({ gps: gpsPunto, ...(cerca ? { ciudad: cerca.id } : {}) });
          if (cerca) ponerCiudad(raiz.querySelector('#f-ciudad'), cerca.id);
          // Se escribe la dirección real del punto (la persona puede corregirla)
          const texto = (await direccionDe(punto)) || raiz.querySelector('#f-direccion').value.trim() || 'Mi ubicación actual';
          dir.ponerPunto(gpsPunto, texto);
          gps.classList.add('listo');
          gps.querySelector('span').innerHTML = 'Ubicación lista<small>El maestro verá tu punto exacto en el mapa</small>';
          marcarError(raiz, 'direccion', '');
        } catch (err) {
          gps.querySelector('span').innerHTML = `Usar mi ubicación actual<small>${esc(err.message)}</small>`;
        }
        gps.disabled = false;
      });
    }

    if (paso === 3) {
      const bloque = raiz.querySelector('.programar');
      raiz.querySelectorAll('[name="tipo"]').forEach((r) =>
        r.addEventListener('change', () => {
          const c = borrador.leer().cuando || {};
          borrador.guardar({ cuando: { ...c, tipo: r.value } });
          bloque.hidden = r.value !== 'programado';
        })
      );
      raiz.querySelectorAll('[data-dia]').forEach((d) =>
        d.addEventListener('click', () => {
          borrador.guardar({ cuando: { tipo: 'programado', dia: d.dataset.dia } });
          pintar();
        })
      );
      raiz.querySelectorAll('[data-hora]').forEach((h) =>
        h.addEventListener('click', () => {
          const c = borrador.leer().cuando || {};
          const dia = c.dia || raiz.querySelector('[data-dia].activo')?.dataset.dia;
          borrador.guardar({ cuando: { tipo: 'programado', dia, hora: h.dataset.hora } });
          raiz.querySelectorAll('[data-hora]').forEach((x) => x.classList.toggle('activo', x === h));
          raiz.querySelector('#e-hora').textContent = '';
        })
      );
    }
  }

  async function continuar() {
    if (paso === 1) {
      const texto = raiz.querySelector('textarea').value.trim();
      if (texto.length < 5) {
        marcarError(raiz, 'descripcion', 'Cuéntanos un poco más para que el maestro llegue preparado.');
        raiz.querySelector('textarea').focus();
        return;
      }
      borrador.guardar({ descripcion: texto });
      return irPaso(2);
    }

    if (paso === 2) {
      const ciudad = raiz.querySelector('#f-ciudad').value;
      if (!ciudadPorId(ciudad)) {
        marcarError(raiz, 'ciudad', 'Elige la ciudad donde necesitas el servicio.');
        raiz.querySelector('[data-selector-ciudad]').focus();
        return;
      }
      // La última ciudad usada queda como la de la persona (así ve en vivo a los maestros de ahí)
      if (sesion.usuario.ciudad !== ciudad) {
        sesion.set(auth.modificar(sesion.usuario.id, (u) => (u.ciudad = ciudad)));
        realtime.iniciar(ciudad);
      }
      const boton = raiz.querySelector('[data-accion="continuar"]');
      const sel = raiz.querySelector('[name="dir"]:checked');
      if (sel && sel.value !== 'nueva') {
        const d = direccionesGuardadas(sesion.usuario)[Number(sel.value)];
        let coords = puntoConfiable(d.coords) ? d.coords : null;
        if (!coords) {
          // Direcciones guardadas antes de esta versión: se confirman una vez en el mapa
          cargando(boton, true, 'Buscando la dirección…');
          coords = await ubicarConMapa(d.texto, ciudad);
          cargando(boton, false);
          if (!coords) return;
          guardarPuntoDe(d, coords);
        }
        borrador.guardar({ direccion: { texto: d.texto, detalle: d.detalle || '', ciudad, coords } });
        return irPaso(3);
      }
      const texto = raiz.querySelector('#f-direccion').value.trim();
      if (texto.length < 6 || texto.length > 120) {
        marcarError(raiz, 'direccion', 'Escribe la dirección completa, con número.');
        raiz.querySelector('#f-direccion').focus();
        return;
      }
      // Punto real: de la sugerencia elegida, del GPS o confirmado por la persona en el mapa
      cargando(boton, true, 'Buscando la dirección…');
      const coords = await dir.asegurar();
      cargando(boton, false);
      if (!coords) return;
      borrador.guardar({ direccion: { texto, detalle: raiz.querySelector('#f-detalle').value.trim(), ciudad, coords } });
      return irPaso(3);
    }

    // Paso 3
    const tipo = raiz.querySelector('[name="tipo"]:checked').value;
    if (tipo === 'programado') {
      const c = borrador.leer().cuando || {};
      const dia = c.dia || raiz.querySelector('[data-dia].activo')?.dataset.dia;
      if (!c.hora) {
        raiz.querySelector('#e-hora').textContent = 'Elige una hora.';
        return;
      }
      const [y, m, d] = dia.split('-').map(Number);
      const [hh, mm] = c.hora.split(':').map(Number);
      const cuando = new Date(y, m - 1, d, hh, mm).getTime();
      borrador.guardar({ cuando: { tipo, dia, hora: c.hora, fecha: cuando } });
    } else {
      borrador.guardar({ cuando: { tipo: 'urgente' } });
    }
    borrador.guardar({ paso: 3 });
    ir('/trabajadores');
  }

  pintar();
}
