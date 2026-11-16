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

// Pantallas públicas (sin sesión)
ruta('/bienvenida', pantallaBienvenida, { publica: true, soloSinSesion: true });
// Crear cuenta y entrar solo dentro de la app instalada
ruta('/registro', pantallaRegistro, { publica: true, soloSinSesion: true, soloApp: true });
ruta('/entrar', pantallaEntrar, { publica: true, soloSinSesion: true, soloApp: true });

// Pantallas con sesión
ruta('/inicio', pantallaInicio);
ruta('/solicitud/:categoria', pantallaSolicitud);
ruta('/trabajadores', pantallaTrabajadores);
ruta('/trabajador/:id', pantallaTrabajador);
ruta('/confirmar', pantallaConfirmar);
ruta('/pedido/:id', pantallaSeguimiento);
ruta('/pagar/:id', pantallaPagar);
ruta('/calificar/:id', pantallaCalificar);
ruta('/chat/:id', pantallaChat);
ruta('/recibo/:id', pantallaRecibo);
ruta('/pedidos', pantallaPedidos);
ruta('/programar', pantallaProgramar);
ruta('/lugares', pantallaLugares);
ruta('/lugares/:tipo', pantallaEditarLugar);
ruta('/billetera', pantallaBilletera);
ruta('/billetera/agregar', pantallaAgregarMetodo);
ruta('/cuenta', pantallaCuenta);
ruta('/perfil', pantallaPerfil);
ruta('/seguridad', pantallaSeguridad);
ruta('/cupones', pantallaCupones);
ruta('/invitar', pantallaInvitar);
ruta('/ayuda', pantallaAyuda);
ruta('/configuracion', pantallaConfiguracion);
ruta('/trabaja', pantallaTrabaja);

// Protección contra clickjacking: Camello no se deja mostrar dentro de otra página
if (window.top !== window.self) {
  document.body.innerHTML = '<p class="sin-js">Por seguridad, abre Camello directamente.</p>';
  throw new Error('Camello no se puede abrir dentro de un marco.');
}

const raiz = document.getElementById('app');
document.getElementById('arranque')?.remove();

iniciarRouter({
  raiz,
  haySesion: () => !!sesion.usuario,
  appInstalada: instalacion.instalada,
  inicioPublico: '/bienvenida',
  inicioPrivado: '/inicio',
});

// Si se cierra la sesión en otra pestaña (o vence), esta también se cierra
window.addEventListener('storage', (e) => {
  if (e.key === 'camello:sesion' && !e.newValue && sesion.usuario) {
    sesion.salir();
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
