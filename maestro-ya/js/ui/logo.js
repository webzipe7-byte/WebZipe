/** Logo de Maestro Ya: una casa con una herramienta, en un círculo de marca. */
export function logo(tamano = 40) {
  return `<svg class="logo" width="${tamano}" height="${tamano}" viewBox="0 0 64 64" aria-hidden="true">
    <rect width="64" height="64" rx="18" fill="var(--marca)"/>
    <path d="M15 31 32 17l17 14" fill="none" stroke="#fff" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M20 29v17h24V29" fill="none" stroke="#fff" stroke-width="4.5" stroke-linejoin="round"/>
    <path d="m27 41 9-9m-2-2 4-1 1-4" fill="none" stroke="var(--acento)" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;
}
