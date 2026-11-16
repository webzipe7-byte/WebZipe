/**
 * Íconos en SVG (trazo de 24x24). Se usan como texto dentro de las plantillas.
 */
const P = {
  llave: '<circle cx="8" cy="15" r="4"/><path d="M10.8 12.2 20 3M17 6l3 3M14 9l2 2"/>',
  gota: '<path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11Z"/>',
  rayo: '<path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z"/>',
  rodillo: '<rect x="3" y="3" width="15" height="6" rx="1.5"/><path d="M18 6h2v5h-8v3"/><rect x="10.5" y="14" width="3" height="7" rx="1"/>',
  martillo: '<path d="m14 7 3-3 4 4-3 3"/><path d="M14 7 4 17a2 2 0 0 0 3 3l10-10"/><path d="m11 4 3 3"/>',
  brillo: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2 2M16 16l2 2M6 18l2-2M16 8l2-2"/>',
  lavadora: '<rect x="4" y="2.5" width="16" height="19" rx="2"/><circle cx="12" cy="13.5" r="4.5"/><path d="M8 6h.01M11 6h4"/>',
  buscar: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
  inicio: '<path d="M3 11 12 4l9 7"/><path d="M5 10v10h5v-6h4v6h5V10"/>',
  pedidos: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 8h6M9 12h6M9 16h4"/>',
  perfil: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1.6-4 4.5-6 8-6s6.4 2 8 6"/>',
  atras: '<path d="M15 5l-7 7 7 7"/>',
  cerrar: '<path d="M6 6l12 12M18 6 6 18"/>',
  derecha: '<path d="m9 5 7 7-7 7"/>',
  estrella: '<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 3Z"/>',
  ubicacion: '<path d="M12 21s-7-6.2-7-12a7 7 0 0 1 14 0c0 5.8-7 12-7 12Z"/><circle cx="12" cy="9" r="2.5"/>',
  reloj: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  calendario: '<rect x="3.5" y="5" width="17" height="15.5" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
  urgente: '<path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z"/>',
  check: '<path d="m5 12 4.5 4.5L19 7"/>',
  verificado: '<path d="M12 2.5 14.6 5l3.5-.4.7 3.5 3 1.9-1.6 3.1 1.6 3.1-3 1.9-.7 3.5-3.5-.4L12 23.5 9.4 21l-3.5.4-.7-3.5-3-1.9 1.6-3.1L2.2 9.9l3-1.9.7-3.5 3.5.4L12 2.5Z"/><path d="m8.5 12.5 2.5 2.5 4.5-5"/>',
  tarjeta: '<rect x="2.5" y="5" width="19" height="14" rx="2"/><path d="M2.5 10h19M6 15h4"/>',
  celular: '<rect x="6.5" y="2.5" width="11" height="19" rx="2"/><path d="M11 18.5h2"/>',
  billete: '<rect x="2.5" y="6" width="19" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M6 9v.01M18 15v.01"/>',
  telefono: '<path d="M5 3h3.5l2 5-2.5 1.5a11 11 0 0 0 6.5 6.5L16 13.5l5 2V19a2 2 0 0 1-2 2A16 16 0 0 1 3 5a2 2 0 0 1 2-2Z"/>',
  chat: '<path d="M4 5h16v11H9l-5 4V5Z"/>',
  salir: '<path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 17l5-5-5-5M15 12H3"/>',
  editar: '<path d="M4 20h4L19 9l-4-4L4 16v4Z"/><path d="m13.5 6.5 4 4"/>',
  candado: '<rect x="4.5" y="10.5" width="15" height="10" rx="2"/><path d="M8 10.5V7a4 4 0 0 1 8 0v3.5"/>',
  ojo: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
  ojoNo: '<path d="M3 3l18 18M10.6 5.1A10 10 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-3.1 3.9M6.6 6.6C3.8 8.4 2 12 2 12s3.6 7 10 7a9.8 9.8 0 0 0 5.4-1.6M9.9 9.9a3 3 0 0 0 4.2 4.2"/>',
  alerta: '<path d="M12 3 2 20h20L12 3Z"/><path d="M12 10v4M12 17h.01"/>',
  wifi: '<path d="M2 8.5a15 15 0 0 1 20 0M5.5 12a10 10 0 0 1 13 0M9 15.5a5 5 0 0 1 6 0M12 19h.01"/>',
  mas: '<path d="M12 5v14M5 12h14"/>',
  filtro: '<path d="M4 6h16M7 12h10M10 18h4"/>',
  escudo: '<path d="M12 3 4.5 6v6c0 4.5 3.2 7.8 7.5 9 4.3-1.2 7.5-4.5 7.5-9V6L12 3Z"/><path d="m9 12 2 2 4-4"/>',
  maletin: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M3 13h18"/>',
  casa: '<path d="M3 11 12 4l9 7"/><path d="M5 10v10h14V10"/>',
  descargar: '<path d="M12 4v11M7 10l5 5 5-5M4 20h16"/>',
};

export function icono(nombre, { tamano = 24, clase = '', relleno = false } = {}) {
  const trazo = P[nombre] || P.alerta;
  return `<svg class="ico ${clase}" width="${tamano}" height="${tamano}" viewBox="0 0 24 24" fill="${relleno ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${trazo}</svg>`;
}
