/**
 * Punto de entrada: registra las rutas, arranca el enrutador y el service worker.
 */
import { ruta, iniciarRouter } from './router.js';
import { sesion } from './estado.js';
import { instalacion } from './instalar.js';

import { pantallaBienvenida } from './screens/bienvenida.js';
import { pantallaRegistro, pantallaEntrar } from './screens/cuenta.js';
import { pantallaInicio } from './screens/inicio.js';
import { pantallaSolicitud } from './screens/solicitud.js';
import { pantallaTrabajadores, pantallaTrabajador } from './screens/trabajadores.js';
import { pantallaConfirmar } from './screens/confirmar.js';
import { pantallaSeguimiento } from './screens/seguimiento.js';
import { pantallaPagar, pantallaCalificar } from './screens/cierre.js';
import { pantallaPedidos, pantallaRecibo } from './screens/pedidos.js';
import { pantallaChat } from './screens/chat.js';
import { pantallaBilletera, pantallaAgregarMetodo } from './screens/billetera.js';
import { pantallaLugares, pantallaEditarLugar } from './screens/lugares.js';
import { pantallaProgramar } from './screens/programar.js';
import {
  pantallaCuenta,
  pantallaSeguridad,
  pantallaCupones,
  pantallaInvitar,
  pantallaAyuda,
  pantallaConfiguracion,
  pantallaTrabaja,
} from './screens/menu.js';
import { pantallaPerfil } from './screens/perfil.js';
import { pantallaMaestro, pantallaTrabajoMaestro, pantallaTrabajosMaestro, pantallaCuentaMaestro } from './screens/maestro.js';
import { auth, inicioDe, alFallarGuardado } from './services/auth.js';
import { sincronizar, senalDeVida } from './services/sincronizar.js';
import { usuarioNube, alCambiarSesion, cuentas } from './services/nube.js';
import { aviso } from './ui/componentes.js';

// Pantallas públicas (sin sesión)
ruta('/bienvenida', pantallaBienvenida, { publica: true, soloSinSesion: true });
// Crear cuenta y entrar solo dentro de la app instalada
ruta('/registro', pantallaRegistro, { publica: true, soloSinSesion: true, soloApp: true });
ruta('/entrar', pantallaEntrar, { publica: true, soloSinSesion: true, soloApp: true });

// Pantallas con sesión. C = solo clientes; las demás las usan también los maestros
const C = { rol: 'cliente' };
ruta('/inicio', pantallaInicio, C);
ruta('/solicitud/:categoria', pantallaSolicitud, C);
ruta('/trabajadores', pantallaTrabajadores, C);
ruta('/trabajador/:id', pantallaTrabajador, C);
ruta('/confirmar', pantallaConfirmar, C);
ruta('/pedido/:id', pantallaSeguimiento, C);
ruta('/pagar/:id', pantallaPagar, C);
ruta('/calificar/:id', pantallaCalificar, C);
ruta('/chat/:id', pantallaChat);
ruta('/recibo/:id', pantallaRecibo, C);
ruta('/pedidos', pantallaPedidos, C);
ruta('/programar', pantallaProgramar, C);
ruta('/lugares', pantallaLugares, C);
ruta('/lugares/:tipo', pantallaEditarLugar, C);
ruta('/billetera', pantallaBilletera, C);
ruta('/billetera/agregar', pantallaAgregarMetodo, C);
ruta('/cuenta', pantallaCuenta, { ...C, otroRol: '/maestro/cuenta' });
ruta('/perfil', pantallaPerfil);
ruta('/seguridad', pantallaSeguridad);
ruta('/cupones', pantallaCupones, C);
ruta('/invitar', pantallaInvitar, C);
ruta('/ayuda', pantallaAyuda);
ruta('/configuracion', pantallaConfiguracion);
ruta('/trabaja', pantallaTrabaja, C);

// App del maestro (mismo programa, misma base de datos)
const M = { rol: 'trabajador' };
ruta('/maestro', pantallaMaestro, M);
ruta('/maestro/pedido/:id', pantallaTrabajoMaestro, M);
ruta('/maestro/trabajos', pantallaTrabajosMaestro, M);
ruta('/maestro/cuenta', pantallaCuentaMaestro, M);

// Protección contra clickjacking: Camello no se deja mostrar dentro de otra página
if (window.top !== window.self) {
  document.body.innerHTML = '<p class="sin-js">Por seguridad, abre Camello directamente.</p>';
  throw new Error('Camello no se puede abrir dentro de un marco.');
}

// Datos de versiones anteriores (cuando todo vivía solo en el teléfono): ya no se usan
try {
  Object.keys(localStorage)
    .filter((k) => /^camello:(usuarios|pedidos|sesion|borrador|chat:|ubicacion:|visto:)/.test(k))
    .forEach((k) => localStorage.removeItem(k));
} catch {
  /* sin almacenamiento */
}

alFallarGuardado((mensaje) => aviso(mensaje, 'error'));

// Con sesión: se traen los datos de la nube antes de mostrar la app (máximo 8 s; si no hay señal, se usa la copia)
// Si la app se abrió desde el enlace del correo de confirmación, se entra directo
const enlace = await cuentas.recibirEnlace();
let errorCarga = '';
if (usuarioNube()) {
  try {
    await Promise.race([sincronizar.cargar(), new Promise((_, no) => setTimeout(() => no(new Error('lento')), 8000))]);
  } catch (e) {
    // Sin conexión se sigue con lo que hay guardado; otro error se le muestra a la persona
    if (e.message !== 'lento' && e.codigo !== 'red') errorCarga = e.message;
  }
  sesion.set(auth.usuarioActual());
}

// Si la sesión se cierra o vence (en esta pestaña o en el servidor), se vuelve a la bienvenida
alCambiarSesion((s) => {
  if (!s && sesion.usuario) {
    sesion.set(null);
    location.hash = '#/bienvenida';
  }
});

const raiz = document.getElementById('app');
document.getElementById('arranque')?.remove();

iniciarRouter({
  raiz,
  haySesion: () => !!sesion.usuario,
  rolActual: () => sesion.usuario?.rol || 'cliente',
  appInstalada: instalacion.instalada,
  inicioPublico: '/bienvenida',
  inicioPrivado: () => inicioDe(sesion.usuario),
});

if (enlace === 'confirmado' && sesion.usuario) aviso('¡Correo confirmado! Ya puedes usar Camello.', 'exito');
else if (enlace === 'vencido') aviso('Ese enlace ya se usó o venció. Si ya confirmaste, inicia sesión con tu correo y contraseña.', 'error');
else if (errorCarga) aviso(errorCarga, 'error');

// Maestro conectado: cada minuto avisa que sigue con la app abierta.
// Si cierra la app, a los 3 minutos deja de aparecer para los clientes.
const latido = () => {
  if (sesion.usuario?.maestro?.conectado && !document.hidden) senalDeVida();
};
setInterval(latido, 60000);
document.addEventListener('visibilitychange', latido);
latido();

// Si se cierra la sesión de esta misma cuenta en otra pestaña, esta también se cierra
window.addEventListener('storage', (e) => {
  if (e.key !== 'camello:nube' || e.newValue || !sesion.usuario) return;
  let deEste = false;
  try {
    deEste = JSON.parse(e.oldValue || 'null')?.user?.id === sesion.usuario.id;
  } catch {
    /* valor dañado: se ignora */
  }
  if (deEste) {
    sesion.set(null);
    location.hash = '#/bienvenida';
  }
});

// Service worker: permite instalar la app y abrirla sin conexión
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('./sw.js', { updateViaCache: 'none' })
      .then((reg) => reg.update())
      .catch(() => {
        /* sin service worker la app sigue funcionando, solo que no offline */
      });

    // Cuando se publica una versión nueva, la app se recarga sola una vez para mostrarla
    let recargada = false;
    const habiaControlador = !!navigator.serviceWorker.controller;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!habiaControlador || recargada) return;
      recargada = true;
      location.reload();
    });
  });
}
