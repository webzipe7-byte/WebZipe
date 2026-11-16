/**
 * Mapa decorativo del fondo del inicio.
 * El mapa con calles reales del seguimiento está en mapa-real.js.
 */

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
