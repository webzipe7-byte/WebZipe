/**
 * Crear cuenta e iniciar sesión.
 */
import { auth, ErrorCampo, inicioDe } from '../services/auth.js';
import { CATEGORIAS } from '../data/categorias.js';
import { esc } from '../ui/formato.js';
import { sesion } from '../estado.js';
import { ir, atras } from '../router.js';
import { barra, campo, marcarError, activarOjos, cargando } from '../ui/componentes.js';
import { validarNombre, validarCorreo, validarTelefono, validarContrasena, validarIgual } from '../services/validar.js';
import { claveDebil } from '../services/seguridad.js';

/** Valida al salir de cada campo y limpia el error mientras se corrige. */
function validarEnVivo(form, reglas) {
  Object.entries(reglas).forEach(([id, regla]) => {
    const input = form.querySelector(`[name="${id}"]`);
    input.addEventListener('blur', () => {
      if (input.value) marcarError(form, id, regla(input.value, form));
    });
    input.addEventListener('input', () => {
      if (input.closest('.con-error')) marcarError(form, id, regla(input.value, form));
    });
  });
}

/** Revisa todos los campos; enfoca el primero con error. */
function validarTodo(form, reglas) {
  let primero = null;
  Object.entries(reglas).forEach(([id, regla]) => {
    const input = form.querySelector(`[name="${id}"]`);
    const error = regla(input.value, form);
    marcarError(form, id, error);
    if (error && !primero) primero = input;
  });
  primero?.focus();
  return !primero;
}

export function pantallaRegistro(raiz) {
  raiz.innerHTML = `
    ${barra('Crear cuenta')}
    <main class="contenido">
      <p class="intro">Una sola cuenta para pedir servicios o para trabajar con tu oficio.</p>
      <form class="formulario" novalidate>
        <fieldset class="tipo-cuenta" aria-label="¿Cómo vas a usar Camello?">
          <label><input type="radio" name="rol" value="cliente" checked><span><b>Necesito un maestro</b><small>Pide servicios a domicilio</small></span></label>
          <label><input type="radio" name="rol" value="trabajador"><span><b>Soy maestro</b><small>Recibe trabajos cerca de ti</small></span></label>
        </fieldset>
        <div class="solo-maestro" hidden>
          <div class="campo" data-campo="oficio">
            <label for="f-oficio">Tu oficio</label>
            <select id="f-oficio" name="oficio" aria-describedby="e-oficio">
              <option value="">Elige tu oficio</option>
              ${CATEGORIAS.map((c) => `<option value="${esc(c.id)}">${esc(c.nombre)}</option>`).join('')}
            </select>
            <p class="campo-error" id="e-oficio" role="alert"></p>
          </div>
          ${campo({ id: 'anios', etiqueta: 'Años de experiencia', tipo: 'number', modo: 'numeric', max: 2 })}
        </div>
        ${campo({ id: 'nombre', etiqueta: 'Nombre completo', auto: 'name' })}
        ${campo({ id: 'correo', etiqueta: 'Correo', tipo: 'email', auto: 'email', modo: 'email' })}
        ${campo({ id: 'telefono', etiqueta: 'Celular', tipo: 'tel', auto: 'tel', modo: 'tel', ayuda: 'El maestro te llamará a este número.' })}
        ${campo({ id: 'clave', etiqueta: 'Contraseña', tipo: 'password', auto: 'new-password', ayuda: 'Mínimo 8 caracteres, con letras y números.' })}
        ${campo({ id: 'clave2', etiqueta: 'Repite la contraseña', tipo: 'password', auto: 'new-password' })}
        <div class="pie-acciones">
          <button class="btn btn-primario btn-bloque" type="submit">Crear cuenta</button>
          <a class="btn btn-texto btn-bloque" href="#/entrar">Ya tengo cuenta</a>
        </div>
      </form>
    </main>`;

  const form = raiz.querySelector('form');
  const reglas = {
    nombre: validarNombre,
    correo: validarCorreo,
    telefono: validarTelefono,
    clave: (v, f) => validarContrasena(v) || claveDebil(v, { nombre: f.nombre.value, correo: f.correo.value }),
    clave2: (v, f) => validarIgual(v, f.clave.value),
    oficio: (v, f) => (f.rol.value === 'trabajador' && !v ? 'Elige tu oficio.' : ''),
    anios: (v, f) => {
      if (f.rol.value !== 'trabajador') return '';
      const n = Number(v);
      return v === '' || !Number.isInteger(n) || n < 0 || n > 60 ? 'Escribe tus años de experiencia (de 0 a 60).' : '';
    },
  };
  validarEnVivo(form, reglas);
  activarOjos(form);
  raiz.querySelector('[data-accion="atras"]').addEventListener('click', () => atras('/bienvenida'));

  const extra = form.querySelector('.solo-maestro');
  const ayudaTel = form.querySelector('#a-telefono');
  form.querySelectorAll('[name="rol"]').forEach((r) =>
    r.addEventListener('change', () => {
      const maestro = form.rol.value === 'trabajador';
      extra.hidden = !maestro;
      if (ayudaTel) ayudaTel.textContent = maestro ? 'Los clientes te contactan por el chat de la app.' : 'El maestro te llamará a este número.';
      if (maestro) form.oficio.focus();
    })
  );

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!validarTodo(form, reglas)) return;
    const boton = form.querySelector('[type="submit"]');
    cargando(boton, true, 'Creando tu cuenta…');
    try {
      const usuario = await auth.registrar({
        nombre: form.nombre.value,
        correo: form.correo.value,
        telefono: form.telefono.value,
        clave: form.clave.value,
        rol: form.rol.value,
        oficio: form.oficio.value,
        anios: form.anios.value,
      });
      sesion.set(usuario);
      ir(inicioDe(usuario), { reemplazar: true });
    } catch (err) {
      cargando(boton, false);
      if (err instanceof ErrorCampo) {
        marcarError(form, err.campo, err.message);
        form[err.campo]?.focus();
      } else {
        marcarError(form, 'clave2', err.message || 'No pudimos crear la cuenta. Intenta de nuevo.');
      }
    }
  });
}

export function pantallaEntrar(raiz) {
  raiz.innerHTML = `
    ${barra('Iniciar sesión')}
    <main class="contenido">
      <p class="intro">Qué bueno verte de nuevo.</p>
      <form class="formulario" novalidate>
        ${campo({ id: 'correo', etiqueta: 'Correo', tipo: 'email', auto: 'email', modo: 'email' })}
        ${campo({ id: 'clave', etiqueta: 'Contraseña', tipo: 'password', auto: 'current-password' })}
        <div class="pie-acciones">
          <button class="btn btn-primario btn-bloque" type="submit">Entrar</button>
          <a class="btn btn-texto btn-bloque" href="#/registro">Crear una cuenta nueva</a>
        </div>
      </form>
    </main>`;

  const form = raiz.querySelector('form');
  const reglas = {
    correo: validarCorreo,
    clave: (v) => (v ? '' : 'Escribe tu contraseña.'),
  };
  validarEnVivo(form, reglas);
  activarOjos(form);
  raiz.querySelector('[data-accion="atras"]').addEventListener('click', () => atras('/bienvenida'));

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!validarTodo(form, reglas)) return;
    const boton = form.querySelector('[type="submit"]');
    cargando(boton, true, 'Entrando…');
    try {
      const usuario = await auth.iniciarSesion({ correo: form.correo.value, clave: form.clave.value });
      sesion.set(usuario);
      ir(inicioDe(usuario), { reemplazar: true });
    } catch (err) {
      cargando(boton, false);
      marcarError(form, err.campo || 'clave', err.message);
    }
  });
}
