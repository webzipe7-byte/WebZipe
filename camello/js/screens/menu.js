/**
 * Pestaña "Cuenta" y sus secciones: seguridad, cupones, invita y gana,
 * ayuda, configuración y trabaja con Camello.
 */
import { auth } from '../services/auth.js';
import { cupones } from '../services/cupones.js';
import { pedidos } from '../services/pedidos.js';
import { sesion } from '../estado.js';
import { ir, atras } from '../router.js';
import { navInferior, barra, campo, marcarError, cargando, aviso } from '../ui/componentes.js';
import { montarPedidoActivo } from '../ui/pedido-activo.js';
import { abrirInstalar } from '../ui/hoja-instalar.js';
import { instalacion } from '../instalar.js';
import { icono } from '../ui/iconos.js';
import { esc, iniciales, dinero, fecha } from '../ui/formato.js';
import { validarNombre, validarTelefono } from '../services/validar.js';
import { APP, MAX_CONTACTOS } from '../config.js';

const fila = (ruta, ic, titulo, sub = '', extra = '') => `
  <li><a class="menu-fila" href="${ruta}">
    <span class="menu-ico">${icono(ic, { tamano: 20 })}</span>
    <span class="fila-texto"><b>${esc(titulo)}</b>${sub ? `<small>${esc(sub)}</small>` : ''}</span>
    ${extra}${icono('derecha', { tamano: 18 })}
  </a></li>`;

/* ================= Cuenta ================= */
export async function pantallaCuenta(raiz) {
  const u = sesion.usuario;
  const lista = await pedidos.delUsuario(u.id);
  const hechos = lista.filter((p) => p.calificacion).length;
  const misCupones = cupones.disponibles(u, { tienePedidos: lista.length > 0 }).length;

  raiz.innerHTML = `
    <main class="contenido con-nav">
      <a class="perfil-usuario" href="#/perfil">
        <span class="avatar grande" style="--av:var(--marca)">${esc(iniciales(u.nombre))}</span>
        <div>
          <h1 tabindex="-1">${esc(u.nombre)}</h1>
          <p class="tenue">${hechos} servicio${hechos === 1 ? '' : 's'} · Ver perfil</p>
        </div>
        ${icono('derecha', { tamano: 18 })}
      </a>
      <div id="activo"></div>

      <ul class="menu">
        ${fila('#/seguridad', 'escudo', 'Seguridad', 'Contactos de confianza y emergencias')}
        ${fila('#/cupones', 'cupon', 'Cupones', misCupones ? `${misCupones} disponible${misCupones > 1 ? 's' : ''}` : 'Agrega un código', misCupones ? `<span class="burbuja-num">${misCupones}</span>` : '')}
        ${fila('#/invitar', 'regalo', 'Invita y gana', 'Comparte tu código con amigos')}
        ${fila('#/lugares', 'ubicacion', 'Mis lugares', 'Casa, trabajo y recientes')}
      </ul>
      <ul class="menu">
        ${fila('#/ayuda', 'ayuda', 'Ayuda', 'Preguntas frecuentes y soporte')}
        ${fila('#/configuracion', 'ajustes', 'Configuración', 'Avisos, privacidad y cuenta')}
        ${fila('#/trabaja', 'trabajo', 'Trabaja con Camello', 'Gana dinero con tu oficio')}
      </ul>

      ${instalacion.instalada() ? '' : `<button class="menu-fila menu-suelto" data-accion="instalar"><span class="menu-ico">${icono('descargar', { tamano: 20 })}</span><span class="fila-texto"><b>Descargar la app</b><small>Tenla con su propio ícono</small></span></button>`}

      <button class="btn btn-texto peligro btn-bloque" data-accion="salir">${icono('salir', { tamano: 20 })} Cerrar sesión</button>
      <p class="nota-demo">${esc(APP.nombre)} · versión ${esc(APP.version)} (demo)</p>
    </main>
    ${navInferior('cuenta')}`;

  raiz.querySelector('[data-accion="instalar"]')?.addEventListener('click', abrirInstalar);
  raiz.querySelector('[data-accion="salir"]').addEventListener('click', () => {
    sesion.salir();
    ir('/bienvenida', { reemplazar: true });
  });
  return montarPedidoActivo(raiz.querySelector('#activo'));
}

/* ================= Seguridad ================= */
export function pantallaSeguridad(raiz) {
  const pintar = () => {
    const contactos = sesion.usuario.contactos;
    raiz.innerHTML = `
      ${barra('Seguridad')}
      <main class="contenido">
        <h1 tabindex="-1">Tu seguridad primero</h1>
        <ul class="beneficios-seg">
          <li>${icono('verificado', { tamano: 22 })}<span><b>Maestros verificados</b><small>Revisamos identidad y antecedentes antes de que puedan trabajar.</small></span></li>
          <li>${icono('candado', { tamano: 22 })}<span><b>Código de seguridad</b><small>Cada servicio tiene un código de 4 números. Pídeselo al maestro antes de abrir.</small></span></li>
          <li>${icono('telefono', { tamano: 22 })}<span><b>Llamadas y chat protegidos</b><small>El maestro no ve tu número de celular.</small></span></li>
          <li>${icono('sos', { tamano: 22 })}<span><b>Botón de emergencia</b><small>Desde el escudo del seguimiento llamas al ${APP.lineaEmergencia} en un toque.</small></span></li>
        </ul>

        <section class="bloque">
          <h2>Contactos de confianza</h2>
          <p class="tenue pequeno">Hasta ${MAX_CONTACTOS} personas a quienes les compartes el seguimiento de tus servicios.</p>
          <ul class="lista contactos">
            ${
              contactos.length
                ? contactos
                    .map(
                      (c, i) => `<li class="tarjeta metodo">
                  <span class="avatar" style="--av:#64748b;width:40px;height:40px;font-size:14px">${esc(iniciales(c.nombre))}</span>
                  <span class="fila-texto"><b>${esc(c.nombre)}</b><small>${esc(c.telefono)}</small></span>
                  <button class="barra-btn" data-quitar="${i}" aria-label="Quitar a ${esc(c.nombre)}">${icono('papelera', { tamano: 18 })}</button>
                </li>`
                    )
                    .join('')
                : '<li class="panel-vacio tenue">Aún no tienes contactos de confianza.</li>'
            }
          </ul>
          ${
            contactos.length < MAX_CONTACTOS
              ? `<form class="formulario agregar-contacto" novalidate>
                  ${campo({ id: 'nombre', etiqueta: 'Nombre', auto: 'off' })}
                  ${campo({ id: 'telefono', etiqueta: 'Celular', tipo: 'tel', modo: 'tel', auto: 'off' })}
                  <button class="btn btn-secundario btn-bloque" type="submit">${icono('mas', { tamano: 18 })} Agregar contacto</button>
                </form>`
              : ''
          }
        </section>
      </main>`;

    raiz.querySelector('[data-accion="atras"]').addEventListener('click', () => atras('/cuenta'));
    raiz.querySelectorAll('[data-quitar]').forEach((b) =>
      b.addEventListener('click', () => {
        sesion.set(auth.modificar(sesion.usuario.id, (u) => u.contactos.splice(Number(b.dataset.quitar), 1)));
        pintar();
      })
    );
    const form = raiz.querySelector('.agregar-contacto');
    form?.addEventListener('submit', (e) => {
      e.preventDefault();
      const errores = { nombre: validarNombre(form.nombre.value), telefono: validarTelefono(form.telefono.value) };
      Object.entries(errores).forEach(([k, v]) => marcarError(form, k, v));
      const malo = Object.keys(errores).find((k) => errores[k]);
      if (malo) return form[malo].focus();
      sesion.set(
        auth.modificar(sesion.usuario.id, (u) => u.contactos.push({ nombre: form.nombre.value.trim(), telefono: form.telefono.value.trim() }))
      );
      aviso('Contacto agregado.', 'exito');
      pintar();
    });
  };
  pintar();
}

/* ================= Cupones ================= */
export async function pantallaCupones(raiz) {
  const tienePedidos = (await pedidos.delUsuario(sesion.usuario.id)).length > 0;

  const pintar = () => {
    const disponibles = cupones.disponibles(sesion.usuario, { tienePedidos });
    const usados = cupones.usados(sesion.usuario);
    raiz.innerHTML = `
      ${barra('Cupones')}
      <main class="contenido">
        <h1 class="oculto" tabindex="-1">Cupones</h1>
        <form class="fila-codigo" novalidate>
          <input id="f-codigo" placeholder="Escribe tu código" autocapitalize="characters" aria-label="Código del cupón">
          <button class="btn btn-primario" type="submit">Agregar</button>
        </form>
        <p class="campo-error" id="e-codigo" role="alert"></p>

        <h2 class="seccion-titulo">Disponibles</h2>
        <ul class="lista">
          ${
            disponibles.length
              ? disponibles
                  .map(
                    (c) => `<li class="cupon">
                <span class="cupon-valor">${c.valor ? dinero(c.valor) : `${Math.round(c.porcentaje * 100)}%`}</span>
                <span class="fila-texto"><b>${esc(c.titulo)}</b><small>Código ${esc(c.codigo)}${c.tope ? ` · hasta ${dinero(c.tope)}` : ''}${c.minimo ? ` · compras desde ${dinero(c.minimo)}` : ''}</small></span>
              </li>`
                  )
                  .join('')
              : '<li class="panel-vacio tenue">No tienes cupones disponibles. Prueba con el código CAMELLO10.</li>'
          }
        </ul>
        <p class="tenue pequeno">Se aplican solos al confirmar tu pedido. Uno por servicio.</p>
        ${
          usados.length
            ? `<h2 class="seccion-titulo">Usados</h2><ul class="lista">${usados
                .map((c) => `<li class="cupon usado"><span class="cupon-valor">✓</span><span class="fila-texto"><b>${esc(c.titulo)}</b><small>Usado el ${esc(fecha(c.usado.fecha))}</small></span></li>`)
                .join('')}</ul>`
            : ''
        }
      </main>`;

    raiz.querySelector('[data-accion="atras"]').addEventListener('click', () => atras('/cuenta'));
    const form = raiz.querySelector('form');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const boton = form.querySelector('button');
      cargando(boton, true, '');
      try {
        sesion.set(await cupones.agregar(sesion.usuario.id, form.querySelector('input').value));
        aviso('Cupón agregado.', 'exito');
        pintar();
      } catch (err) {
        cargando(boton, false);
        raiz.querySelector('#e-codigo').textContent = err.message;
      }
    });
  };
  pintar();
}

/* ================= Invita y gana ================= */
export function pantallaInvitar(raiz) {
  const codigo = sesion.usuario.codigoReferido;
  const mensaje = `Te regalo 20% en tu primer servicio en Camello (cerrajeros, plomeros, electricistas y más). Usa mi código ${codigo}: ${location.href.split('#')[0]}`;

  raiz.innerHTML = `
    ${barra('Invita y gana')}
    <main class="contenido centro-texto">
      <span class="exito-ico regalo">${icono('regalo', { tamano: 44 })}</span>
      <h1 tabindex="-1">Invita a tus amigos</h1>
      <p class="intro">Comparte tu código: tus amigos reciben 20% en su primer camello.</p>
      <button class="codigo-grande" data-accion="copiar" aria-label="Copiar código ${esc(codigo)}">${esc(codigo)}<small>Toca para copiar</small></button>
    </main>
    <div class="pie-fijo">
      <a class="btn btn-primario btn-bloque" href="https://wa.me/?text=${encodeURIComponent(mensaje)}" target="_blank" rel="noopener">${icono('chat', { tamano: 20 })} Invitar por WhatsApp</a>
      <button class="btn btn-texto btn-bloque" data-accion="compartir">${icono('compartir', { tamano: 18 })} Otras opciones</button>
    </div>`;

  raiz.querySelector('[data-accion="atras"]').addEventListener('click', () => atras('/cuenta'));
  raiz.querySelector('[data-accion="copiar"]').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(codigo);
      aviso('Código copiado.', 'exito');
    } catch {
      aviso(`Tu código es ${codigo}`);
    }
  });
  raiz.querySelector('[data-accion="compartir"]').addEventListener('click', async () => {
    try {
      if (navigator.share) await navigator.share({ title: 'Camello', text: mensaje });
      else {
        await navigator.clipboard.writeText(mensaje);
        aviso('Copiamos la invitación. Pégala donde quieras.', 'exito');
      }
    } catch {
      /* cerró el menú de compartir */
    }
  });
}

/* ================= Ayuda ================= */
const PREGUNTAS = [
  ['¿Cómo sé cuánto voy a pagar?', 'Antes de confirmar ves el precio estimado con la visita, la mano de obra y el recargo si es urgente. Si hacen falta repuestos, el maestro te los cotiza y tú decides antes de comprarlos.'],
  ['¿Qué es "Ofrece tu precio"?', 'En la confirmación puedes proponer cuánto quieres pagar. El maestro acepta ofertas desde el 80% del precio sugerido.'],
  ['¿Puedo cancelar un pedido?', 'Sí, gratis, mientras el maestro no haya salido hacia tu dirección. Lo haces desde el seguimiento del pedido.'],
  ['¿Cómo sé que es el maestro correcto?', 'Cada servicio tiene un código de seguridad de 4 números. Pídeselo al maestro al llegar: si no lo sabe, no le abras.'],
  ['¿Cuándo pago?', 'Cuando el trabajo termina. Puedes pagar con tarjeta, Nequi o efectivo, y dejar propina si quieres.'],
  ['¿Qué pasa si el trabajo quedó mal?', 'Escríbenos desde "Reportar un problema" dentro del pedido. Revisamos cada caso y, si corresponde, el maestro vuelve sin costo.'],
  ['No quiero que me vuelva a atender un maestro', 'Al calificar con 3 estrellas o menos puedes marcar "No volver a asignarme". Ese maestro no aparecerá más en tus búsquedas.'],
];

export function pantallaAyuda(raiz) {
  raiz.innerHTML = `
    ${barra('Ayuda')}
    <main class="contenido">
      <h1 tabindex="-1">¿En qué te ayudamos?</h1>
      <div class="acordeon">
        ${PREGUNTAS.map(([p, r]) => `<details class="panel"><summary><span>${esc(p)}</span></summary><p class="panel-texto">${esc(r)}</p></details>`).join('')}
      </div>
      <section class="bloque">
        <h2>¿No encontraste tu respuesta?</h2>
        <button class="btn btn-secundario btn-bloque" data-accion="soporte">${icono('chat', { tamano: 20 })} Hablar con soporte</button>
        <p class="tenue pequeno centro">Soporte todos los días de 6:00 a. m. a 10:00 p. m.</p>
      </section>
    </main>`;
  raiz.querySelector('[data-accion="atras"]').addEventListener('click', () => atras('/cuenta'));
  raiz.querySelector('[data-accion="soporte"]').addEventListener('click', () => aviso('El chat con soporte estará disponible en la versión completa.'));
}

/* ================= Configuración ================= */
export function pantallaConfiguracion(raiz) {
  const p = sesion.usuario.preferencias;
  const interruptor = (id, titulo, sub) => `
    <label class="interruptor">
      <span><b>${esc(titulo)}</b><small>${esc(sub)}</small></span>
      <input type="checkbox" data-pref="${id}" ${p[id] ? 'checked' : ''}>
      <i aria-hidden="true"></i>
    </label>`;

  raiz.innerHTML = `
    ${barra('Configuración')}
    <main class="contenido">
      <h1 class="oculto" tabindex="-1">Configuración</h1>
      <section class="bloque primero">
        <h2>Avisos</h2>
        <div class="grupo">
          ${interruptor('avisos', 'Estado de mis pedidos', 'Cuando el maestro acepta, sale y termina')}
          ${interruptor('promociones', 'Promociones y cupones', 'Descuentos y novedades de Camello')}
          ${interruptor('sonido', 'Sonidos', 'Sonido al recibir mensajes del maestro')}
        </div>
      </section>
      <ul class="menu">
        ${fila('#/perfil', 'perfil', 'Mis datos y contraseña')}
      </ul>
      <section class="bloque">
        <h2>Privacidad</h2>
        <p class="tenue pequeno">Tus datos se usan solo para prestarte el servicio. En este demo todo se guarda únicamente en este dispositivo.</p>
        <button class="btn btn-texto peligro btn-bloque" data-accion="eliminar">${icono('papelera', { tamano: 18 })} Eliminar mi cuenta</button>
      </section>
      <div id="dialogo"></div>
    </main>`;

  raiz.querySelector('[data-accion="atras"]').addEventListener('click', () => atras('/cuenta'));
  raiz.querySelectorAll('[data-pref]').forEach((c) =>
    c.addEventListener('change', () => {
      sesion.set(auth.modificar(sesion.usuario.id, (u) => (u.preferencias[c.dataset.pref] = c.checked)));
      aviso('Preferencia guardada.');
    })
  );
  raiz.querySelector('[data-accion="eliminar"]').addEventListener('click', () => {
    const caja = raiz.querySelector('#dialogo');
    caja.innerHTML = `
      <div class="dialogo"><div class="dialogo-caja" role="dialog" aria-modal="true" aria-labelledby="del-t">
        <h2 id="del-t">¿Eliminar tu cuenta?</h2>
        <p>Se borran tus datos, lugares, métodos de pago y cupones. Esta acción no se puede deshacer.</p>
        ${campo({ id: 'clave', etiqueta: 'Escribe tu contraseña para confirmar', tipo: 'password', auto: 'current-password' })}
        <button class="btn btn-peligro btn-bloque" data-si>Sí, eliminar mi cuenta</button>
        <button class="btn btn-texto btn-bloque" data-no>Cancelar</button>
      </div></div>`;
    caja.querySelector('[data-no]').addEventListener('click', () => (caja.innerHTML = ''));
    caja.querySelector('[data-si]').addEventListener('click', async (e) => {
      const boton = e.currentTarget;
      cargando(boton, true, 'Eliminando…');
      try {
        await auth.confirmarClave(sesion.usuario.id, caja.querySelector('#f-clave').value);
      } catch (err) {
        cargando(boton, false);
        marcarError(caja, 'clave', err.message);
        return;
      }
      await auth.eliminarCuenta(sesion.usuario.id);
      sesion.salir();
      ir('/bienvenida', { reemplazar: true });
    });
  });
}

/* ================= Trabaja con Camello ================= */
export function pantallaTrabaja(raiz) {
  raiz.innerHTML = `
    ${barra('Trabaja con Camello')}
    <main class="contenido con-pie">
      <section class="trabaja-cabeza">
        <span class="exito-ico">${icono('trabajo', { tamano: 40 })}</span>
        <h1 tabindex="-1">Gana dinero con tu oficio</h1>
        <p class="intro">¿Eres cerrajero, plomero, electricista, pintor, carpintero, técnico o haces aseo? Recibe trabajos cerca de ti.</p>
      </section>
      <ul class="beneficios-seg">
        <li>${icono('reloj', { tamano: 22 })}<span><b>Tú decides cuándo trabajar</b><small>Activa tu disponibilidad cuando quieras.</small></span></li>
        <li>${icono('ubicacion', { tamano: 22 })}<span><b>Trabajos cerca de ti</b><small>Menos tiempo en el camino, más servicios al día.</small></span></li>
        <li>${icono('billetera', { tamano: 22 })}<span><b>Pagos seguros</b><small>Recibes lo de cada servicio y el 100% de las propinas.</small></span></li>
        <li>${icono('estrella', { tamano: 22 })}<span><b>Crece con tus calificaciones</b><small>Los mejor calificados aparecen primero.</small></span></li>
      </ul>
      <p class="nota-demo">Para trabajar, cierra sesión y crea una cuenta nueva eligiendo <b>Soy maestro</b>. Usa otro correo: tu cuenta de cliente sigue igual.</p>
    </main>
    <div class="pie-fijo"><button class="btn btn-primario btn-bloque" data-accion="avisar">Crear mi cuenta de maestro</button></div>`;
  raiz.querySelector('[data-accion="atras"]').addEventListener('click', () => atras('/cuenta'));
  raiz.querySelector('[data-accion="avisar"]').addEventListener('click', () => {
    sesion.salir();
    ir('/registro', { reemplazar: true });
  });
}
