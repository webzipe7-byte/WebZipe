/**
 * Mapa para marcar el punto exacto del servicio.
 * La persona mueve el mapa con el dedo y el pin queda fijo en el centro,
 * como en las apps de domicilios. Devuelve { lat, lng } o null si cancela.
 */
import { icono } from './iconos.js';
import { esc } from './formato.js';
import { miUbicacion } from '../services/ubicacion.js';
import { direccionDe } from '../services/geocodificar.js';

const TESELA = 256;
const TESELAS = 'https://tile.openstreetmap.org';
const Z_MIN = 5;
const Z_MAX = 19;

const aPixel = ({ lat, lng }, z) => {
  const n = TESELA * 2 ** z;
  const r = (Math.max(-85, Math.min(85, lat)) * Math.PI) / 180;
  return { x: ((lng + 180) / 360) * n, y: ((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * n };
};

const aPunto = ({ x, y }, z) => {
  const n = TESELA * 2 ** z;
  const lng = (x / n) * 360 - 180;
  const lat = (Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / n))) * 180) / Math.PI;
  return { lat, lng };
};

/**
 * centro: dónde empieza el mapa. titulo / mensaje: lo que se le explica a la persona.
 * zoom: qué tan cerca empieza (17 = cuadra, 13 = ciudad).
 */
export function abrirMapaElegir({ centro, titulo = '¿Es aquí?', mensaje = 'Mueve el mapa hasta que el pin quede en la puerta.', zoom = 17 } = {}) {
  return new Promise((resolver) => {
    let z = zoom;
    let pos = { ...centro };
    const pantalla = document.createElement('div');
    pantalla.className = 'elegir-pantalla';
    pantalla.setAttribute('role', 'dialog');
    pantalla.setAttribute('aria-modal', 'true');
    pantalla.setAttribute('aria-label', 'Marca el punto en el mapa');
    pantalla.innerHTML = `
      <header class="elegir-cabeza">
        <button type="button" class="cajon-x" data-cancelar aria-label="Volver sin cambiar">${icono('atras', { tamano: 22 })}</button>
        <span class="cajon-titulo">Marca el punto</span>
      </header>
      <div class="elegir-mapa" aria-label="Mapa. Arrastra para mover.">
        <div class="elegir-teselas"></div>
        <span class="elegir-pin" aria-hidden="true">${icono('ubicacion', { tamano: 40 })}</span>
        <span class="elegir-sombra" aria-hidden="true"></span>
        <div class="elegir-zoom">
          <button type="button" data-zoom="1" aria-label="Acercar">+</button>
          <button type="button" data-zoom="-1" aria-label="Alejar">−</button>
        </div>
        <button type="button" class="elegir-yo" data-yo aria-label="Ir a mi ubicación">${icono('ubicacion', { tamano: 20 })}</button>
        <span class="mapa-creditos elegir-creditos">© OpenStreetMap</span>
      </div>
      <section class="elegir-hoja">
        <h2>${esc(titulo)}</h2>
        <p class="tenue">${esc(mensaje)}</p>
        <p class="elegir-cerca" aria-live="polite"></p>
        <button type="button" class="btn btn-primario btn-bloque" data-confirmar>Confirmar ubicación</button>
      </section>`;
    document.body.appendChild(pantalla);
    document.body.classList.add('sin-scroll');

    const mapa = pantalla.querySelector('.elegir-mapa');
    const capa = pantalla.querySelector('.elegir-teselas');
    const cerca = pantalla.querySelector('.elegir-cerca');

    // Dibuja las teselas que cubren el recuadro, con el punto `pos` en el centro
    function pintar() {
      const W = mapa.clientWidth;
      const H = mapa.clientHeight;
      const c = aPixel(pos, z);
      const izq = c.x - W / 2;
      const arr = c.y - H / 2;
      const max = 2 ** z;
      let html = '';
      for (let tx = Math.floor(izq / TESELA); tx <= Math.floor((izq + W) / TESELA); tx++) {
        for (let ty = Math.floor(arr / TESELA); ty <= Math.floor((arr + H) / TESELA); ty++) {
          if (ty < 0 || ty >= max) continue;
          const x = ((tx % max) + max) % max;
          html += `<i style="background-image:url('${TESELAS}/${z}/${x}/${ty}.png');left:${Math.round(tx * TESELA - izq)}px;top:${Math.round(ty * TESELA - arr)}px"></i>`;
        }
      }
      capa.innerHTML = html;
    }

    // Debajo del mapa se muestra la dirección aproximada del punto
    let espera = null;
    function nombrarPunto() {
      clearTimeout(espera);
      cerca.textContent = '';
      espera = setTimeout(async () => {
        const texto = await direccionDe(pos);
        if (texto && pantalla.isConnected) cerca.innerHTML = `${icono('ubicacion', { tamano: 14 })} Cerca de ${esc(texto)}`;
      }, 700);
    }

    // Arrastrar con el dedo o el mouse
    let arrastre = null;
    mapa.addEventListener('pointerdown', (e) => {
      if (e.target.closest('button')) return;
      mapa.setPointerCapture(e.pointerId);
      arrastre = { x: e.clientX, y: e.clientY, c: aPixel(pos, z) };
      pantalla.classList.add('moviendo');
    });
    mapa.addEventListener('pointermove', (e) => {
      if (!arrastre) return;
      pos = aPunto({ x: arrastre.c.x - (e.clientX - arrastre.x), y: arrastre.c.y - (e.clientY - arrastre.y) }, z);
      requestAnimationFrame(pintar);
    });
    const soltar = () => {
      if (!arrastre) return;
      arrastre = null;
      pantalla.classList.remove('moviendo');
      nombrarPunto();
    };
    mapa.addEventListener('pointerup', soltar);
    mapa.addEventListener('pointercancel', soltar);
    mapa.addEventListener(
      'wheel',
      (e) => {
        e.preventDefault();
        acercar(e.deltaY < 0 ? 1 : -1);
      },
      { passive: false }
    );

    function acercar(paso) {
      z = Math.max(Z_MIN, Math.min(Z_MAX, z + paso));
      pintar();
    }

    pantalla.querySelectorAll('[data-zoom]').forEach((b) => b.addEventListener('click', () => acercar(Number(b.dataset.zoom))));

    const yo = pantalla.querySelector('[data-yo]');
    yo.addEventListener('click', async () => {
      yo.disabled = true;
      try {
        pos = await miUbicacion();
        z = Math.max(z, 17);
        pintar();
        nombrarPunto();
      } catch (err) {
        cerca.textContent = err.message;
      }
      yo.disabled = false;
    });

    function cerrar(resultado) {
      document.removeEventListener('keydown', teclas);
      window.removeEventListener('resize', pintar);
      document.body.classList.remove('sin-scroll');
      pantalla.remove();
      resolver(resultado);
    }
    const teclas = (e) => e.key === 'Escape' && cerrar(null);
    document.addEventListener('keydown', teclas);
    window.addEventListener('resize', pintar);
    pantalla.querySelector('[data-cancelar]').addEventListener('click', () => cerrar(null));
    pantalla.querySelector('[data-confirmar]').addEventListener('click', () =>
      cerrar({ lat: +pos.lat.toFixed(6), lng: +pos.lng.toFixed(6), fuente: 'mapa' })
    );

    pintar();
    nombrarPunto();
    pantalla.querySelector('[data-confirmar]').focus();
  });
}
