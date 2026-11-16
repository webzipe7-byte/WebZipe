/**
 * Mapa ilustrado del seguimiento.
 * Es un dibujo, no un mapa real: el maestro avanza por una ruta fija según
 * el progreso del estado "en camino".
 *
 * Para el mapa en tiempo real, este componente se reemplaza por uno que reciba
 * las coordenadas del maestro (Leaflet, Mapbox o Google Maps) con las mismas
 * dos funciones: mapaSimulado() para pintarlo y actualizarMapa() para moverlo.
 */
import { icono } from './iconos.js';

const RUTA = 'M40 196 L40 150 L120 150 L120 84 L230 84 L230 44 L300 44';
const DESTINO = { x: 300, y: 44 };

const avanceDe = (estado) =>
  estado.id === 'en_camino' ? estado.avance : ['en_proceso', 'finalizado'].includes(estado.id) ? 1 : 0;

export function mapaSimulado(estado) {
  const avance = avanceDe(estado);
  const conMaestro = estado.id !== 'buscando';

  return `
    <figure class="mapa${estado.id === 'buscando' ? ' buscando' : ''}" aria-label="Mapa ilustrativo del recorrido">
      <svg viewBox="0 0 340 220" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <rect width="340" height="220" fill="var(--mapa-fondo)"/>
        <g fill="var(--mapa-manzana)">
          <rect x="0" y="0" width="100" height="70" rx="8"/><rect x="140" y="0" width="70" height="66" rx="8"/>
          <rect x="250" y="0" width="90" height="26" rx="8"/><rect x="250" y="62" width="90" height="80" rx="8"/>
          <rect x="0" y="88" width="100" height="44" rx="8"/><rect x="140" y="104" width="70" height="116" rx="8"/>
          <rect x="60" y="170" width="60" height="50" rx="8"/><rect x="250" y="160" width="90" height="60" rx="8"/>
        </g>
        <rect x="262" y="72" width="62" height="60" rx="8" fill="var(--mapa-parque)"/>
        ${conMaestro ? `
        <path d="${RUTA}" fill="none" stroke="var(--mapa-ruta-fondo)" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>
        <path class="mapa-hecho" d="${RUTA}" pathLength="1" fill="none" stroke="var(--marca)" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="${avance} 2"/>` : ''}
        <g transform="translate(${DESTINO.x} ${DESTINO.y})">
          <circle class="mapa-onda" r="14" fill="var(--marca)" opacity=".25"/>
          <circle r="15" fill="#fff" stroke="var(--marca)" stroke-width="3"/>
          <g transform="translate(-8 -8)" color="var(--marca)">${icono('casa', { tamano: 16 })}</g>
        </g>
        ${conMaestro ? `
        <g class="mapa-maestro" transform="translate(40 196)">
          <circle r="14" fill="var(--tinta)" stroke="#fff" stroke-width="3"/>
          <g transform="translate(-7.5 -7.5)" color="#fff">${icono('maletin', { tamano: 15 })}</g>
        </g>` : ''}
      </svg>
      <figcaption>Mapa ilustrativo</figcaption>
    </figure>`;
}

/** Mueve al maestro por la ruta sin volver a pintar el mapa. */
export function actualizarMapa(figura, estado) {
  const ruta = figura?.querySelector('.mapa-hecho');
  const maestro = figura?.querySelector('.mapa-maestro');
  if (!ruta || !maestro) return;
  const avance = avanceDe(estado);
  ruta.setAttribute('stroke-dasharray', `${avance} 2`);
  const largo = ruta.getTotalLength();
  const p = ruta.getPointAtLength(largo * avance);
  maestro.setAttribute('transform', `translate(${p.x.toFixed(1)} ${p.y.toFixed(1)})`);
}

/** Mapa decorativo para el fondo del inicio (sin ruta). */
export function mapaFondo() {
  return `
    <svg class="mapa-fondo" viewBox="0 0 400 240" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <rect width="400" height="240" fill="var(--mapa-fondo)"/>
      <g fill="var(--mapa-manzana)">
        <rect x="-10" y="-10" width="120" height="80" rx="10"/><rect x="140" y="-10" width="90" height="70" rx="10"/>
        <rect x="260" y="-10" width="160" height="50" rx="10"/><rect x="260" y="70" width="70" height="90" rx="10"/>
        <rect x="-10" y="100" width="120" height="60" rx="10"/><rect x="140" y="90" width="90" height="70" rx="10"/>
        <rect x="-10" y="190" width="120" height="60" rx="10"/><rect x="140" y="190" width="90" height="60" rx="10"/>
        <rect x="260" y="190" width="160" height="60" rx="10"/>
      </g>
      <rect x="350" y="70" width="60" height="90" rx="10" fill="var(--mapa-parque)"/>
      <path d="M-10 84 H410 M-10 176 H410 M125 -10 V250 M245 -10 V250" stroke="#fff" stroke-width="6" opacity=".7"/>
    </svg>`;
}
