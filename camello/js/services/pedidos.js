/**
 * Pedidos de servicio y su ciclo de vida.
 *
 * El estado del pedido NO se guarda paso a paso: se calcula a partir de la hora
 * en que empezó (`inicio`) y de los tiempos de SIMULACION. Así el seguimiento
 * sigue funcionando aunque la persona cierre y vuelva a abrir la app.
 *
 * Para la versión real, `estadoDe()` se reemplaza por el estado que envía
 * el servidor (o el trabajador desde su app) y lo demás sigue igual.
 */
import { almacen, esperar, generarId, MAX_PEDIDOS } from './almacen.js';
import { SIMULACION } from '../config.js';
import { intentos, minutosRestantes } from './seguridad.js';

const CLAVE = 'pedidos';

/** Orden de los estados y textos que ve el usuario. */
export const ESTADOS = [
  { id: 'buscando', nombre: 'Buscando', titulo: 'Confirmando con el maestro', detalle: 'Le avisamos de tu solicitud.' },
  { id: 'aceptado', nombre: 'Aceptado', titulo: 'Aceptó tu solicitud', detalle: 'Se está preparando para salir.' },
  { id: 'en_camino', nombre: 'En camino', titulo: 'Va en camino', detalle: 'Ten lista la entrada.' },
  { id: 'en_proceso', nombre: 'En proceso', titulo: 'Trabajando en tu servicio', detalle: 'Te avisamos cuando termine.' },
  { id: 'finalizado', nombre: 'Finalizado', titulo: 'Servicio terminado', detalle: 'Revisa el trabajo y paga.' },
];

const DURACION = {
  buscando: SIMULACION.buscando,
  aceptado: SIMULACION.aceptado,
  en_camino: SIMULACION.enCamino,
  en_proceso: SIMULACION.enProceso,
};

/**
 * Estado actual del pedido.
 * Devuelve { id, indice, avance (0..1 dentro del estado), terminado }.
 */
export function estadoDe(pedido, ahora = Date.now()) {
  if (pedido.cancelado) return { id: 'cancelado', indice: -1, avance: 0 };
  // Pedido con un maestro registrado: el estado lo cambia el maestro desde su app
  if (pedido.real) {
    const indice = Math.max(0, ESTADOS.findIndex((s) => s.id === pedido.estado));
    const id = ESTADOS[indice].id;
    let avance = id === 'finalizado' ? 1 : 0;
    if (id === 'en_camino') {
      const viaje = Math.max(1, pedido.minutosLlegada || 15) * 60000;
      avance = Math.min(0.95, (ahora - (pedido.tiempos?.en_camino || ahora)) / viaje);
    }
    return { id, indice, avance };
  }
  if (!pedido.inicio) return { id: 'agendado', indice: 1, avance: 0 };

  let transcurrido = ahora - pedido.inicio;
  for (let i = 0; i < ESTADOS.length - 1; i++) {
    const id = ESTADOS[i].id;
    if (transcurrido < DURACION[id]) {
      return { id, indice: i, avance: transcurrido / DURACION[id], restanteMs: DURACION[id] - transcurrido };
    }
    transcurrido -= DURACION[id];
  }
  return { id: 'finalizado', indice: ESTADOS.length - 1, avance: 1 };
}

/** Etapa del pedido desde el punto de vista del usuario (para el historial y avisos). */
export function etapaDe(pedido, ahora = Date.now()) {
  const e = estadoDe(pedido, ahora);
  if (e.id === 'cancelado') return 'cancelado';
  if (e.id !== 'finalizado') return 'activo';
  if (!pedido.pago) return 'por_pagar';
  if (!pedido.calificacion) return 'por_calificar';
  return 'completado';
}

export const sePuedeCancelar = (pedido) => ['buscando', 'aceptado', 'agendado'].includes(estadoDe(pedido).id);

const todos = () => almacen.leer(CLAVE, []);
/**
 * Guarda la lista sin pasar de MAX_PEDIDOS: se conservan los activos
 * y los más recientes. Lanza un error si el teléfono no tiene espacio.
 */
function guardarTodos(lista) {
  let final = lista;
  if (lista.length > MAX_PEDIDOS) {
    const activos = lista.filter((p) => etapaDe(p) !== 'completado' && etapaDe(p) !== 'cancelado');
    const cerrados = lista.filter((p) => !activos.includes(p)).sort((a, b) => b.creado - a.creado);
    final = [...activos, ...cerrados.slice(0, Math.max(0, MAX_PEDIDOS - activos.length))];
  }
  if (!almacen.guardar(CLAVE, final)) {
    throw new Error('Tu teléfono no tiene espacio para guardar el pedido. Libera espacio e intenta de nuevo.');
  }
}

function actualizar(id, cambios) {
  const lista = todos();
  const i = lista.findIndex((p) => p.id === id);
  if (i < 0) throw new Error('No encontramos este pedido.');
  lista[i] = { ...lista[i], ...cambios };
  guardarTodos(lista);
  return lista[i];
}

export const pedidos = {
  async crear(datos) {
    await esperar(900);
    const programado = datos.cuando.tipo === 'programado';
    const pedido = {
      id: generarId('p_'),
      numero: String(Math.floor(100000 + Math.random() * 900000)),
      // Código que la persona le pide al maestro al llegar, para confirmar que es él
      pin: String(Math.floor(1000 + Math.random() * 9000)),
      creado: Date.now(),
      inicio: programado ? null : Date.now(),
      cancelado: null,
      pago: null,
      calificacion: null,
      ...datos,
    };
    // Los maestros registrados tienen id de usuario: ellos manejan el pedido
    if (String(datos.trabajadorId).startsWith('u_')) {
      pedido.real = true;
      pedido.inicio = Date.now();
      pedido.estado = 'buscando';
      pedido.tiempos = { buscando: Date.now() };
    }
    guardarTodos([pedido, ...todos()]);
    return pedido;
  },

  async delUsuario(usuarioId) {
    await esperar(500);
    return todos()
      .filter((p) => p.usuarioId === usuarioId)
      .sort((a, b) => b.creado - a.creado);
  },

  /** Lectura inmediata (sin espera) para el aviso de pedido activo y el seguimiento. */
  obtener: (id) => todos().find((p) => p.id === id) || null,

  activoDe(usuarioId) {
    return (
      todos()
        .filter((p) => p.usuarioId === usuarioId)
        .sort((a, b) => b.creado - a.creado)
        .find((p) => ['activo', 'por_pagar', 'por_calificar'].includes(etapaDe(p))) || null
    );
  },

  async cancelar(id, motivo) {
    await esperar(600);
    const p = pedidos.obtener(id);
    if (!p || !sePuedeCancelar(p)) throw new Error('El maestro ya va en camino. Ya no se puede cancelar.');
    return actualizar(id, { cancelado: { fecha: Date.now(), motivo } });
  },

  /** Solo para el demo: arranca ya un servicio programado. */
  iniciarAhora(id) {
    return actualizar(id, { inicio: Date.now() });
  },

  registrarPago(id, pago) {
    return actualizar(id, { pago });
  },

  async calificar(id, calificacion) {
    await esperar(700);
    return actualizar(id, { calificacion: { ...calificacion, fecha: Date.now() } });
  },

  /** Avisa cada vez que cambia algún pedido (en esta pestaña o en otra). */
  escuchar: (fn) => almacen.escuchar('pedidos', fn),

  /* ---------- Lado del maestro ---------- */

  /** Pedidos asignados a un maestro, del más nuevo al más viejo. */
  delMaestro: (maestroId) =>
    todos()
      .filter((p) => p.trabajadorId === maestroId)
      .sort((a, b) => b.creado - a.creado),

  /**
   * El maestro cambia el estado de su pedido.
   * accion: aceptar | rechazar | salir | llegar (pide el código del cliente) | terminar
   */
  async avanzar(id, maestroId, accion, { pin = '' } = {}) {
    await esperar(400);
    const p = pedidos.obtener(id);
    if (!p || !p.real || p.trabajadorId !== maestroId) throw new Error('Este pedido no es tuyo.');
    if (p.cancelado) throw new Error('El cliente canceló este pedido.');
    const pasos = {
      aceptar: ['buscando', 'aceptado'],
      rechazar: ['buscando', null],
      salir: ['aceptado', 'en_camino'],
      llegar: ['en_camino', 'en_proceso'],
      terminar: ['en_proceso', 'finalizado'],
    };
    const paso = pasos[accion];
    if (!paso) throw new Error('Acción no válida.');
    if (p.estado !== paso[0]) throw new Error('El pedido ya cambió. Revisa su estado.');

    if (accion === 'rechazar') {
      return actualizar(id, { cancelado: { fecha: Date.now(), motivo: 'El maestro no pudo tomar el servicio. Elige otro maestro.', por: 'maestro' } });
    }
    if (accion === 'llegar') {
      const llave = `pin:${id}`;
      const espera = intentos.bloqueado(llave);
      if (espera) throw new Error(`Demasiados intentos. Espera ${minutosRestantes(espera)} min.`);
      if (String(pin).trim() !== p.pin) {
        const quedan = intentos.fallo(llave);
        throw new Error(quedan > 0 ? `Ese no es el código del cliente. Te quedan ${quedan} intentos.` : 'Demasiados intentos. Espera 5 min.');
      }
      intentos.limpiar(llave);
    }
    return actualizar(id, { estado: paso[1], tiempos: { ...(p.tiempos || {}), [paso[1]]: Date.now() } });
  },
};
