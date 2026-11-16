/**
 * Mapa con calles reales (OpenStreetMap) para ver dónde está el cliente
 * y dónde va el maestro. No usa librerías: se arma con las imágenes
 * del mapa (teselas de 256 px) y se calculan las posiciones.
 */
import { icono } from './iconos.js';
import { esc } from './formato.js';
import { posicionEnVivo, puntoAproximado, puntoDeSalida, interpolar, enlaceRuta } from '../services/ubicacion.js';

const ANCHO = 340;
const ALTO = 220;
const TESELA = 256;
const TESELAS = 'https://tile.openstreetmap.org';

const aPixel = (p, z) => {
  const n = TESELA * 2 ** z;
  const lat = (Math.max(-85, Math.min(85, p.lat)) * Math.PI) / 180;
  return {
    x: ((p.lng + 180) / 360) * n,
    y: ((1 - Math.log(Math.tan(lat) + 1 / Math.cos(lat)) / Math.PI) / 2) * n,
  };
};

/** Zoom más cercano en el que caben todos los puntos con margen. */
function encuadre(puntos) {
  for (let z = 17; z >= 10; z--) {
    const px = puntos.map((p) => aPixel(p, z));
    const xs = px.map((p) => p.x);
    const ys = px.map((p) => p.y);
    if (Math.max(...xs) - Math.min(...xs) <= ANCHO - 90 && Math.max(...ys) - Math.min(...ys) <= ALTO - 80) {
      return { z, cx: (Math.max(...xs) + Math.min(...xs)) / 2, cy: (Math.max(...ys) + Math.min(...ys)) / 2 };
    }
  }
  const p = aPixel(puntos[0], 10);
  return { z: 10, cx: p.x, cy: p.y };
}

const pct = (v, total) => `${((v / total) * 100).toFixed(3)}%`;

const MARCAS = {
  casa: { ico: 'casa', clase: 'marca-casa', texto: 'Dirección del servicio' },
  maestro: { ico: 'maletin', clase: 'marca-maestro', texto: 'Maestro' },
};

/** Dónde está el cliente (el punto del servicio). */
export const puntoCliente = (pedido) => pedido.direccion?.coords || puntoAproximado(pedido.direccion?.texto);

/**
 * Dónde está el maestro: su GPS en vivo si lo está compartiendo; si no,
 * una posición estimada según el estado del pedido.
 */
export function puntoMaestro(pedido, estado) {
  const casa = puntoCliente(pedido);
  const vivo = posicionEnVivo(pedido.trabajadorId);
  if (vivo) return { ...vivo, enVivo: true };
  if (['en_proceso', 'finalizado'].includes(estado.id)) return casa;
  const salida = puntoDeSalida(casa, Math.min(4, Math.max(0.8, (pedido.minutosLlegada || 15) / 8)), pedido.id);
  return estado.id === 'en_camino' ? interpolar(salida, casa, estado.avance) : salida;
}

/**
 * puntos: [{ lat, lng, tipo: 'casa' | 'maestro' }]
 * Devuelve el HTML del mapa.
 */
export function mapaReal(puntos, { nota = '', destino = null } = {}) {
  const validos = puntos.filter((p) => p && Number.isFinite(p.lat) && Number.isFinite(p.lng));
  if (!validos.length) return '';
  const { z, cx, cy } = encuadre(validos);
  const izq = cx - ANCHO / 2;
  const arr = cy - ALTO / 2;

  let teselas = '';
  const max = 2 ** z;
  for (let tx = Math.floor(izq / TESELA); tx <= Math.floor((izq + ANCHO) / TESELA); tx++) {
    for (let ty = Math.floor(arr / TESELA); ty <= Math.floor((arr + ALTO) / TESELA); ty++) {
      if (ty < 0 || ty >= max) continue;
      const x = ((tx % max) + max) % max;
      // Como fondo y no como <img>: si no hay internet no aparece el icono de imagen rota
      teselas += `<i style="background-image:url('${TESELAS}/${z}/${x}/${ty}.png');left:${pct(tx * TESELA - izq, ANCHO)};top:${pct(ty * TESELA - arr, ALTO)};width:${pct(TESELA, ANCHO)};height:${pct(TESELA, ALTO)}"></i>`;
    }
  }

  const enPantalla = validos.map((p) => {
    const px = aPixel(p, z);
    return { ...p, x: px.x - izq, y: px.y - arr };
  });
  const casa = enPantalla.find((p) => p.tipo === 'casa');
  const maestro = enPantalla.find((p) => p.tipo === 'maestro');

  return `
    <figure class="mapa mapa-real" data-z="${z}" data-izq="${izq}" data-arr="${arr}" aria-label="Mapa con la ubicación">
      <div class="mapa-teselas">${teselas}</div>
      ${
        casa && maestro
          ? `<svg class="mapa-linea" viewBox="0 0 ${ANCHO} ${ALTO}" preserveAspectRatio="none" aria-hidden="true">
              <line x1="${maestro.x.toFixed(1)}" y1="${maestro.y.toFixed(1)}" x2="${casa.x.toFixed(1)}" y2="${casa.y.toFixed(1)}"/>
            </svg>`
          : ''
      }
      ${enPantalla
        .map((p) => {
          const m = MARCAS[p.tipo] || MARCAS.casa;
          return `<span class="marca ${m.clase}" data-tipo="${p.tipo}" style="left:${pct(p.x, ANCHO)};top:${pct(p.y, ALTO)}" title="${esc(p.etiqueta || m.texto)}">
            ${p.tipo === 'casa' ? '<i class="mapa-onda"></i>' : ''}${icono(m.ico, { tamano: 16 })}
          </span>`;
        })
        .join('')}
      <figcaption>
        <span>${esc(nota)}</span>
        <span class="mapa-creditos">© OpenStreetMap</span>
      </figcaption>
      ${destino ? `<a class="mapa-abrir" href="${enlaceRuta(destino)}" target="_blank" rel="noopener noreferrer">${icono('ubicacion', { tamano: 15 })} Cómo llegar</a>` : ''}
    </figure>`;
}

/**
 * Mueve las marcas sin volver a cargar el mapa. Si alguna se sale del
 * recuadro, devuelve false para que la pantalla lo vuelva a pintar.
 */
export function moverMarcas(figura, puntos) {
  if (!figura?.dataset.z) return false;
  const z = Number(figura.dataset.z);
  const izq = Number(figura.dataset.izq);
  const arr = Number(figura.dataset.arr);
  let dentro = true;
  const pos = {};
  puntos.forEach((p) => {
    const marca = figura.querySelector(`.marca[data-tipo="${p.tipo}"]`);
    if (!marca) return (dentro = false);
    const px = aPixel(p, z);
    const x = px.x - izq;
    const y = px.y - arr;
    if (x < 14 || x > ANCHO - 14 || y < 14 || y > ALTO - 14) dentro = false;
    marca.style.left = pct(x, ANCHO);
    marca.style.top = pct(y, ALTO);
    pos[p.tipo] = { x, y };
  });
  const linea = figura.querySelector('.mapa-linea line');
  if (linea && pos.maestro && pos.casa) {
    linea.setAttribute('x1', pos.maestro.x.toFixed(1));
    linea.setAttribute('y1', pos.maestro.y.toFixed(1));
  }
  return dentro;
}
