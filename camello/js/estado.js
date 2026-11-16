/**
 * Estado compartido entre pantallas:
 * - el usuario con sesión iniciada
 * - el borrador de la solicitud que se está armando (sobrevive a recargar la página)
 */
import { auth, usuarioPublico } from './services/auth.js';
import { almacen } from './services/almacen.js';

let usuario = auth.usuarioActual();

export const sesion = {
  get usuario() {
    return usuario;
  },
  set(u) {
    usuario = u;
  },
  /**
   * Vuelve a leer los datos de ESTE usuario. Cada pestaña recuerda con quién
   * entró, así se puede tener al cliente y al maestro abiertos a la vez.
   */
  refrescar() {
    if (usuario) usuario = usuarioPublico(usuario.id) || usuario;
    return usuario;
  },
  /** Cierra la sesión: borra la copia local de la cuenta y avisa a la nube. */
  salir() {
    borrador.limpiar();
    usuario = null;
    return auth.cerrarSesion();
  },
};

const CLAVE_BORRADOR = 'borrador';

export const borrador = {
  leer: () => almacen.leer(CLAVE_BORRADOR, null),
  /** Mezcla los cambios con lo que ya había. */
  guardar: (cambios) => {
    const actual = almacen.leer(CLAVE_BORRADOR, {}) || {};
    const nuevo = { ...actual, ...cambios };
    almacen.guardar(CLAVE_BORRADOR, nuevo);
    return nuevo;
  },
  nuevo: (categoria) => {
    const b = { categoria, descripcion: '', direccion: null, cuando: null, trabajadorId: null };
    almacen.guardar(CLAVE_BORRADOR, b);
    return b;
  },
  limpiar: () => almacen.borrar(CLAVE_BORRADOR),
};
