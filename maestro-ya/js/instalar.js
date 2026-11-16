/**
 * Instalación de la PWA.
 * Chrome/Edge (Android, Windows, macOS, Linux) ofrecen el botón "Instalar".
 * Safari (iPhone/iPad) no lo permite por código: ahí se muestran las instrucciones.
 */

let eventoInstalar = null;

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  eventoInstalar = e;
});

window.addEventListener('appinstalled', () => {
  eventoInstalar = null;
});

const esIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

export const instalacion = {
  instalada: () => window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true,
  disponible: () => !!eventoInstalar,

  instruccion() {
    if (eventoInstalar) return 'Ábrela como una app, sin el navegador.';
    if (esIOS()) return 'En Safari toca Compartir y luego "Agregar a inicio".';
    return 'Desde el menú del navegador elige "Instalar app" o "Agregar a la pantalla de inicio".';
  },

  async pedir() {
    if (!eventoInstalar) return false;
    eventoInstalar.prompt();
    const { outcome } = await eventoInstalar.userChoice;
    eventoInstalar = null;
    return outcome === 'accepted';
  },
};
