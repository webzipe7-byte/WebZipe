/**
 * Cuentas de consumidor.
 *
 * Demo: los usuarios se guardan en el dispositivo y la contraseña se guarda
 * como hash SHA-256, nunca en texto plano. En producción este archivo se
 * reemplaza por llamadas al servidor (registro, login con token, etc.)
 * manteniendo las mismas funciones públicas.
 */
import { almacen, esperar, generarId } from './almacen.js';
import { formatearTelefono } from './validar.js';

const USUARIOS = 'usuarios';
const SESION = 'sesion';

async function hash(texto) {
  if (window.crypto?.subtle) {
    const datos = new TextEncoder().encode(texto);
    const resumen = await crypto.subtle.digest('SHA-256', datos);
    return [...new Uint8Array(resumen)].map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  // Respaldo para cuando la página no corre en https ni localhost
  let h = 0;
  for (const c of texto) h = (Math.imul(31, h) + c.charCodeAt(0)) | 0;
  return 'x' + (h >>> 0).toString(16);
}

const usuarios = () => almacen.leer(USUARIOS, []);
const guardarUsuarios = (lista) => almacen.guardar(USUARIOS, lista);

/** Quita la contraseña antes de entregar el usuario a las pantallas. */
const publico = ({ claveHash, ...resto }) => resto;

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
    const usuario = usuarios().find((u) => u.id === sesion.usuarioId);
    return usuario ? publico(usuario) : null;
  },

  async registrar({ nombre, correo, telefono, clave }) {
    await esperar(700);
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
      claveHash: await hash(clave),
      direcciones: [],
      creado: Date.now(),
    };
    guardarUsuarios([...lista, usuario]);
    almacen.guardar(SESION, { usuarioId: usuario.id, desde: Date.now() });
    return publico(usuario);
  },

  async iniciarSesion({ correo, clave }) {
    await esperar(600);
    const usuario = usuarios().find((u) => u.correo === correo.trim().toLowerCase());
    if (!usuario || usuario.claveHash !== (await hash(clave))) {
      throw new ErrorCampo('clave', 'El correo o la contraseña no coinciden.');
    }
    almacen.guardar(SESION, { usuarioId: usuario.id, desde: Date.now() });
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
    if (i < 0 || lista[i].claveHash !== (await hash(actual))) {
      throw new ErrorCampo('actual', 'La contraseña actual no es correcta.');
    }
    lista[i].claveHash = await hash(nueva);
    guardarUsuarios(lista);
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
