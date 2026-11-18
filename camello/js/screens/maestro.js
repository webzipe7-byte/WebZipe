/**
 * App del maestro: conectarse, recibir solicitudes, aceptar, ir hasta el
 * cliente con el mapa, confirmar la llegada con el código y terminar el trabajo.
 * Usa la misma base de datos que el cliente: lo que hace uno lo ve el otro.
 */
import { pedidos, estadoDe, etapaDe } from '../services/pedidos.js';
import { auth, usuarioPublico } from '../services/auth.js';
import { fichaMaestro } from '../services/trabajadores.js';
import { chat } from '../services/chat.js';
import { seguirMaestro, posicionEnVivo, distanciaKm } from '../services/ubicacion.js';
import { categoriaPorId } from '../data/categorias.js';
import { ciudadPorId, opcionesCiudad } from '../data/ciudades.js';
import { realtime } from '../services/nube.js';
import { almacen } from '../services/almacen.js';
import { sesion } from '../estado.js';
import { ir, atras } from '../router.js';
import { barra, avatar, vacio, aviso, cargando, iconoCategoria } from '../ui/componentes.js';
import { icono } from '../ui/iconos.js';
import { esc, dinero, fechaHora, fechaFrase, primerNombre, saludo } from '../ui/formato.js';
import { mapaReal, moverMarcas, puntoCliente, puntoMaestro } from '../ui/mapa-real.js';

/** Navegación inferior de la app del maestro. */
function navMaestro(activa) {
  const items = [
    ['inicio', 'Inicio', '#/maestro', 'inicio'],
    ['trabajos', 'Trabajos', '#/maestro/trabajos', 'pedidos'],
    ['cuenta', 'Cuenta', '#/maestro/cuenta', 'perfil'],
  ];
  return `
    <nav class="nav" aria-label="Secciones">
      ${items
        .map(
          ([id, nombre, ruta, ic]) => `
        <a href="${ruta}" class="nav-item${activa === id ? ' activo' : ''}" ${activa === id ? 'aria-current="page"' : ''}>${icono(ic)}<span>${nombre}</span></a>`
        )
        .join('')}
    </nav>`;
}

const yo = () => sesion.refrescar();

/** Lo que gana el maestro con un pedido (servicio + propina). */
const ganancia = (p) => (p.pago ? p.pago.total : p.precio?.total || 0);

const esHoy = (ms) => new Date(ms).toDateString() === new Date().toDateString();

const nombreCliente = (p) => usuarioPublico(p.usuarioId)?.nombre || 'Cliente';

function mensajeUbicacion(conectado, enVivo) {
  if (!conectado) return '';
  return enVivo
    ? `<p class="tenue pequeno">${icono('ubicacion', { tamano: 14 })} Compartiendo tu ubicación en vivo con tus clientes.</p>`
    : `<p class="tenue pequeno">${icono('alerta', { tamano: 14 })} Activa la ubicación del teléfono para que el cliente te vea llegar.</p>`;
}

/* ================= Inicio del maestro ================= */

export function pantallaMaestro(raiz) {
  let dejarGps = () => {};
  let nuevasAntes = -1;

  raiz.innerHTML = `<main class="contenido con-nav" id="cuerpo"></main>${navMaestro('inicio')}`;
  const cuerpo = raiz.querySelector('#cuerpo');

  function pintar() {
    const u = yo();
    if (!u?.maestro) return;
    const ficha = fichaMaestro(u);
    const cat = categoriaPorId(u.maestro.categoria);
    const conectado = !!u.maestro.conectado;
    const mios = pedidos.delMaestro(u.id);
    const nuevas = mios.filter((p) => !p.cancelado && p.estado === 'buscando');
    const enCurso = mios.find((p) => !p.cancelado && p.estado !== 'buscando' && etapaDe(p) !== 'completado');
    const deHoy = mios.filter((p) => p.pago && esHoy(p.pago.fecha));
    const aqui = posicionEnVivo(u.id);

    // Aviso con vibración cuando entra una solicitud nueva
    if (nuevasAntes >= 0 && nuevas.length > nuevasAntes) {
      navigator.vibrate?.([200, 100, 200]);
      aviso('¡Tienes una solicitud nueva!', 'exito');
    }
    nuevasAntes = nuevas.length;

    cuerpo.innerHTML = `
      <section class="maestro-cabeza">
        ${avatar(ficha, 52)}
        <div><h1 tabindex="-1">${esc(saludo())}, ${esc(primerNombre(u.nombre))}</h1><p class="tenue">${esc(cat?.nombre || '')} · ${esc(ciudadPorId(u.ciudad)?.nombre || 'Sin ciudad')} · ${u.maestro.anios} años</p></div>
      </section>

      ${
        !ciudadPorId(u.ciudad)
          ? `<section class="tarjeta pedir-ciudad">
              <b>¿En qué ciudad trabajas?</b>
              <small class="tenue">Te mostramos a los clientes de esa ciudad.</small>
              <select id="f-ciudad-maestro" aria-label="Ciudad donde trabajas">${opcionesCiudad()}</select>
            </section>`
          : ''
      }
      <section class="conexion${conectado ? ' activa' : ''}"${ciudadPorId(u.ciudad) ? '' : ' hidden'}>
        <span><b>${conectado ? 'Estás conectado' : 'Estás desconectado'}</b><small>${conectado ? 'Mantén Camello abierto para recibir solicitudes.' : 'Conéctate para recibir trabajos.'}</small></span>
        <label class="interruptor"><input type="checkbox" id="conectado" ${conectado ? 'checked' : ''} aria-label="Recibir trabajos"><i aria-hidden="true"></i></label>
      </section>
      ${mensajeUbicacion(conectado, !!aqui)}

      <ul class="resumen-dia">
        <li><b>${dinero(deHoy.reduce((s, p) => s + ganancia(p), 0))}</b><span>Ganado hoy</span></li>
        <li><b>${deHoy.length}</b><span>Servicios hoy</span></li>
        <li><b>${icono('estrella', { tamano: 14, relleno: true })} ${ficha.calificacion == null ? 'Nuevo' : ficha.calificacion.toFixed(1)}</b><span>Calificación</span></li>
      </ul>

      ${
        enCurso
          ? `<a class="fila-accion tarjeta" href="#/maestro/pedido/${encodeURIComponent(enCurso.id)}">
              ${icono('trabajo', { tamano: 22 })}
              <span><b>Trabajo en curso · ${esc(primerNombre(nombreCliente(enCurso)))}</b><small>${esc(enCurso.direccion.texto)}</small></span>
              ${chat.sinLeer(enCurso.id, 'trabajador') ? `<span class="burbuja-num">${chat.sinLeer(enCurso.id, 'trabajador')}</span>` : ''}
              ${icono('derecha', { tamano: 18 })}
            </a>`
          : ''
      }

      <section class="bloque">
        <h2>Solicitudes nuevas</h2>
        ${
          nuevas.length
            ? nuevas.map((p) => tarjetaSolicitud(p, aqui)).join('')
            : vacio({
                icono: conectado ? 'campana' : 'reloj',
                titulo: conectado ? 'Esperando solicitudes' : 'No estás recibiendo trabajos',
                texto: conectado ? 'Cuando un cliente te pida, te avisamos aquí con vibración.' : 'Activa el botón de arriba para aparecer en la lista de los clientes.',
              })
        }
      </section>`;

    cuerpo.querySelector('#f-ciudad-maestro')?.addEventListener('change', (e) => {
      if (!e.target.value) return;
      sesion.set(auth.modificar(u.id, (x) => (x.ciudad = e.target.value)));
      realtime.iniciar(e.target.value);
      aviso(`Listo: trabajas en ${ciudadPorId(e.target.value).nombre}.`, 'exito');
      pintar();
    });
    cuerpo.querySelector('#conectado').addEventListener('change', async (e) => {
      const activo = e.target.checked;
      e.target.disabled = true;
      const nuevo = auth.modificar(u.id, (x) => (x.maestro.conectado = activo));
      sesion.set(nuevo);
      try {
        await nuevo.guardado;
        aviso(activo ? 'Listo, ya puedes recibir trabajos.' : 'Te desconectaste. No te llegarán solicitudes.');
      } catch {
        sesion.set(auth.modificar(u.id, (x) => (x.maestro.conectado = !activo)));
      }
      gps();
      pintar();
    });
    cuerpo.querySelectorAll('[data-aceptar]').forEach((b) => b.addEventListener('click', () => responder(b, b.dataset.aceptar, 'aceptar')));
    cuerpo.querySelectorAll('[data-rechazar]').forEach((b) => b.addEventListener('click', () => responder(b, b.dataset.rechazar, 'rechazar')));
  }

  async function responder(boton, id, accion) {
    cargando(boton, true, accion === 'aceptar' ? 'Aceptando…' : 'Rechazando…');
    try {
      await pedidos.avanzar(id, yo().id, accion);
      if (accion === 'aceptar') ir(`/maestro/pedido/${encodeURIComponent(id)}`);
      else aviso('Rechazaste la solicitud. Le avisamos al cliente.');
    } catch (err) {
      aviso(err.message, 'error');
      pintar();
    }
  }

  // Mientras está conectado comparte la ubicación del teléfono
  function gps() {
    dejarGps();
    dejarGps = yo()?.maestro?.conectado ? seguirMaestro(yo().id) : () => {};
  }

  pintar();
  gps();
  const dejar = pedidos.escuchar(pintar);
  // Cuando llega el nombre de un cliente nuevo se vuelve a pintar
  const dejarUsuarios = almacen.escuchar('usuarios', pintar);
  const reloj = setInterval(pintar, 15000);
  return () => {
    dejar();
    dejarUsuarios();
    dejarGps();
    clearInterval(reloj);
  };
}

function tarjetaSolicitud(p, aqui) {
  const cat = categoriaPorId(p.categoria);
  const km = aqui ? distanciaKm(aqui, puntoCliente(p)) : null;
  const cuando = p.cuando?.tipo === 'programado' ? `Programado: ${fechaFrase(p.cuando.fecha)}` : 'Lo antes posible';
  return `
    <article class="tarjeta solicitud-nueva">
      <header>
        ${iconoCategoria(cat, 40)}
        <span><b>${esc(primerNombre(nombreCliente(p)))} necesita ${esc((cat?.nombre || 'un maestro').toLowerCase())}</b><small class="tenue">${esc(cuando)}${km !== null ? ` · a ${km.toFixed(1).replace('.', ',')} km` : ''}</small></span>
        <span class="valor">${dinero(p.precio.total)}</span>
      </header>
      <p>${esc(p.descripcion)}</p>
      <p class="tenue pequeno">${icono('ubicacion', { tamano: 14 })} ${esc(p.direccion.texto)}</p>
      <div class="dos-botones">
        <button class="btn btn-secundario" data-rechazar="${esc(p.id)}">Rechazar</button>
        <button class="btn btn-primario" data-aceptar="${esc(p.id)}">Aceptar</button>
      </div>
    </article>`;
}

/* ================= Trabajo (detalle) ================= */

const TITULOS = {
  buscando: ['Nueva solicitud', 'Acepta o rechaza el trabajo.'],
  aceptado: ['Aceptaste el trabajo', 'Cuando salgas, avísale al cliente.'],
  en_camino: ['Vas en camino', 'Al llegar, pídele al cliente su código de seguridad.'],
  en_proceso: ['Trabajando', 'Cuando termines, márcalo para que el cliente pague.'],
  finalizado: ['Esperando el pago', 'El cliente está revisando el trabajo.'],
};

export function pantallaTrabajoMaestro(raiz, { id }) {
  const u = yo();
  const inicial = pedidos.obtener(id);
  if (!inicial || inicial.trabajadorId !== u.id) return ir('/maestro', { reemplazar: true });

  let ultimaClave = '';
  let dejarGps = () => {};
  const cliente = usuarioPublico(inicial.usuarioId);
  const cat = categoriaPorId(inicial.categoria);

  raiz.innerHTML = `
    ${barra(`Pedido #${inicial.numero}`)}
    <main class="contenido con-pie" id="cuerpo"></main>
    <div class="pie-fijo" id="pie"></div>`;
  raiz.querySelector('[data-accion="atras"]').addEventListener('click', () => atras('/maestro'));
  const cuerpo = raiz.querySelector('#cuerpo');
  const pie = raiz.querySelector('#pie');

  const puntos = (p, e) => {
    const casa = puntoCliente(p);
    const mio = posicionEnVivo(u.id) || puntoMaestro(p, e);
    return { casa, mio, lista: [{ ...casa, tipo: 'casa' }, ...(e.id === 'en_proceso' || e.id === 'finalizado' ? [] : [{ ...mio, tipo: 'maestro' }])] };
  };

  function pintar() {
    const p = pedidos.obtener(id);
    if (!p) return ir('/maestro', { reemplazar: true });
    const e = estadoDe(p);
    const etapa = etapaDe(p);
    const sinLeer = chat.sinLeer(id, 'trabajador');
    const pts = puntos(p, e);
    const clave = `${e.id}|${etapa}|${sinLeer}`;

    if (clave === ultimaClave) {
      const fig = cuerpo.querySelector('.mapa-real');
      if (fig && !moverMarcas(fig, pts.lista)) fig.outerHTML = mapa(p, pts);
      return;
    }
    ultimaClave = clave;

    const [titulo, detalle] = p.cancelado
      ? ['Pedido cancelado', p.cancelado.por === 'maestro' ? 'Rechazaste este trabajo.' : 'El cliente canceló el servicio.']
      : etapa === 'completado' || etapa === 'por_calificar'
        ? ['Servicio pagado', `Recibiste ${dinero(p.pago.total)}${p.pago.propina ? `, con ${dinero(p.pago.propina)} de propina` : ''}.`]
        : TITULOS[e.id];
    const activo = !p.cancelado && ['aceptado', 'en_camino', 'en_proceso'].includes(e.id);

    cuerpo.innerHTML = `
      <section class="estado-cabeza${p.cancelado ? ' cancelado' : etapa !== 'activo' ? ' listo' : ''}" aria-live="polite">
        <h1 tabindex="-1">${esc(titulo)}</h1>
        <p>${esc(detalle)}</p>
      </section>

      ${!p.cancelado && etapa === 'activo' ? mapa(p, pts) : ''}

      <section class="tarjeta fila-maestro">
        ${avatar({ nombre: primerNombre(cliente?.nombre || 'Cliente'), apellido: (cliente?.nombre || '').split(' ')[1] || '', color: '#4D7C0F', categoria: p.categoria }, 52)}
        <span><b>${esc(cliente?.nombre || 'Cliente')}</b><small class="tenue">Cliente · ${esc(cat?.nombre || '')}</small></span>
        ${
          activo || e.id === 'buscando'
            ? `<span class="acciones-circulo">
                <button class="circulo" data-accion="chat" aria-label="Escribir al cliente">${icono('chat', { tamano: 20 })}${sinLeer ? `<span class="burbuja-num">${sinLeer}</span>` : ''}</button>
              </span>`
            : ''
        }
      </section>

      ${
        e.id === 'en_camino' && !p.cancelado
          ? `<form class="pin-entrada" data-campo="pin" novalidate>
              <label for="f-pin"><b>¿Ya llegaste?</b><br><small class="tenue">Pídele al cliente su código de 4 números para confirmar que eres tú.</small></label>
              <input id="f-pin" name="pin" inputmode="numeric" autocomplete="one-time-code" maxlength="4" pattern="[0-9]{4}" aria-describedby="e-pin">
              <p class="campo-error" id="e-pin" role="alert"></p>
              <button class="btn btn-primario btn-bloque" type="submit">Confirmar llegada</button>
            </form>`
          : ''
      }

      <ul class="detalle-lista tarjeta">
        <li>${icono('pedidos', { tamano: 20 })}<span><small>Problema</small>${esc(p.descripcion)}</span></li>
        <li>${icono('ubicacion', { tamano: 20 })}<span><small>Dirección</small>${esc(p.direccion.texto)}${p.direccion.detalle ? ` · ${esc(p.direccion.detalle)}` : ''}</span></li>
        <li>${icono('calendario', { tamano: 20 })}<span><small>Cuándo</small>${p.cuando?.tipo === 'programado' ? esc(fechaHora(p.cuando.fecha)) : 'Lo antes posible'}</span></li>
        <li>${icono('billete', { tamano: 20 })}<span><small>Pago</small>${esc(p.pago?.metodoNombre || p.metodoNombre || 'Efectivo')}</span></li>
        <li>${icono('precio', { tamano: 20 })}<span><small>${p.pago ? 'Recibiste' : 'Valor del servicio'}</small>${dinero(ganancia(p))}</span></li>
      </ul>`;

    // Botón principal según el momento del trabajo
    const acciones = {
      buscando: `<div class="dos-botones"><button class="btn btn-secundario" data-paso="rechazar">Rechazar</button><button class="btn btn-primario" data-paso="aceptar">Aceptar trabajo</button></div>`,
      aceptado: `<button class="btn btn-primario btn-bloque" data-paso="salir">Salir hacia el cliente</button>`,
      en_proceso: `<button class="btn btn-primario btn-bloque" data-paso="terminar">Terminé el trabajo</button>`,
    };
    pie.innerHTML = p.cancelado ? '' : acciones[e.id] || '';
    raiz.classList.toggle('sin-pie', !pie.innerHTML);

    cuerpo.querySelector('[data-accion="chat"]')?.addEventListener('click', () => ir(`/chat/${encodeURIComponent(id)}`));
    pie.querySelectorAll('[data-paso]').forEach((b) => b.addEventListener('click', () => paso(b, b.dataset.paso)));
    const form = cuerpo.querySelector('.pin-entrada');
    form?.addEventListener('submit', (ev) => {
      ev.preventDefault();
      paso(form.querySelector('button'), 'llegar', form.pin.value);
    });

    dejarGps();
    dejarGps = activo ? seguirMaestro(u.id) : () => {};
  }

  async function paso(boton, accion, pin = '') {
    const textos = { aceptar: 'Aceptando…', rechazar: 'Rechazando…', salir: 'Avisando…', llegar: 'Confirmando…', terminar: 'Terminando…' };
    cargando(boton, true, textos[accion]);
    try {
      await pedidos.avanzar(id, u.id, accion, { pin });
      if (accion === 'rechazar') return ir('/maestro', { reemplazar: true });
      aviso({ aceptar: 'Trabajo aceptado. El cliente ya lo sabe.', salir: 'Le avisamos al cliente que vas en camino.', llegar: 'Llegada confirmada.', terminar: 'Listo. El cliente ya puede pagar.' }[accion], 'exito');
    } catch (err) {
      cargando(boton, false);
      const caja = cuerpo.querySelector('.pin-entrada');
      if (accion === 'llegar' && caja) {
        caja.classList.add('con-error');
        caja.querySelector('.campo-error').textContent = err.message;
        caja.querySelector('input').select();
      } else aviso(err.message, 'error');
      return;
    }
    ultimaClave = '';
    pintar();
  }

  pintar();
  const dejar = pedidos.escuchar(pintar);
  const dejarChat = chat.escuchar(id, pintar);
  const reloj = setInterval(pintar, 2000);
  return () => {
    dejar();
    dejarChat();
    dejarGps();
    clearInterval(reloj);
  };
}

function mapa(p, pts) {
  const vivo = posicionEnVivo(p.trabajadorId);
  return mapaReal(pts.lista, {
    destino: pts.casa,
    nota: vivo ? 'Tu ubicación en vivo' : 'Ubicación aproximada',
  });
}

/* ================= Historial de trabajos ================= */

export function pantallaTrabajosMaestro(raiz) {
  const u = yo();
  const lista = pedidos.delMaestro(u.id);
  const pagados = lista.filter((p) => p.pago);
  const etiqueta = (p) => {
    if (p.cancelado) return ['Cancelado', 'gris'];
    if (p.pago) return ['Pagado', 'verde'];
    if (p.estado === 'buscando') return ['Nueva', 'naranja'];
    return ['En curso', 'azul'];
  };

  raiz.innerHTML = `
    <main class="contenido con-nav">
      <header class="seccion-cabeza"><h1 tabindex="-1">Mis trabajos</h1></header>
      <ul class="resumen-dia">
        <li><b>${dinero(pagados.reduce((s, p) => s + ganancia(p), 0))}</b><span>Ganado en total</span></li>
        <li><b>${pagados.length}</b><span>Servicios</span></li>
        <li><b>${dinero(pagados.reduce((s, p) => s + (p.pago.propina || 0), 0))}</b><span>Propinas</span></li>
      </ul>
      ${
        lista.length
          ? `<ul class="lista">${lista
              .slice(0, 100)
              .map((p) => {
                const cat = categoriaPorId(p.categoria);
                const [texto, color] = etiqueta(p);
                return `<li><a class="tarjeta pedido-item" href="#/maestro/pedido/${encodeURIComponent(p.id)}">
                  ${iconoCategoria(cat, 44)}
                  <span class="pedido-info"><b>${esc(primerNombre(nombreCliente(p)))} · ${esc(cat?.nombre || '')}</b><small class="tenue">${esc(fechaHora(p.creado))}</small><span class="etiqueta etiqueta-${color}">${texto}</span></span>
                  <span class="pedido-valor">${dinero(ganancia(p))}${icono('derecha', { tamano: 18 })}</span>
                </a></li>`;
              })
              .join('')}</ul>`
          : vacio({ icono: 'pedidos', titulo: 'Aún no tienes trabajos', texto: 'Conéctate en Inicio para empezar a recibir solicitudes.', accion: 'Ir a Inicio', ruta: '#/maestro' })
      }
    </main>
    ${navMaestro('trabajos')}`;
}

/* ================= Cuenta del maestro ================= */

export function pantallaCuentaMaestro(raiz) {
  const u = yo();
  const ficha = fichaMaestro(u);
  const cat = categoriaPorId(u.maestro.categoria);
  raiz.innerHTML = `
    <main class="contenido con-nav">
      <section class="perfil-cabeza">
        ${avatar(ficha, 80)}
        <h1 tabindex="-1">${esc(u.nombre)}</h1>
        <p class="tenue">${esc(cat?.nombre || '')} · ${u.maestro.anios} años · ${icono('estrella', { tamano: 14, relleno: true })} ${ficha.calificacion == null ? 'Nuevo' : ficha.calificacion.toFixed(1)}</p>
      </section>
      <div class="campo">
        <label for="f-ciudad-cuenta">Ciudad donde trabajo</label>
        <select id="f-ciudad-cuenta">${opcionesCiudad(u.ciudad)}</select>
      </div>
      <a class="fila-accion tarjeta" href="#/perfil">${icono('editar', { tamano: 20 })}<span><b>Mis datos</b><small>Nombre, correo y celular</small></span>${icono('derecha', { tamano: 18 })}</a>
      <a class="fila-accion tarjeta" href="#/seguridad">${icono('candado', { tamano: 20 })}<span><b>Seguridad</b><small>Contraseña y cuenta</small></span>${icono('derecha', { tamano: 18 })}</a>
      <a class="fila-accion tarjeta" href="#/ayuda">${icono('ayuda', { tamano: 20 })}<span><b>Ayuda</b><small>Preguntas frecuentes</small></span>${icono('derecha', { tamano: 18 })}</a>
      <button class="btn btn-texto peligro btn-bloque" data-accion="salir">${icono('salir', { tamano: 18 })} Cerrar sesión</button>
    </main>
    ${navMaestro('cuenta')}`;
  raiz.querySelector('#f-ciudad-cuenta').addEventListener('change', (e) => {
    if (!e.target.value) return;
    sesion.set(auth.modificar(u.id, (x) => (x.ciudad = e.target.value)));
    realtime.iniciar(e.target.value);
    aviso(`Ahora trabajas en ${ciudadPorId(e.target.value).nombre}.`, 'exito');
  });
  raiz.querySelector('[data-accion="salir"]').addEventListener('click', async (e) => {
    cargando(e.currentTarget, true, 'Cerrando sesión…');
    // Al salir queda desconectado: los clientes dejan de verlo
    await sesion.salir();
    ir('/bienvenida', { reemplazar: true });
  });
}
