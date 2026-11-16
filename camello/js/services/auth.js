/**
 * Cuentas de consumidor.
 *
 * Demo: los usuarios se guardan en el dispositivo. La contraseña nunca se guarda:
 * se guarda una clave derivada con PBKDF2 y sal (ver seguridad.js).
 * Hay bloqueo tras 5 intentos fallidos y la sesión vence a los 30 días. En producción este archivo se
 * reemplaza por llamadas al servidor (registro, login con token, etc.)
 * manteniendo las mismas funciones públicas.
 */
import { almacen, esperar, generarId } from './almacen.js';
import { formatearTelefono } from './validar.js';
import { derivar, verificar, intentos, minutosRestantes } from './seguridad.js';
import { categoriaPorId } from '../data/categorias.js';

const USUARIOS = 'usuarios';
const SESION = 'sesion';

/** La sesión dura 30 días desde el último uso. */
const DURACION_SESION = 30 * 24 * 60 * 60 * 1000;

const abrirSesion = (usuarioId) =>
  almacen.guardar(SESION, { usuarioId, desde: Date.now(), vence: Date.now() + DURACION_SESION });

const usuarios = () => almacen.leer(USUARIOS, []);

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
const guardarUsuarios = (lista) => almacen.guardar(USUARIOS, lista);

/** Valores por defecto para cuentas creadas antes de agregar estas funciones. */
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

/** Quita la contraseña antes de entregar el usuario a las pantallas. */
const publico = ({ claveHash, ...resto }) => ({ ...PREDETERMINADOS(), rol: 'cliente', ...resto });

/** Pantalla de inicio según el tipo de cuenta. */
export const inicioDe = (usuario) => (usuario?.rol === 'trabajador' ? '/maestro' : '/inicio');

/** Lectura de un usuario por id, sin la contraseña (para mostrar el nombre del cliente al maestro y viceversa). */
export function usuarioPublico(id) {
  const u = usuarios().find((x) => x.id === id);
  return u ? publico(u) : null;
}

/** Todos los maestros registrados (sin contraseñas). */
export const maestrosRegistrados = () => usuarios().filter((u) => u.rol === 'trabajador' && u.maestro).map(publico);

export class ErrorCampo extends Error {
  constructor(campo, mensaje) {
    super(mensaje);
    this.campo = campo;
  }
}

export const auth = {
  usuarioActual() {
    const sesion = almacen.leer(SESION);
    if (!sesion) return null;
    if (!sesion.vence || sesion.vence < Date.now()) {
      almacen.borrar(SESION);
      return null;
    }
    // Cada uso renueva el plazo
    if (sesion.vence - Date.now() < DURACION_SESION - 60 * 60 * 1000) abrirSesion(sesion.usuarioId);
    const usuario = usuarios().find((u) => u.id === sesion.usuarioId);
    return usuario ? publico(usuario) : null;
  },

  /**
   * rol: 'cliente' (pide servicios) o 'trabajador' (los presta).
   * Los dos viven en la misma tabla de usuarios.
   */
  async registrar({ nombre, correo, telefono, clave, rol = 'cliente', oficio = '', anios = 0 }) {
    await esperar(700);
    if (rol !== 'cliente' && rol !== 'trabajador') throw new Error('Tipo de cuenta no válido.');
    if (rol === 'trabajador' && !categoriaPorId(oficio)) throw new ErrorCampo('oficio', 'Elige tu oficio.');
    const aniosNum = Math.round(Number(anios));
    if (rol === 'trabajador' && (!Number.isFinite(aniosNum) || aniosNum < 0 || aniosNum > 60)) {
      throw new ErrorCampo('anios', 'Escribe tus años de experiencia (de 0 a 60).');
    }
    const lista = usuarios();
    const correoNorm = correo.trim().toLowerCase();
    if (lista.some((u) => u.correo === correoNorm)) {
      throw new ErrorCampo('correo', 'Ya existe una cuenta con este correo. Inicia sesión.');
    }
    const usuario = {
      id: generarId('u_'),
      nombre: nombre.trim().replace(/\s+/g, ' '),
      correo: correoNorm,
      telefono: formatearTelefono(telefono),
      claveHash: await derivar(clave),
      direcciones: [],
      lugares: { casa: null, trabajo: null },
      contactos: [],
      bloqueados: [],
      metodos: [{ id: 'efectivo', tipo: 'efectivo', nombre: 'Efectivo' }],
      metodoPreferido: 'efectivo',
      cupones: [{ codigo: 'BIENVENIDO', agregado: Date.now(), usado: null }],
      codigoReferido: codigoReferido(nombre),
      preferencias: { avisos: true, promociones: true, sonido: true },
      creado: Date.now(),
      rol,
      ...(rol === 'trabajador'
        ? { maestro: { categoria: oficio, anios: aniosNum, conectado: false, desde: Date.now() } }
        : {}),
    };
    guardarUsuarios([...lista, usuario]);
    abrirSesion(usuario.id);
    return publico(usuario);
  },

  async iniciarSesion({ correo, clave }) {
    await esperar(600);
    const correoNorm = correo.trim().toLowerCase();
    const llave = `login:${correoNorm}`;
    const espera = intentos.bloqueado(llave);
    if (espera) {
      throw new ErrorCampo('clave', `Demasiados intentos. Por seguridad, espera ${minutosRestantes(espera)} min e intenta de nuevo.`);
    }
    const lista = usuarios();
    const usuario = lista.find((u) => u.correo === correoNorm);
    const resultado = await verificar(clave, usuario?.claveHash);
    if (!usuario || !resultado.ok) {
      const quedan = intentos.fallo(llave);
      // El mismo mensaje exista o no la cuenta, para no revelar qué correos están registrados
      throw new ErrorCampo(
        'clave',
        quedan > 0 && quedan <= 2
          ? `El correo o la contraseña no coinciden. ${quedan > 1 ? `Te quedan ${quedan} intentos` : 'Te queda 1 intento'}.`
          : quedan <= 0
            ? 'Demasiados intentos. Por seguridad, espera 5 min e intenta de nuevo.'
            : 'El correo o la contraseña no coinciden.'
      );
    }
    intentos.limpiar(llave);
    if (resultado.actualizar) {
      usuario.claveHash = await derivar(clave);
      guardarUsuarios(lista);
    }
    abrirSesion(usuario.id);
    return publico(usuario);
  },

  cerrarSesion() {
    almacen.borrar(SESION);
  },

  async actualizarPerfil(id, cambios) {
    await esperar(500);
    const lista = usuarios();
    const i = lista.findIndex((u) => u.id === id);
    if (i < 0) throw new Error('Tu sesión expiró. Vuelve a iniciar sesión.');
    if (cambios.correo) {
      const correoNorm = cambios.correo.trim().toLowerCase();
      if (lista.some((u) => u.correo === correoNorm && u.id !== id)) {
        throw new ErrorCampo('correo', 'Ese correo ya lo usa otra cuenta.');
      }
      cambios.correo = correoNorm;
    }
    if (cambios.telefono) cambios.telefono = formatearTelefono(cambios.telefono);
    if (cambios.nombre) cambios.nombre = cambios.nombre.trim().replace(/\s+/g, ' ');
    lista[i] = { ...lista[i], ...cambios };
    guardarUsuarios(lista);
    return publico(lista[i]);
  },

  async cambiarClave(id, actual, nueva) {
    await esperar(500);
    const lista = usuarios();
    const i = lista.findIndex((u) => u.id === id);
    if (i < 0 || !(await verificar(actual, lista[i].claveHash)).ok) {
      throw new ErrorCampo('actual', 'La contraseña actual no es correcta.');
    }
    lista[i].claveHash = await derivar(nueva);
    guardarUsuarios(lista);
  },

  /**
   * Cambios internos al usuario (lugares, contactos, billetera, cupones…).
   * Recibe una función que modifica una copia del usuario y la guarda.
   */
  modificar(id, cambio) {
    const lista = usuarios();
    const i = lista.findIndex((u) => u.id === id);
    if (i < 0) throw new Error('Tu sesión expiró. Vuelve a iniciar sesión.');
    const copia = structuredClone(lista[i]);
    cambio(copia);
    lista[i] = copia;
    guardarUsuarios(lista);
    return publico(copia);
  },

  /** Confirma la contraseña antes de una acción delicada (eliminar la cuenta). */
  async confirmarClave(id, clave) {
    await esperar(300);
    const u = usuarios().find((x) => x.id === id);
    if (!u || !(await verificar(clave, u.claveHash)).ok) throw new ErrorCampo('clave', 'La contraseña no es correcta.');
  },

  async eliminarCuenta(id) {
    await esperar(600);
    guardarUsuarios(usuarios().filter((u) => u.id !== id));
    almacen.borrar(SESION);
  },

  /** Recuerda la dirección para no escribirla de nuevo. Guarda las 3 más recientes. */
  recordarDireccion(id, direccion) {
    const lista = usuarios();
    const u = lista.find((x) => x.id === id);
    if (!u) return;
    const clave = direccion.texto.toLowerCase();
    u.direcciones = [direccion, ...(u.direcciones || []).filter((d) => d.texto.toLowerCase() !== clave)].slice(0, 3);
    guardarUsuarios(lista);
  },
};
