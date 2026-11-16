/**
 * Perfil del usuario: datos personales, contraseña, direcciones e instalación.
 */
import { auth, ErrorCampo } from '../services/auth.js';
import { sesion } from '../estado.js';
import { ir } from '../router.js';
import { navInferior, campo, marcarError, activarOjos, cargando, aviso } from '../ui/componentes.js';
import { montarPedidoActivo } from '../ui/pedido-activo.js';
import { icono } from '../ui/iconos.js';
import { esc, iniciales } from '../ui/formato.js';
import { instalacion } from '../instalar.js';
import { validarNombre, validarCorreo, validarTelefono, validarContrasena, validarIgual } from '../services/validar.js';
import { APP } from '../config.js';

export function pantallaPerfil(raiz) {
  const u = sesion.usuario;

  raiz.innerHTML = `
    <main class="contenido con-nav">
      <header class="perfil-usuario">
        <span class="avatar grande" style="--av:var(--marca)">${esc(iniciales(u.nombre))}</span>
        <div>
          <h1 tabindex="-1">${esc(u.nombre)}</h1>
          <p class="tenue">${esc(u.correo)}</p>
        </div>
      </header>
      <div id="activo"></div>

      <details class="panel" open>
        <summary>${icono('perfil', { tamano: 20 })}<span>Mis datos</span></summary>
        <form class="formulario" id="formDatos" novalidate>
          ${campo({ id: 'nombre', etiqueta: 'Nombre completo', valor: u.nombre, auto: 'name' })}
          ${campo({ id: 'correo', etiqueta: 'Correo', tipo: 'email', valor: u.correo, auto: 'email', modo: 'email' })}
          ${campo({ id: 'telefono', etiqueta: 'Celular', tipo: 'tel', valor: u.telefono, auto: 'tel', modo: 'tel' })}
          <button class="btn btn-primario btn-bloque" type="submit" disabled>Guardar cambios</button>
        </form>
      </details>

      <details class="panel">
        <summary>${icono('candado', { tamano: 20 })}<span>Cambiar contraseña</span></summary>
        <form class="formulario" id="formClave" novalidate>
          ${campo({ id: 'actual', etiqueta: 'Contraseña actual', tipo: 'password', auto: 'current-password' })}
          ${campo({ id: 'nueva', etiqueta: 'Contraseña nueva', tipo: 'password', auto: 'new-password', ayuda: 'Mínimo 8 caracteres, con letras y números.' })}
          ${campo({ id: 'nueva2', etiqueta: 'Repite la contraseña nueva', tipo: 'password', auto: 'new-password' })}
          <button class="btn btn-secundario btn-bloque" type="submit">Cambiar contraseña</button>
        </form>
      </details>

      <details class="panel">
        <summary>${icono('ubicacion', { tamano: 20 })}<span>Direcciones guardadas</span></summary>
        ${
          u.direcciones?.length
            ? `<ul class="direcciones">${u.direcciones.map((d) => `<li>${icono('ubicacion', { tamano: 18 })}<span><b>${esc(d.texto)}</b>${d.detalle ? `<small>${esc(d.detalle)}</small>` : ''}</span></li>`).join('')}</ul>`
            : '<p class="tenue panel-vacio">Se guardan solas cuando pides un servicio.</p>'
        }
      </details>

      <div id="instalar"></div>

      <button class="btn btn-texto peligro btn-bloque" data-accion="salir">${icono('salir', { tamano: 20 })} Cerrar sesión</button>
      <p class="nota-demo">${esc(APP.nombre)} · versión ${esc(APP.version)} (demo)</p>
    </main>
    ${navInferior('perfil')}`;

  /* ---------- Mis datos ---------- */
  const fDatos = raiz.querySelector('#formDatos');
  const guardar = fDatos.querySelector('[type="submit"]');
  const original = () => [sesion.usuario.nombre, sesion.usuario.correo, sesion.usuario.telefono].join('|');
  fDatos.addEventListener('input', () => {
    guardar.disabled = [fDatos.nombre.value, fDatos.correo.value, fDatos.telefono.value].join('|') === original();
  });
  fDatos.addEventListener('submit', async (e) => {
    e.preventDefault();
    const errores = {
      nombre: validarNombre(fDatos.nombre.value),
      correo: validarCorreo(fDatos.correo.value),
      telefono: validarTelefono(fDatos.telefono.value),
    };
    Object.entries(errores).forEach(([k, v]) => marcarError(fDatos, k, v));
    const malo = Object.keys(errores).find((k) => errores[k]);
    if (malo) return fDatos[malo].focus();

    cargando(guardar, true, 'Guardando…');
    try {
      const nuevo = await auth.actualizarPerfil(sesion.usuario.id, {
        nombre: fDatos.nombre.value,
        correo: fDatos.correo.value,
        telefono: fDatos.telefono.value,
      });
      sesion.set(nuevo);
      raiz.querySelector('.perfil-usuario h1').textContent = nuevo.nombre;
      raiz.querySelector('.perfil-usuario p').textContent = nuevo.correo;
      raiz.querySelector('.perfil-usuario .avatar').textContent = iniciales(nuevo.nombre);
      fDatos.telefono.value = nuevo.telefono;
      cargando(guardar, false);
      guardar.disabled = true;
      aviso('Tus datos se guardaron.', 'exito');
    } catch (err) {
      cargando(guardar, false);
      if (err instanceof ErrorCampo) marcarError(fDatos, err.campo, err.message);
      else aviso(err.message, 'error');
    }
  });

  /* ---------- Contraseña ---------- */
  const fClave = raiz.querySelector('#formClave');
  activarOjos(fClave);
  fClave.addEventListener('submit', async (e) => {
    e.preventDefault();
    const errores = {
      actual: fClave.actual.value ? '' : 'Escribe tu contraseña actual.',
      nueva: validarContrasena(fClave.nueva.value),
      nueva2: validarIgual(fClave.nueva2.value, fClave.nueva.value),
    };
    Object.entries(errores).forEach(([k, v]) => marcarError(fClave, k, v));
    const malo = Object.keys(errores).find((k) => errores[k]);
    if (malo) return fClave[malo].focus();

    const boton = fClave.querySelector('[type="submit"]');
    cargando(boton, true, 'Cambiando…');
    try {
      await auth.cambiarClave(sesion.usuario.id, fClave.actual.value, fClave.nueva.value);
      fClave.reset();
      cargando(boton, false);
      aviso('Contraseña actualizada.', 'exito');
    } catch (err) {
      cargando(boton, false);
      marcarError(fClave, err.campo || 'actual', err.message);
    }
  });

  /* ---------- Instalar la app ---------- */
  const cajaInstalar = raiz.querySelector('#instalar');
  const pintarInstalar = () => {
    if (instalacion.instalada()) {
      cajaInstalar.innerHTML = '';
      return;
    }
    cajaInstalar.innerHTML = `
      <div class="panel instalar">
        <span class="cat-ico" style="--cat:var(--marca)">${icono('descargar', { tamano: 22 })}</span>
        <span><b>Instala ${esc(APP.nombre)}</b><small class="tenue">${esc(instalacion.instruccion())}</small></span>
        ${instalacion.disponible() ? '<button class="btn btn-secundario" data-accion="instalar">Instalar</button>' : ''}
      </div>`;
    cajaInstalar.querySelector('[data-accion="instalar"]')?.addEventListener('click', async () => {
      await instalacion.pedir();
      pintarInstalar();
    });
  };
  pintarInstalar();

  raiz.querySelector('[data-accion="salir"]').addEventListener('click', () => {
    sesion.salir();
    ir('/bienvenida', { reemplazar: true });
  });

  return montarPedidoActivo(raiz.querySelector('#activo'));
}
