/**
 * Conexión con la base de datos en la nube (Supabase).
 *
 * Sin librerías: usa directamente las APIs de Supabase
 *   - /auth/v1      cuentas y sesión
 *   - /rest/v1      tablas y funciones
 *   - /realtime/v1  cambios en vivo (WebSocket)
 *
 * La clave que va aquí es la pública: la seguridad la ponen las reglas
 * de la base de datos (ver supabase/esquema.sql).
 */

export const NUBE = {
  url: 'https://sqjjxpxbqtwsejgjfojq.supabase.co',
  clave: 'sb_publishable_eV7s3gFWjExQwWuAl8CrTw_EV7HAYCF',
};

const CLAVE_SESION = 'camello:nube';

/* ---------------- Sesión ---------------- */

// Cada pestaña recuerda su sesión (sessionStorage); el teléfono recuerda la última (localStorage)
function leerSesion() {
  for (const s of [sessionStorage, localStorage]) {
    try {
      const v = JSON.parse(s.getItem(CLAVE_SESION) || 'null');
      if (v?.access_token && v?.refresh_token && v?.user?.id) return v;
    } catch {
      /* dañada: se ignora */
    }
  }
  return null;
}

let sesion = leerSesion();

function guardarSesion(s) {
  sesion = s;
  try {
    if (s) {
      const texto = JSON.stringify(s);
      sessionStorage.setItem(CLAVE_SESION, texto);
      localStorage.setItem(CLAVE_SESION, texto);
    } else {
      sessionStorage.removeItem(CLAVE_SESION);
      localStorage.removeItem(CLAVE_SESION);
    }
  } catch {
    /* sin almacenamiento: la sesión vive solo en memoria */
  }
  oyentesSesion.forEach((fn) => fn(s));
}

const oyentesSesion = new Set();
export const alCambiarSesion = (fn) => (oyentesSesion.add(fn), () => oyentesSesion.delete(fn));

export const usuarioNube = () => sesion?.user || null;

const conVencimiento = (datos) => ({
  access_token: datos.access_token,
  refresh_token: datos.refresh_token,
  expires_at: Number(datos.expires_at) || Math.floor(Date.now() / 1000) + (Number(datos.expires_in) || 3600),
  user: { id: datos.user.id, email: datos.user.email, meta: datos.user.user_metadata || {} },
});

/* ---------------- Peticiones ---------------- */

export class ErrorNube extends Error {
  constructor(mensaje, { estado = 0, codigo = '' } = {}) {
    super(mensaje);
    this.estado = estado;
    this.codigo = codigo;
  }
}

let renovando = null;

async function renovar() {
  if (!sesion?.refresh_token) return null;
  renovando ||= (async () => {
    try {
      const r = await fetch(`${NUBE.url}/auth/v1/token?grant_type=refresh_token`, {
        method: 'POST',
        headers: { apikey: NUBE.clave, 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: sesion.refresh_token }),
      });
      if (r.status === 400 || r.status === 401) {
        guardarSesion(null); // la sesión se cerró o venció
        return null;
      }
      if (!r.ok) return sesion; // sin internet: se sigue con la que hay
      const datos = await r.json();
      guardarSesion(conVencimiento(datos));
      realtime.token(sesion.access_token);
      return sesion;
    } catch {
      return sesion;
    } finally {
      setTimeout(() => (renovando = null), 0);
    }
  })();
  return renovando;
}

async function token() {
  if (!sesion) return null;
  if (sesion.expires_at - 60 < Date.now() / 1000) await renovar();
  return sesion?.access_token || null;
}

/** Traduce los errores de Supabase a mensajes que entiende cualquier persona. */
function mensajeDe(cuerpo, estado) {
  const texto = cuerpo?.message || cuerpo?.msg || cuerpo?.error_description || cuerpo?.error || '';
  if (/already registered|already exists/i.test(texto)) return 'Ya existe una cuenta con este correo. Inicia sesión.';
  if (/invalid login credentials/i.test(texto)) return 'El correo o la contraseña no coinciden.';
  if (/email not confirmed/i.test(texto)) return 'Todavía no has confirmado tu correo. Abre el enlace que te enviamos.';
  if (/email.*invalid|invalid.*email|valid email/i.test(texto)) return 'Ese correo no es válido. Revísalo.';
  if (/sending.*email|email.*rate/i.test(texto)) return 'No pudimos enviar el correo ahora. Intenta en unos minutos.';
  if (/rate limit|too many/i.test(texto) || estado === 429) return 'Demasiados intentos. Espera un momento e intenta de nuevo.';
  if (/password/i.test(texto) && /weak|short|least/i.test(texto)) return 'La contraseña es muy débil. Usa al menos 8 caracteres con letras y números.';
  if (/jwt|token/i.test(texto) && estado === 401) return 'Tu sesión venció. Vuelve a iniciar sesión.';
  // Los mensajes de nuestras funciones ya vienen en español
  if (texto && /[áéíóúñ¿]|\bpedido\b|\bmaestro\b/i.test(texto)) return texto;
  return estado >= 500 ? 'El servidor no responde. Intenta en un momento.' : texto || 'Algo salió mal. Intenta de nuevo.';
}

async function pedir(ruta, { metodo = 'GET', cuerpo, cabeceras = {}, conSesion = true } = {}) {
  const t = conSesion ? await token() : null;
  let r;
  try {
    r = await fetch(NUBE.url + ruta, {
      method: metodo,
      headers: {
        apikey: NUBE.clave,
        Authorization: `Bearer ${t || NUBE.clave}`,
        ...(cuerpo !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...cabeceras,
      },
      body: cuerpo !== undefined ? JSON.stringify(cuerpo) : undefined,
    });
  } catch {
    throw new ErrorNube('Sin conexión a internet. Revisa tu señal e intenta de nuevo.', { codigo: 'red' });
  }
  const texto = await r.text();
  let datos = null;
  try {
    datos = texto ? JSON.parse(texto) : null;
  } catch {
    datos = texto;
  }
  if (!r.ok) {
    if (r.status === 401 && conSesion && sesion) {
      // Token vencido justo ahora: se renueva una vez y se reintenta
      const nueva = await renovar();
      if (nueva && nueva.access_token !== t) return pedir(ruta, { metodo, cuerpo, cabeceras, conSesion });
    }
    throw new ErrorNube(mensajeDe(datos, r.status), { estado: r.status, codigo: datos?.code || datos?.error_code || '' });
  }
  return datos;
}

/* ---------------- Cuentas ---------------- */

export const cuentas = {
  /** Crea la cuenta. Devuelve la sesión, o null si Supabase pide confirmar el correo. */
  async crear(correo, clave, meta) {
    const destino = location.origin + location.pathname;
    const datos = await pedir(`/auth/v1/signup?redirect_to=${encodeURIComponent(destino)}`, {
      metodo: 'POST',
      cuerpo: { email: correo, password: clave, data: meta },
      conSesion: false,
    });
    if (datos?.access_token) {
      guardarSesion(conVencimiento(datos));
      return sesion;
    }
    // Supabase no dice que el correo ya existe (por privacidad): lo sabemos porque no crea identidad nueva
    const identidades = datos?.identities ?? datos?.user?.identities;
    if (Array.isArray(identidades) && identidades.length === 0) {
      throw new ErrorNube('Ya existe una cuenta con este correo. Inicia sesión.', { estado: 422 });
    }
    return null;
  },

  /** Vuelve a enviar el correo de confirmación. */
  reenviarConfirmacion: (correo) =>
    pedir(`/auth/v1/resend?redirect_to=${encodeURIComponent(location.origin + location.pathname)}`, {
      metodo: 'POST',
      cuerpo: { type: 'signup', email: correo },
      conSesion: false,
    }),

  /**
   * Al tocar el enlace del correo, Supabase abre la app con la sesión en la dirección
   * (#access_token=…). Aquí se toma, se guarda y se limpia la dirección.
   * Devuelve 'confirmado', 'vencido' o null si no venía de un enlace.
   */
  async recibirEnlace() {
    const h = new URLSearchParams(location.hash.slice(1));
    const limpiar = () => history.replaceState(null, '', location.pathname + location.search);
    if (h.get('error_code') || (h.get('error') && !h.get('access_token'))) {
      limpiar();
      return 'vencido';
    }
    const access = h.get('access_token');
    const refresh = h.get('refresh_token');
    if (!access || !refresh) return null;
    limpiar();
    try {
      const r = await fetch(`${NUBE.url}/auth/v1/user`, { headers: { apikey: NUBE.clave, Authorization: `Bearer ${access}` } });
      if (!r.ok) return 'vencido';
      const user = await r.json();
      guardarSesion(conVencimiento({ access_token: access, refresh_token: refresh, expires_at: Number(h.get('expires_at')) || 0, expires_in: Number(h.get('expires_in')) || 3600, user }));
      return 'confirmado';
    } catch {
      return 'vencido';
    }
  },

  async entrar(correo, clave) {
    const datos = await pedir('/auth/v1/token?grant_type=password', { metodo: 'POST', cuerpo: { email: correo, password: clave }, conSesion: false });
    guardarSesion(conVencimiento(datos));
    return sesion;
  },

  /** Revisa una contraseña sin cambiar la sesión actual. */
  async verificarClave(correo, clave) {
    try {
      await pedir('/auth/v1/token?grant_type=password', { metodo: 'POST', cuerpo: { email: correo, password: clave }, conSesion: false });
      return true;
    } catch (e) {
      if (e.codigo === 'red' || e.estado === 429) throw e;
      return false;
    }
  },

  cambiarClave: (nueva) => pedir('/auth/v1/user', { metodo: 'PUT', cuerpo: { password: nueva } }),

  cambiarCorreo: (correo) => pedir('/auth/v1/user', { metodo: 'PUT', cuerpo: { email: correo } }),

  async salir() {
    const s = sesion;
    guardarSesion(null);
    realtime.cerrar();
    if (s) {
      try {
        await fetch(`${NUBE.url}/auth/v1/logout`, { method: 'POST', headers: { apikey: NUBE.clave, Authorization: `Bearer ${s.access_token}` } });
      } catch {
        /* sin internet: la sesión ya se borró en el teléfono */
      }
    }
  },

  /** Si la sesión ya no es válida en el servidor, la borra. */
  async revisar() {
    if (!sesion) return null;
    await token();
    return sesion;
  },
};

/* ---------------- Tablas y funciones ---------------- */

const qs = (filtros = {}) =>
  Object.entries(filtros)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&');

export const db = {
  ver: (tabla, filtros) => pedir(`/rest/v1/${tabla}?${qs(filtros)}`),
  crear: (tabla, fila) => pedir(`/rest/v1/${tabla}`, { metodo: 'POST', cuerpo: fila, cabeceras: { Prefer: 'return=representation' } }),
  guardar: (tabla, fila) =>
    pedir(`/rest/v1/${tabla}`, { metodo: 'POST', cuerpo: fila, cabeceras: { Prefer: 'resolution=merge-duplicates,return=minimal' } }),
  cambiar: (tabla, filtros, cambios) => pedir(`/rest/v1/${tabla}?${qs(filtros)}`, { metodo: 'PATCH', cuerpo: cambios, cabeceras: { Prefer: 'return=minimal' } }),
  funcion: (nombre, args) => pedir(`/rest/v1/rpc/${nombre}`, { metodo: 'POST', cuerpo: args }),
};

/* ---------------- Tiempo real (Phoenix / Supabase Realtime) ---------------- */

const TABLAS_VIVO = ['perfiles', 'pedidos', 'mensajes', 'ubicaciones'];

export const realtime = (() => {
  let ws = null;
  let latido = null;
  let reintento = 0;
  let ref = 0;
  let activo = false;
  const topico = 'realtime:camello';
  const oyentes = new Set();
  const estadoOyentes = new Set();

  const enviar = (evento, payload, t = topico) => {
    if (ws?.readyState === 1) ws.send(JSON.stringify({ topic: t, event: evento, payload, ref: String(++ref) }));
  };

  function avisarEstado(conectado) {
    estadoOyentes.forEach((fn) => fn(conectado));
  }

  async function abrir() {
    if (!activo || !sesion) return;
    const t = await token();
    if (!t) return;
    try {
      ws = new WebSocket(`${NUBE.url.replace('https', 'wss')}/realtime/v1/websocket?apikey=${encodeURIComponent(NUBE.clave)}&vsn=1.0.0`);
    } catch {
      return programar();
    }
    ws.onopen = () => {
      reintento = 0;
      enviar('phx_join', {
        config: {
          broadcast: { self: false },
          presence: { key: '' },
          postgres_changes: TABLAS_VIVO.map((table) => ({ event: '*', schema: 'public', table })),
        },
        access_token: t,
      });
      clearInterval(latido);
      latido = setInterval(() => enviar('heartbeat', {}, 'phoenix'), 25000);
      avisarEstado(true);
    };
    ws.onmessage = (e) => {
      let m;
      try {
        m = JSON.parse(e.data);
      } catch {
        return;
      }
      if (m.event === 'postgres_changes' && m.payload?.data) {
        const d = m.payload.data;
        oyentes.forEach((fn) => fn({ tabla: d.table, tipo: d.type, fila: d.record, antes: d.old_record }));
      }
    };
    ws.onclose = () => {
      clearInterval(latido);
      avisarEstado(false);
      programar();
    };
    ws.onerror = () => ws?.close();
  }

  function programar() {
    if (!activo) return;
    reintento = Math.min(reintento + 1, 6);
    // Espera creciente con algo de azar para que millones de teléfonos no reconecten al mismo tiempo
    setTimeout(abrir, Math.min(30000, 1000 * 2 ** reintento) + Math.random() * 1000);
  }

  return {
    iniciar() {
      if (activo) return;
      activo = true;
      abrir();
    },
    cerrar() {
      activo = false;
      clearInterval(latido);
      try {
        ws?.close();
      } catch {
        /* ya estaba cerrado */
      }
      ws = null;
    },
    token(t) {
      enviar('access_token', { access_token: t });
    },
    escuchar: (fn) => (oyentes.add(fn), () => oyentes.delete(fn)),
    alCambiarEstado: (fn) => (estadoOyentes.add(fn), () => estadoOyentes.delete(fn)),
  };
})();

// Renueva la sesión antes de que venza mientras la app está abierta
setInterval(() => {
  if (sesion && sesion.expires_at - 300 < Date.now() / 1000) renovar();
}, 60000);
