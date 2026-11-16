/**
 * Punto de entrada: registra las rutas, arranca el enrutador y el service worker.
 */
import { ruta, iniciarRouter } from './router.js';
import { sesion } from './estado.js';
import './instalar.js';

import { pantallaBienvenida } from './screens/bienvenida.js';
import { pantallaRegistro, pantallaEntrar } from './screens/cuenta.js';
import { pantallaInicio } from './screens/inicio.js';
import { pantallaSolicitud } from './screens/solicitud.js';
import { pantallaTrabajadores, pantallaTrabajador } from './screens/trabajadores.js';
import { pantallaConfirmar } from './screens/confirmar.js';
import { pantallaSeguimiento } from './screens/seguimiento.js';
import { pantallaPagar, pantallaCalificar } from './screens/cierre.js';
import { pantallaPedidos } from './screens/pedidos.js';
import { pantallaPerfil } from './screens/perfil.js';

// Pantallas públicas (sin sesión)
ruta('/bienvenida', pantallaBienvenida, { publica: true, soloSinSesion: true });
ruta('/registro', pantallaRegistro, { publica: true, soloSinSesion: true });
ruta('/entrar', pantallaEntrar, { publica: true, soloSinSesion: true });

// Pantallas con sesión
ruta('/inicio', pantallaInicio);
ruta('/solicitud/:categoria', pantallaSolicitud);
ruta('/trabajadores', pantallaTrabajadores);
ruta('/trabajador/:id', pantallaTrabajador);
ruta('/confirmar', pantallaConfirmar);
ruta('/pedido/:id', pantallaSeguimiento);
ruta('/pagar/:id', pantallaPagar);
ruta('/calificar/:id', pantallaCalificar);
ruta('/pedidos', pantallaPedidos);
ruta('/perfil', pantallaPerfil);

const raiz = document.getElementById('app');
document.getElementById('arranque')?.remove();

iniciarRouter({
  raiz,
  haySesion: () => !!sesion.usuario,
  inicioPublico: '/bienvenida',
  inicioPrivado: '/inicio',
});

// Service worker: permite instalar la app y abrirla sin conexión
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {
      /* sin service worker la app sigue funcionando, solo que no offline */
    });
  });
}
