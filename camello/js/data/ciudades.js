/**
 * Ciudades y municipios de Colombia donde funciona Camello.
 * Todas las capitales de departamento y las ciudades grandes de cada área
 * metropolitana. El punto es el centro de la ciudad (para el mapa cuando
 * la persona no comparte su ubicación).
 */

export const CIUDADES = [
  ['bogota', 'Bogotá', 'Bogotá D.C.', 4.711, -74.0721],
  ['medellin', 'Medellín', 'Antioquia', 6.2442, -75.5812],
  ['cali', 'Cali', 'Valle del Cauca', 3.4516, -76.532],
  ['barranquilla', 'Barranquilla', 'Atlántico', 10.9685, -74.7813],
  ['cartagena', 'Cartagena', 'Bolívar', 10.391, -75.4794],
  ['cucuta', 'Cúcuta', 'Norte de Santander', 7.8939, -72.5078],
  ['bucaramanga', 'Bucaramanga', 'Santander', 7.1193, -73.1227],
  ['pereira', 'Pereira', 'Risaralda', 4.8133, -75.6961],
  ['santa-marta', 'Santa Marta', 'Magdalena', 11.2408, -74.199],
  ['ibague', 'Ibagué', 'Tolima', 4.4389, -75.2322],
  ['pasto', 'Pasto', 'Nariño', 1.2136, -77.2811],
  ['manizales', 'Manizales', 'Caldas', 5.0703, -75.5138],
  ['neiva', 'Neiva', 'Huila', 2.9273, -75.2819],
  ['villavicencio', 'Villavicencio', 'Meta', 4.142, -73.6266],
  ['armenia', 'Armenia', 'Quindío', 4.5339, -75.6811],
  ['valledupar', 'Valledupar', 'Cesar', 10.4631, -73.2532],
  ['monteria', 'Montería', 'Córdoba', 8.7479, -75.8814],
  ['sincelejo', 'Sincelejo', 'Sucre', 9.3047, -75.3978],
  ['popayan', 'Popayán', 'Cauca', 2.4448, -76.6147],
  ['tunja', 'Tunja', 'Boyacá', 5.5353, -73.3678],
  ['riohacha', 'Riohacha', 'La Guajira', 11.5444, -72.9072],
  ['quibdo', 'Quibdó', 'Chocó', 5.6947, -76.6611],
  ['florencia', 'Florencia', 'Caquetá', 1.6144, -75.6062],
  ['yopal', 'Yopal', 'Casanare', 5.3378, -72.3959],
  ['arauca', 'Arauca', 'Arauca', 7.0847, -70.7591],
  ['mocoa', 'Mocoa', 'Putumayo', 1.152, -76.6463],
  ['san-andres', 'San Andrés', 'San Andrés y Providencia', 12.5847, -81.7006],
  ['leticia', 'Leticia', 'Amazonas', -4.2153, -69.9406],
  ['inirida', 'Inírida', 'Guainía', 3.8653, -67.9239],
  ['mitu', 'Mitú', 'Vaupés', 1.2536, -70.2346],
  ['puerto-carreno', 'Puerto Carreño', 'Vichada', 6.189, -67.4859],
  ['san-jose-del-guaviare', 'San José del Guaviare', 'Guaviare', 2.5729, -72.6459],
  ['soacha', 'Soacha', 'Cundinamarca', 4.5794, -74.2168],
  ['chia', 'Chía', 'Cundinamarca', 4.8619, -74.0328],
  ['zipaquira', 'Zipaquirá', 'Cundinamarca', 5.0221, -74.0047],
  ['facatativa', 'Facatativá', 'Cundinamarca', 4.8137, -74.3545],
  ['fusagasuga', 'Fusagasugá', 'Cundinamarca', 4.3365, -74.3638],
  ['girardot', 'Girardot', 'Cundinamarca', 4.3032, -74.8037],
  ['bello', 'Bello', 'Antioquia', 6.3373, -75.5579],
  ['itagui', 'Itagüí', 'Antioquia', 6.1846, -75.5991],
  ['envigado', 'Envigado', 'Antioquia', 6.1759, -75.5917],
  ['rionegro', 'Rionegro', 'Antioquia', 6.1551, -75.3737],
  ['apartado', 'Apartadó', 'Antioquia', 7.8829, -76.6258],
  ['soledad', 'Soledad', 'Atlántico', 10.9184, -74.7646],
  ['palmira', 'Palmira', 'Valle del Cauca', 3.5394, -76.3036],
  ['jamundi', 'Jamundí', 'Valle del Cauca', 3.261, -76.5394],
  ['candelaria', 'Candelaria', 'Valle del Cauca', 3.4069, -76.3487],
  ['buenaventura', 'Buenaventura', 'Valle del Cauca', 3.8801, -77.0312],
  ['tulua', 'Tuluá', 'Valle del Cauca', 4.0847, -76.1954],
  ['buga', 'Buga', 'Valle del Cauca', 3.9009, -76.2978],
  ['cartago', 'Cartago', 'Valle del Cauca', 4.7464, -75.9117],
  ['floridablanca', 'Floridablanca', 'Santander', 7.0622, -73.0864],
  ['barrancabermeja', 'Barrancabermeja', 'Santander', 7.0653, -73.8547],
  ['dosquebradas', 'Dosquebradas', 'Risaralda', 4.8392, -75.6673],
  ['sogamoso', 'Sogamoso', 'Boyacá', 5.7145, -72.9339],
  ['duitama', 'Duitama', 'Boyacá', 5.8269, -73.0203],
  ['ipiales', 'Ipiales', 'Nariño', 0.8303, -77.6444],
  ['tumaco', 'Tumaco', 'Nariño', 1.8067, -78.7647],
  ['maicao', 'Maicao', 'La Guajira', 11.3848, -72.2439],
  ['cienaga', 'Ciénaga', 'Magdalena', 11.007, -74.247],
  ['magangue', 'Magangué', 'Bolívar', 9.2414, -74.7543],
  ['pitalito', 'Pitalito', 'Huila', 1.8537, -76.0507],
  ['espinal', 'Espinal', 'Tolima', 4.1486, -74.8845],
].map(([id, nombre, departamento, lat, lng]) => ({ id, nombre, departamento, lat, lng }));

const PORID = new Map(CIUDADES.map((c) => [c.id, c]));

export const ciudadPorId = (id) => PORID.get(id) || null;

const sinTildes = (t) =>
  String(t || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/,.*$/, '')
    .replace(/(^|\s)(d\.?\s?c\.?|distrito capital)(?=\s|$)/g, ' ')
    .replace(/^distrito\s.*?\bde\s/, '')
    .replace(/\s(ciudad|urbano|municipio)$/, '')
    .replace(/\s+/g, ' ')
    .trim();
const PORNOMBRE = new Map(CIUDADES.map((c) => [sinTildes(c.nombre), c]));

/** Ciudad de la lista por su nombre como lo escribe el mapa ("Bogotá D.C.", "Medellin", "Santiago de Cali"). */
export function ciudadPorNombre(nombre) {
  const n = sinTildes(nombre);
  if (!n) return null;
  const sinPrefijo = n.replace(/^santiago de /, '').replace(/^san jose de /, '');
  return PORNOMBRE.get(n) || PORNOMBRE.get(sinPrefijo) || PORNOMBRE.get(sinPrefijo.replace(/ de indias$/, '')) || null;
}

/** Lista ordenada para los selectores: primero las más grandes, luego el resto por nombre. */
const PRINCIPALES = 12;
export const CIUDADES_SELECTOR = [
  ...CIUDADES.slice(0, PRINCIPALES),
  ...CIUDADES.slice(PRINCIPALES).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')),
];

/** La ciudad de la lista más cercana a un punto GPS (máximo 60 km; si no, null). */
export function ciudadMasCercana(p) {
  if (!p) return null;
  let mejor = null;
  let menor = Infinity;
  for (const c of CIUDADES) {
    const d = Math.hypot((c.lat - p.lat) * 111, (c.lng - p.lng) * 111 * Math.cos((p.lat * Math.PI) / 180));
    if (d < menor) {
      menor = d;
      mejor = c;
    }
  }
  return menor <= 60 ? mejor : null;
}
