/**
 * Cuentas de clientes y maestros, guardadas en la nube (Supabase Auth).
 *
 * La contraseña nunca pasa por nuestras tablas: la maneja Supabase Auth.
 * Los perfiles y datos privados están en las tablas `perfiles` y `privado`,
 * protegidas para que cada quien solo lea y cambie lo suyo.
 *
 * Las pantallas usan estas mismas funciones de siempre; por dentro leen de la
 * copia local (rápido) y envían los cambios a la nube.
 */
import { almacen, esperar } from './almacen.js';
import { formatearTelefono } from './validar.js';
import { intentos, minutosRestantes } from './seguridad.js';
import { categoriaPorId } from '../data/categorias.js';
import { ciudadPorId } from '../data/ciudades.js';
import { cuentas, db, usuarioNube, ErrorNube } from './nube.js';
import { sincronizar, datosPrivados } from './sincronizar.js';

/** Código para invitar amigos: nombre + 4 números. Ej: ANA4821 */
function codigoReferido(nombre) {
  const base = nombre
    .trim()
    .split(/\s+/)[0]
    .normalize('NFD')
    .replace(/[^A-Za-z]/g, '')
    .toUpperCase()
    .slice(0, 6);
  return (base || 'CAMELLO') + Math.floor(1000 + Math.random() * 9000);
}

/** Valores por defecto para los datos privados de una cuenta. */
const PREDETERMINADOS = () => ({
  direcciones: [],
  lugares: { casa: null, trabajo: null },
  contactos: [],
  bloqueados: [],
  metodos: [{ id: 'efectivo', tipo: 'efectivo', nombre: 'Efectivo' }],
  metodoPreferido: 'efectivo',
  cupones: [],
  codigoReferido: 'CAMELLO' + Math.floor(1000 + Math.random() * 9000),
  preferencias: { avisos: true, promociones: true, sonido: true },
});

const usuarios = () => almacen.leer('usuarios', []);

const publico = (u) => ({ ...PREDETERMINADOS(), rol: 'cliente', ...u });

/** La cuenta se creó pero falta abrir el enlace del correo. */
export class FaltaConfirmar extends Error {
  constructor(correo) {
    super(`Te enviamos un correo a ${correo} para confirmar tu cuenta.`);
    this.correo = correo;
  }
}

export class ErrorCampo extends Error {
  constructor(campo, mensaje) {
    super(mensaje);
    this.campo = campo;
  }
}

/** Pantalla de inicio según el tipo de cuenta. */
export const inicioDe = (usuario) => (usuario?.rol === 'trabajador' ? '/maestro' : '/inicio');

/** Un usuario por id, desde la copia local. */
export function usuarioPublico(id) {
  const u = usuarios().find((x) => x.id === id);
  return u ? publico(u) : null;
}

/** Maestros que conozco (conectados o de mis pedidos). */
export const maestrosRegistrados = () => usuarios().filter((u) => u.rol === 'trabajador' && u.maestro).map(publico);

/** Envía a la nube los cambios de mi cuenta (perfil público y datos privados). */
async function subir(u) {
  await Promise.all([
    db.cambiar('perfiles', { id: `eq.${u.id}` }, {
      nombre: u.nombre,
      ciudad: ciudadPorId(u.ciudad) ? u.ciudad : null,
      ...(u.maestro ? { categoria: u.maestro.categoria, anios: u.maestro.anios, conectado: !!u.maestro.conectado } : {}),
      actualizado: new Date().toISOString(),
    }),
    db.guardar('privado', { id: u.id, telefono: u.telefono || null, datos: datosPrivados(u), actualizado: new Date().toISOString() }),
  ]);
}

let avisoError = null;
/** La app registra aquí cómo mostrar un error de guardado (un aviso en pantalla). */
export const alFallarGuardado = (fn) => (avisoError = fn);

export const auth = {
  /** Mi cuenta, si hay sesión. Lectura inmediata desde la copia local. */
  usuarioActual() {
    const yo = usuarioNube();
    if (!yo) return null;
    almacen.usar(yo.id);
    const u = usuarios().find((x) => x.id === yo.id);
    return u ? publico(u) : null;
  },

  /**
   * rol: 'cliente' (pide servicios) o 'trabajador' (los presta).
   * Los dos viven en la misma base de datos.
   */
  async registrar({ nombre, correo, telefono, clave, rol = 'cliente', oficio = '', anios = 0, ciudad = '' }) {
    if (rol !== 'cliente' && rol !== 'trabajador') throw new Error('Tipo de cuenta no válido.');
    if (!ciudadPorId(ciudad)) throw new ErrorCampo('ciudad', 'Elige tu ciudad.');
    if (rol === 'trabajador' && !categoriaPorId(oficio)) throw new ErrorCampo('oficio', 'Elige tu oficio.');
    const aniosNum = Math.round(Number(anios));
    if (rol === 'trabajador' && (!Number.isFinite(aniosNum) || aniosNum < 0 || aniosNum > 60)) {
      throw new ErrorCampo('anios', 'Escribe tus años de experiencia (de 0 a 60).');
    }
    const limpio = nombre.trim().replace(/\s+/g, ' ');
    const correoNorm = correo.trim().toLowerCase();
    const meta = {
      nombre: limpio,
      telefono: formatearTelefono(telefono),
      rol,
      ciudad,
      ...(rol === 'trabajador' ? { categoria: oficio, anios: aniosNum } : {}),
    };
    let s;
    try {
      s = await cuentas.crear(correoNorm, clave, meta);
    } catch (e) {
      if (/correo/.test(e.message)) throw new ErrorCampo('correo', e.message);
      if (/contraseña/.test(e.message)) throw new ErrorCampo('clave', e.message);
      throw e;
    }
    if (!s) throw new FaltaConfirmar(correoNorm);
    const datos = { ...PREDETERMINADOS(), cupones: [{ codigo: 'BIENVENIDO', agregado: Date.now(), usado: null }], codigoReferido: codigoReferido(limpio), creado: Date.now() };
    const u = await sincronizar.cargar(datos);
    return publico(u);
  },

  async iniciarSesion({ correo, clave }) {
    const correoNorm = correo.trim().toLowerCase();
    const llave = `login:${correoNorm}`;
    const espera = intentos.bloqueado(llave);
    if (espera) {
      throw new ErrorCampo('clave', `Demasiados intentos. Por seguridad, espera ${minutosRestantes(espera)} min e intenta de nuevo.`);
    }
    try {
      await cuentas.entrar(correoNorm, clave);
    } catch (e) {
      if (e instanceof ErrorNube && e.codigo !== 'red' && e.estado < 500) {
        // Contraseña correcta pero el correo aún no se confirmó
        if (/confirmado/.test(e.message)) throw new FaltaConfirmar(correoNorm);
        const quedan = intentos.fallo(llave);
        // El mismo mensaje exista o no la cuenta, para no revelar qué correos están registrados
        throw new ErrorCampo(
          'clave',
          quedan <= 0
            ? 'Demasiados intentos. Por seguridad, espera 5 min e intenta de nuevo.'
            : quedan <= 2
              ? `El correo o la contraseña no coinciden. ${quedan > 1 ? `Te quedan ${quedan} intentos` : 'Te queda 1 intento'}.`
              : 'El correo o la contraseña no coinciden.'
        );
      }
      throw new ErrorCampo('clave', e.message);
    }
    intentos.limpiar(llave);
    const u = await sincronizar.cargar({ ...PREDETERMINADOS(), codigoReferido: codigoReferido(correoNorm) });
    return publico(u);
  },

  /** Cierra la sesión y borra la copia local de esta cuenta del teléfono. */
  async cerrarSesion() {
    const yo = auth.usuarioActual();
    if (yo?.maestro?.conectado) {
      await db.cambiar('perfiles', { id: `eq.${yo.id}` }, { conectado: false }).catch(() => {});
    }
    almacen.vaciar();
    almacen.usar(null);
    await cuentas.salir();
  },

  async actualizarPerfil(id, cambios) {
    await esperar(200);
    const yo = usuarioNube();
    if (cambios.correo) {
      const correoNorm = cambios.correo.trim().toLowerCase();
      if (correoNorm !== yo.email) {
        try {
          await cuentas.cambiarCorreo(correoNorm);
        } catch (e) {
          throw new ErrorCampo('correo', e.message);
        }
      }
      delete cambios.correo;
    }
    if (cambios.telefono) cambios.telefono = formatearTelefono(cambios.telefono);
    if (cambios.nombre) cambios.nombre = cambios.nombre.trim().replace(/\s+/g, ' ');
    const u = auth.modificar(id, (x) => Object.assign(x, cambios), { esperar: true });
    await u.guardado;
    return u;
  },

  async cambiarClave(id, actual, nueva) {
    const yo = usuarioNube();
    if (!(await cuentas.verificarClave(yo.email, actual))) {
      throw new ErrorCampo('actual', 'La contraseña actual no es correcta.');
    }
    try {
      await cuentas.cambiarClave(nueva);
    } catch (e) {
      throw new ErrorCampo('nueva', e.message);
    }
  },

  /**
   * Cambios a mi cuenta (lugares, contactos, billetera, cupones, conectarse…).
   * Se ven al instante en el teléfono y se envían a la nube por detrás.
   */
  modificar(id, cambio) {
    const lista = usuarios();
    const i = lista.findIndex((u) => u.id === id);
    if (i < 0 || id !== usuarioNube()?.id) throw new Error('Tu sesión expiró. Vuelve a iniciar sesión.');
    const copia = structuredClone(publico(lista[i]));
    cambio(copia);
    lista[i] = copia;
    almacen.guardar('usuarios', lista);
    const guardado = subir(copia).catch((e) => {
      avisoError?.(e.message || 'No pudimos guardar el cambio. Revisa tu conexión.');
      throw e;
    });
    guardado.catch(() => {});
    const resultado = publico(copia);
    Object.defineProperty(resultado, 'guardado', { value: guardado, enumerable: false });
    return resultado;
  },

  reenviarConfirmacion: (correo) => cuentas.reenviarConfirmacion(correo),

  /** Confirma la contraseña antes de una acción delicada (eliminar la cuenta). */
  async confirmarClave(id, clave) {
    if (!(await cuentas.verificarClave(usuarioNube().email, clave))) throw new ErrorCampo('clave', 'La contraseña no es correcta.');
  },

  async eliminarCuenta() {
    await db.funcion('eliminar_mi_cuenta', {});
    almacen.vaciar();
    almacen.usar(null);
    await cuentas.salir();
  },

  /** Recuerda la dirección para no escribirla de nuevo. Guarda las 3 más recientes. */
  recordarDireccion(id, direccion) {
    const clave = direccion.texto.toLowerCase();
    auth.modificar(id, (u) => {
      u.direcciones = [direccion, ...(u.direcciones || []).filter((d) => d.texto.toLowerCase() !== clave)].slice(0, 3);
    });
  },
};
