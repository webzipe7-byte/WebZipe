/** Logo de Camello: silueta de un camello sobre la línea de la arena. */
export const CAMELLO_PATH =
  'M9 37c0-5 3-8 7-8 2 0 3-6 7-6s4.5 6 7 6 3-7 7.5-7 4.5 6 5.5 8l4-10c.8-2 2.6-3 4.6-2.6l2.4.6v2.4l-2.8.4-4.3 12.6c-.6 1.8-2 3-3.6 3.3V47h-3.4v-8H20v8h-3.4v-8.4C12.4 37.8 9 37 9 37Z';

export function logo(tamano = 40) {
  return `<svg class="logo" width="${tamano}" height="${tamano}" viewBox="0 0 64 64" aria-hidden="true">
    <rect width="64" height="64" rx="18" fill="var(--marca)"/>
    <path d="${CAMELLO_PATH}" fill="#fff"/>
    <path d="M10 51h44" stroke="var(--acento)" stroke-width="3.5" stroke-linecap="round"/>
  </svg>`;
}
