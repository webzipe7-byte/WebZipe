/**
 * Service worker de Camello.
 * Guarda la app en caché para que abra rápido y funcione sin conexión.
 * Al publicar cambios, sube el número de VERSION para que todos reciban la nueva.
 */
const VERSION = 'camello-v21';

const ARCHIVOS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/app.css',
  './icons/camello.svg',
  './icons/icono-192.png',
  './icons/icono-512.png',
  './js/config.js',
  './js/data/categorias.js',
  './js/data/ciudades.js',
  './js/estado.js',
  './js/instalar.js',
  './js/main.js',
  './js/router.js',
  './js/screens/bienvenida.js',
  './js/screens/billetera.js',
  './js/screens/chat.js',
  './js/screens/cierre.js',
  './js/screens/confirmar.js',
  './js/screens/cuenta.js',
  './js/screens/inicio.js',
  './js/screens/lugares.js',
  './js/screens/maestro.js',
  './js/screens/menu.js',
  './js/screens/pedidos.js',
  './js/screens/perfil.js',
  './js/screens/programar.js',
  './js/screens/seguimiento.js',
  './js/screens/solicitud.js',
  './js/screens/trabajadores.js',
  './js/services/almacen.js',
  './js/services/auth.js',
  './js/services/billetera.js',
  './js/services/buscar.js',
  './js/services/chat.js',
  './js/services/cupones.js',
  './js/services/geocodificar.js',
  './js/services/nube.js',
  './js/services/pagos.js',
  './js/services/pedidos.js',
  './js/services/seguridad.js',
  './js/services/sincronizar.js',
  './js/services/trabajadores.js',
  './js/services/ubicacion.js',
  './js/services/validar.js',
  './js/ui/campo-direccion.js',
  './js/ui/componentes.js',
  './js/ui/formato.js',
  './js/ui/hoja-instalar.js',
  './js/ui/iconos.js',
  './js/ui/logo.js',
  './js/ui/mapa-elegir.js',
  './js/ui/mapa-real.js',
  './js/ui/mapa.js',
  './js/ui/pedido-activo.js',
  './js/ui/precio.js',
  './js/ui/reportar.js',
  './js/ui/seguridad.js',
  './js/ui/selector-ciudad.js',
  './js/ui/silueta.js',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(ARCHIVOS.map((u) => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((claves) => Promise.all(claves.filter((k) => k.startsWith('camello-') && k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

/**
 * Primero la copia guardada: así la app abre al instante y, aunque millones de
 * personas la abran a la vez, cada teléfono solo descarga la app una vez.
 * Las actualizaciones llegan cuando cambia VERSION (el navegador revisa sw.js
 * cada vez que se abre la app; main.js recarga la página al activarse la nueva).
 */
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then(
      (guardada) =>
        guardada ||
        fetch(e.request)
          .then((resp) => {
            if (resp.ok && resp.type === 'basic') {
              const copia = resp.clone();
              caches.open(VERSION).then((c) => c.put(e.request, copia));
            }
            return resp;
          })
          .catch(() => caches.match('./index.html'))
    )
  );
});
