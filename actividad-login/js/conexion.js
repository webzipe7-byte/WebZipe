// Actividad práctica V: conexión a la base de datos Postgres en Supabase
// Se usa la API REST de Supabase (PostgREST) con la clave publicable de la actividad.

const SUPABASE_URL = 'https://hypxybgvxvpwfqflijty.supabase.co';

// La clave se copió del enunciado. Como en la letra no se distingue bien la "l" de la "I",
// se deja también la otra lectura y se usa la que el servidor acepte.
const CLAVES = [
  'sb_publishable_x6A2XiGzM9F2Qlk9xwBUvA_UK3HoJJz',
  'sb_publishable_x6A2XiGzM9F2QIk9xwBUvA_UK3HoJJz'
];

// Nombres más comunes de la tabla y de las columnas, por si el profesor los cambió
const TABLAS = ['usuarios', 'usuario', 'users', 'user', 'login', 'Usuarios', 'Usuario', 'cuentas', 'clientes'];
const COL_USUARIO = ['usuario', 'user', 'username', 'nombre_usuario', 'user_name', 'login', 'nombre', 'correo', 'email'];
const COL_CLAVE = ['contrasena', 'contraseña', 'password', 'clave', 'pass', 'passwd', 'contrasenia', 'pwd'];

let claveBuena = null;
let esquema = null; // { tabla, usuario, clave }

async function pedir(ruta, clave) {
  const r = await fetch(SUPABASE_URL + '/rest/v1/' + ruta, {
    headers: { apikey: clave, Authorization: 'Bearer ' + clave, Accept: 'application/json' }
  });
  let datos = null;
  try { datos = await r.json(); } catch { /* respuesta vacía */ }
  return { ok: r.ok, estado: r.status, datos };
}

// Prueba las claves hasta encontrar la que acepta el servidor
async function conClave(ruta) {
  const orden = claveBuena ? [claveBuena] : CLAVES;
  let ultimo = null;
  for (const c of orden) {
    const res = await pedir(ruta, c);
    const claveMala = res.estado === 401 && JSON.stringify(res.datos || '').toLowerCase().includes('api key');
    if (!claveMala) { claveBuena = c; return res; }
    ultimo = res;
  }
  return ultimo;
}

const buscarColumna = (columnas, opciones) =>
  opciones.find(o => columnas.includes(o)) ||
  columnas.find(c => opciones.some(o => c.toLowerCase().includes(o)));

// Averigua en qué tabla y columnas están los usuarios
async function encontrarEsquema() {
  if (esquema) return esquema;

  // 1. Si el servidor deja ver la descripción de la base de datos, se lee de ahí
  const raiz = await conClave('');
  if (raiz && raiz.ok && raiz.datos && raiz.datos.definitions) {
    for (const [tabla, def] of Object.entries(raiz.datos.definitions)) {
      const cols = Object.keys(def.properties || {});
      const u = buscarColumna(cols, COL_USUARIO), c = buscarColumna(cols, COL_CLAVE);
      if (u && c) return (esquema = { tabla, usuario: u, clave: c });
    }
  }

  // 2. Si no, se prueban los nombres de tabla más comunes
  for (const tabla of TABLAS) {
    const res = await conClave(encodeURIComponent(tabla) + '?select=*&limit=1');
    if (!res || !res.ok || !Array.isArray(res.datos)) continue;
    if (res.datos.length) {
      const cols = Object.keys(res.datos[0]);
      const u = buscarColumna(cols, COL_USUARIO), c = buscarColumna(cols, COL_CLAVE);
      if (u && c) return (esquema = { tabla, usuario: u, clave: c });
    }
  }
  throw new Error('No se encontró la tabla de usuarios en la base de datos.');
}

// Devuelve el usuario si existe con esa contraseña; si no, null
export async function validarUsuario(usuario, contrasena) {
  const e = await encontrarEsquema();
  const ruta = `${encodeURIComponent(e.tabla)}?select=${encodeURIComponent(e.usuario)}` +
    `&${encodeURIComponent(e.usuario)}=eq.${encodeURIComponent(usuario)}` +
    `&${encodeURIComponent(e.clave)}=eq.${encodeURIComponent(contrasena)}&limit=1`;
  const res = await conClave(ruta);
  if (!res.ok) throw new Error('La base de datos respondió con error ' + res.estado + '.');
  return res.datos.length ? res.datos[0][e.usuario] : null;
}
