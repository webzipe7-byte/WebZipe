/**
 * Mantiene la copia local al día con la base de datos en la nube.
 *
 * - Al entrar: descarga lo que le toca a esta cuenta.
 * - Mientras la app está abierta: recibe los cambios en vivo (pedidos,
 *   mensajes, maestros que se conectan, ubicaciones) y los guarda en la copia,
 *   así las pantallas se actualizan solas.
 */
import { almacen } from './almacen.js';
import { db, realtime, usuarioNube } from './nube.js';

/** Campos que van a la tabla `perfiles` (públicos) y no a `privado`. */
const PUBLICOS = ['id', 'nombre', 'rol', 'maestro', 'correo', 'telefono', 'calificaciones', 'calificacionSuma', 'trabajosHechos'];

export const datosPrivados = (u) => Object.fromEntries(Object.entries(u).filter(([k]) => !PUBLICOS.includes(k)));

/** Fila de `perfiles` → usuario como lo usa la app. */
export function dePerfil(p) {
  return {
    id: p.id,
    nombre: p.nombre,
    rol: p.rol,
    ...(p.rol === 'trabajador' ? { maestro: { categoria: p.categoria, anios: p.anios ?? 0, conectado: !!p.conectado } } : {}),
    calificaciones: p.calificaciones || 0,
    calificacionSuma: p.calificacion_suma || 0,
    trabajosHechos: p.trabajos || 0,
  };
}

const lista = (ids) => `(${[...new Set(ids)].filter(Boolean).map((x) => `"${x}"`).join(',')})`;

/* ---------- Escrituras en la copia local ---------- */

/** Agrega o actualiza a alguien en la copia (si es mi cuenta, se conservan mis datos privados). */
function ponerUsuario(u) {
  const usuarios = almacen.leer('usuarios', []);
  const i = usuarios.findIndex((x) => x.id === u.id);
  if (i >= 0) usuarios[i] = { ...usuarios[i], ...u };
  else usuarios.push(u);
  almacen.guardar('usuarios', usuarios);
}

function ponerPedido(datos, pin) {
  const pedidos = almacen.leer('pedidos', []);
  const i = pedidos.findIndex((p) => p.id === datos.id);
  const anterior = i >= 0 ? pedidos[i] : null;
  const nuevo = { ...datos, ...(pin || anterior?.pin ? { pin: pin || anterior.pin } : {}) };
  if (i >= 0) pedidos[i] = nuevo;
  else pedidos.unshift(nuevo);
  almacen.guardar('pedidos', pedidos.slice(0, 200));
  return nuevo;
}

const deMensaje = (m) => ({ id: m.id, rol: m.rol, texto: m.texto, autor: m.autor, fecha: Date.parse(m.creado) || Date.now() });

function ponerMensaje(m) {
  const clave = `chat:${m.pedido_id}`;
  const chat = almacen.leer(clave, []);
  if (chat.some((x) => x.id === m.id)) return;
  chat.push(deMensaje(m));
  chat.sort((a, b) => a.id - b.id);
  almacen.guardar(clave, chat.slice(-300));
}

function ponerUbicacion(u) {
  almacen.guardar(`ubicacion:${u.maestro_id}`, { lat: u.lat, lng: u.lng, fecha: Date.parse(u.actualizado) || Date.now() });
}

/* ---------- Carga inicial ---------- */

/** Crea el perfil la primera vez que la persona entra (con los datos que dio al registrarse). */
async function asegurarPerfil(yo) {
  const [perfil] = await db.ver('perfiles', { id: `eq.${yo.id}` });
  if (perfil) return perfil;
  const m = yo.meta || {};
  const nuevo = {
    id: yo.id,
    nombre: String(m.nombre || yo.email.split('@')[0]).slice(0, 80),
    rol: m.rol === 'trabajador' ? 'trabajador' : 'cliente',
    categoria: m.rol === 'trabajador' ? m.categoria || null : null,
    anios: m.rol === 'trabajador' ? Number(m.anios) || 0 : null,
  };
  const [creado] = await db.crear('perfiles', nuevo);
  return creado;
}

export const sincronizar = {
  /**
   * Descarga los datos de esta cuenta.
   * `privadoInicial`: datos para crear la fila privada si aún no existe.
   */
  async cargar(privadoInicial = {}) {
    const yo = usuarioNube();
    if (!yo) return null;
    almacen.usar(yo.id);

    const perfil = await asegurarPerfil(yo);
    let [privado] = await db.ver('privado', { id: `eq.${yo.id}` });
    if (!privado) {
      privado = { id: yo.id, telefono: yo.meta?.telefono || null, datos: privadoInicial };
      await db.guardar('privado', privado);
    }

    const filas = await db.ver('pedidos', { select: 'datos', order: 'creado.desc', limit: 200 });
    const pedidos = filas.map((f) => f.datos);
    const pines = perfil.rol === 'cliente' && pedidos.length ? await db.ver('pines', { select: 'pedido_id,pin' }) : [];
    const pinDe = Object.fromEntries(pines.map((x) => [x.pedido_id, x.pin]));

    // Perfiles que necesito: los maestros conectados y las personas de mis pedidos
    const ids = pedidos.flatMap((p) => [p.usuarioId, p.trabajadorId]).filter((x) => x !== yo.id);
    const filtro = ids.length ? `(and(rol.eq.trabajador,conectado.eq.true),id.in.${lista(ids)})` : '(and(rol.eq.trabajador,conectado.eq.true))';
    const perfiles = await db.ver('perfiles', { select: '*', or: filtro, limit: 500 });

    const maestros = perfiles.filter((p) => p.rol === 'trabajador').map((p) => p.id);
    const ubicaciones = maestros.length ? await db.ver('ubicaciones', { maestro_id: `in.${lista(maestros)}` }) : [];

    // Mensajes de los pedidos de los últimos 3 días
    const recientes = pedidos.filter((p) => Date.now() - p.creado < 3 * 864e5).map((p) => p.id);
    const mensajes = recientes.length ? await db.ver('mensajes', { pedido_id: `in.${lista(recientes)}`, order: 'id.asc', limit: 2000 }) : [];

    // Todo listo: se escribe la copia local de una vez
    const anterior = almacen.leer('usuarios', []).find((u) => u.id === yo.id) || {};
    const mio = { ...anterior, ...privado.datos, ...dePerfil(perfil), correo: yo.email, telefono: privado.telefono || '' };
    almacen.guardar('usuarios', [mio, ...perfiles.filter((p) => p.id !== yo.id).map(dePerfil)]);
    almacen.guardar('pedidos', pedidos.map((p) => (pinDe[p.id] ? { ...p, pin: pinDe[p.id] } : p)));
    const porPedido = {};
    mensajes.forEach((m) => (porPedido[m.pedido_id] ||= []).push(deMensaje(m)));
    Object.entries(porPedido).forEach(([id, l]) => almacen.guardar(`chat:${id}`, l));
    ubicaciones.forEach(ponerUbicacion);

    realtime.iniciar();
    return mio;
  },

  /** Trae el perfil de alguien que aún no está en la copia (por ejemplo, un cliente nuevo). */
  async traerPerfil(id) {
    if (almacen.leer('usuarios', []).some((u) => u.id === id)) return;
    const [p] = await db.ver('perfiles', { id: `eq.${id}` });
    if (p) ponerUsuario(dePerfil(p));
  },

  ponerPedido,
  ponerMensaje,
  ponerUsuario,
};

/* ---------- Cambios en vivo ---------- */

realtime.escuchar(({ tabla, tipo, fila, antes }) => {
  const yo = usuarioNube();
  if (!yo) return;
  if (tabla === 'pedidos' && fila?.datos) {
    ponerPedido(fila.datos);
    const otro = fila.usuario_id === yo.id ? fila.trabajador_id : fila.usuario_id;
    sincronizar.traerPerfil(otro).catch(() => {});
  } else if (tabla === 'mensajes' && fila && tipo === 'INSERT') {
    ponerMensaje(fila);
  } else if (tabla === 'perfiles') {
    if (tipo === 'DELETE') {
      almacen.guardar('usuarios', almacen.leer('usuarios', []).filter((u) => u.id !== antes?.id));
    } else if (fila) {
      ponerUsuario(dePerfil(fila));
    }
  } else if (tabla === 'ubicaciones' && fila) {
    ponerUbicacion(fila);
  }
});

/* ---------- Envíos ---------- */

let ultimaPosicion = 0;
/** Sube la posición del maestro como máximo cada 10 segundos. */
export function subirPosicion(punto) {
  const yo = usuarioNube();
  if (!yo || Date.now() - ultimaPosicion < 10000) return;
  ultimaPosicion = Date.now();
  db.guardar('ubicaciones', { maestro_id: yo.id, lat: punto.lat, lng: punto.lng, actualizado: new Date().toISOString() }).catch(() => {});
}
