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

const ua = navigator.userAgent;
const esEdge = () => /Edg\//.test(ua);
const esChromium = () => /Chrome\//.test(ua) && !/OPR\//.test(ua);
const esAndroid = () => /Android/i.test(ua);
const esMac = () => /Macintosh/.test(ua) && navigator.maxTouchPoints <= 1;
const esIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

export const instalacion = {
  instalada: () => window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true,
  disponible: () => !!eventoInstalar,

  /** Pasos para instalar a mano, según el equipo y el navegador de quien la abre. */
  pasos() {
    if (esIOS()) {
      return {
        titulo: 'Instalar en iPhone o iPad',
        pasos: ['Abre esta página en Safari.', 'Toca el botón Compartir (el cuadro con la flecha hacia arriba).', 'Elige "Agregar a inicio" y luego "Agregar".'],
      };
    }
    if (esAndroid()) {
      return {
        titulo: 'Instalar en Android',
        pasos: ['Abre esta página en Chrome.', 'Toca el menú ⋮ arriba a la derecha.', 'Elige "Instalar app" o "Agregar a la pantalla principal".'],
      };
    }
    if (esChromium()) {
      const nav = esEdge() ? 'Edge' : 'Chrome';
      return {
        titulo: `Instalar en el computador (${nav})`,
        pasos: [
          'Mira el final de la barra de direcciones, arriba: aparece un ícono de una pantalla con una flecha.',
          'Haz clic en ese ícono y luego en "Instalar".',
          `Si no lo ves: menú ${esEdge() ? '··· → Aplicaciones' : '⋮ → Transmitir, guardar y compartir'} → "Instalar Camello".`,
        ],
      };
    }
    if (esMac()) {
      return {
        titulo: 'Instalar en Mac',
        pasos: ['En Safari: menú Archivo → "Agregar al Dock".', 'O ábrela en Chrome o Edge y usa el ícono de instalar de la barra de direcciones.'],
      };
    }
    return {
      titulo: 'Instalar la app',
      pasos: ['Abre esta página en Google Chrome o Microsoft Edge.', 'Usa el ícono de instalar al final de la barra de direcciones.'],
    };
  },

  async pedir() {
    if (!eventoInstalar) return false;
    eventoInstalar.prompt();
    const { outcome } = await eventoInstalar.userChoice;
    eventoInstalar = null;
    return outcome === 'accepted';
  },
};
