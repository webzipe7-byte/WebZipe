/**
 * Convierte lo que escribe la persona en un punto real del mapa, en toda Colombia.
 *
 * - Sugerencias mientras escribe: Photon (komoot), que busca sobre OpenStreetMap
 *   y encuentra lugares ("Jardín Plaza"), barrios y calles.
 * - Al continuar sin elegir sugerencia: Nominatim (OpenStreetMap) busca la dirección.
 * - De un punto GPS a una dirección escrita: Photon (búsqueda inversa).
 *
 * Nunca se inventa un punto: si no se encuentra, la persona lo marca en el mapa.
 */
import { ciudadPorId, ciudadMasCercana } from '../data/ciudades.js';
import { distanciaKm } from './ubicacion.js';

const PHOTON = 'https://photon.komoot.io';
const NOMINATIM = 'https://nominatim.openstreetmap.org';
/** Recuadro de Colombia (oeste, sur, este, norte), incluye San Andrés. */
const COLOMBIA = '-81.8,-4.3,-66.8,13.6';
/** Más lejos que esto del centro de la ciudad elegida ya no se considera de esa ciudad. */
const RADIO_CIUDAD_KM = 30;

const normal = (t) =>
  String(t || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');

/**
 * Las direcciones colombianas se escriben "Calle 5 # 38-20", "Cra 43A No. 1 Sur-150".
 * Los buscadores las entienden mejor sin "#", "No." y con las abreviaturas completas.
 */
export function limpiarDireccion(texto) {
  return String(texto)
    .replace(/\bn[oº°]\.?\s*(?=\d)/gi, ' ')
    .replace(/#/g, ' ')
    .replace(/\b(cra|kra|kr|cr|carr)\.?(?=\s|\d)/gi, 'Carrera')
    .replace(/\b(cl|cll)\.?(?=\s|\d)/gi, 'Calle')
    .replace(/\b(av|avda)\.?(?=\s|\d)/gi, 'Avenida')
    .replace(/\b(tv|trans|transv)\.?(?=\s|\d)/gi, 'Transversal')
    .replace(/\b(dg|diag)\.?(?=\s|\d)/gi, 'Diagonal')
    .replace(/\s+/g, ' ')
    .trim();
}

const compacto = (t) => normal(t).replace(/\s+/g, '');

/**
 * Lee una dirección con nomenclatura colombiana: "Calle 5 38-20", "Carrera 43A 1 Sur-150".
 * Devuelve { via: 'calle 5', cruce: '38', placa: 20 } o null si no tiene esa forma.
 */
export function leerNomenclatura(texto) {
  const t = normal(limpiarDireccion(texto)).replace(/,.*$/, '');
  // Número con letra opcional (43A, 5 bis, 68B): la letra no puede ser el inicio de una palabra ("Sur")
  const num = '(\\d{1,3}(?:\\s?[a-z](?![a-z]))?(?:\\s?bis)?(?:\\s?[a-z](?![a-z]))?)';
  const m = t.match(new RegExp(`^(?:avenida\\s+)?(calle|carrera|transversal|diagonal|avenida)\\s+${num}(\\s+(?:sur|este|norte|oeste))?\\s+${num}(\\s+(?:sur|este))?(?:\\s*-\\s*(\\d{1,3}))?`));
  if (!m) return null;
  return {
    via: `${m[1]} ${m[2].replace(/\s+/g, '')}${m[3] || ''}`.trim(),
    cruce: `${m[4].replace(/\s+/g, '')}${m[5] || ''}`.trim(),
    placa: m[6] ? Number(m[6]) : null,
  };
}

/**
 * Ubica la cuadra de una dirección con nomenclatura buscando lugares registrados
 * en esa misma cuadra (por ejemplo, "Calle 5 # 38-48" para "Calle 5 # 38-20").
 * Devuelve { lat, lng, barrio } o null.
 */
async function buscarCuadra(n, ciudad, signal) {
  const parametros = new URLSearchParams({ q: `${n.via} ${n.cruce}`, limit: '50', bbox: COLOMBIA });
  if (ciudad) {
    parametros.set('lat', ciudad.lat);
    parametros.set('lon', ciudad.lng);
  }
  const r = await fetch(`${PHOTON}/api/?${parametros}`, { signal });
  if (!r.ok) return null;
  const via = compacto(n.via);
  const cruce = compacto(n.cruce);
  let mejor = null;
  for (const f of (await r.json()).features || []) {
    const p = f.properties;
    const calle = compacto(p.street).replace(/^avenida/, '');
    const placa = compacto(p.housenumber);
    if (calle !== via || !placa.startsWith(cruce)) continue;
    const [lng, lat] = f.geometry.coordinates;
    if (ciudad && distanciaKm(ciudad, { lat, lng }) > RADIO_CIUDAD_KM) continue;
    // Mejor si el cruce es exacto (38-… y no 38D-…) y la placa está cerca de la buscada
    const siguiente = placa.charAt(cruce.length);
    const exacto = !siguiente || !/[a-z]/.test(siguiente);
    const numPlaca = Number((placa.slice(cruce.length).match(/\d+/) || [])[0]);
    const puntaje = (exacto ? 0 : 1000) + (n.placa != null && Number.isFinite(numPlaca) ? Math.abs(numPlaca - n.placa) : 500);
    if (!mejor || puntaje < mejor.puntaje) mejor = { lat, lng, barrio: p.district || p.locality || '', puntaje };
  }
  return mejor;
}

/** Agrega la ciudad a la búsqueda si la persona no la escribió. */
function conCiudad(texto, ciudad) {
  if (!ciudad || normal(texto).includes(normal(ciudad.nombre))) return texto;
  return `${texto}, ${ciudad.nombre}`;
}

/** Arma un nombre corto y uno de detalle para mostrar una sugerencia de Photon. */
function describir(p) {
  const calle = [p.street, p.housenumber].filter(Boolean).join(' ');
  const titulo = p.name || calle || p.district || p.city || 'Ubicación';
  const zona = [p.name && calle ? calle : '', p.district || p.locality || '', p.city || p.county || '']
    .filter((x, i, a) => x && a.indexOf(x) === i && x !== titulo)
    .join(', ');
  return { titulo, detalle: zona };
}

/**
 * Sugerencias para lo que va escribiendo.
 * Devuelve [{ titulo, detalle, lat, lng, ciudad }], primero las de la ciudad elegida.
 */
export async function sugerir(texto, ciudadId, { signal } = {}) {
  const q = limpiarDireccion(texto);
  if (q.length < 3) return [];
  const ciudad = ciudadPorId(ciudadId);

  // "Calle 5 # 38-20": se ubica la cuadra y se sugiere la misma dirección que escribió
  const n = leerNomenclatura(texto);
  if (n) {
    const cuadra = await buscarCuadra(n, ciudad, signal);
    if (!cuadra) return [];
    return [{
      titulo: texto.trim().replace(/\s+/g, ' '),
      detalle: [cuadra.barrio, ciudad?.nombre].filter(Boolean).join(', '),
      lat: cuadra.lat,
      lng: cuadra.lng,
      km: 0,
      ciudad: ciudadMasCercana(cuadra)?.id || ciudadId,
    }];
  }
  const parametros = new URLSearchParams({ q: conCiudad(q, ciudad), limit: '10', bbox: COLOMBIA });
  if (ciudad) {
    parametros.set('lat', ciudad.lat);
    parametros.set('lon', ciudad.lng);
  }
  const r = await fetch(`${PHOTON}/api/?${parametros}`, { signal });
  if (!r.ok) throw new Error('No pudimos buscar la dirección ahora.');
  const datos = await r.json();
  const vistos = new Set();
  const lista = (datos.features || [])
    .filter((f) => f.properties?.countrycode === 'CO')
    .map((f) => {
      const [lng, lat] = f.geometry.coordinates;
      const { titulo, detalle } = describir(f.properties);
      const km = ciudad ? distanciaKm(ciudad, { lat, lng }) : 0;
      const enLaCiudad = !!ciudad && normal(f.properties.city || f.properties.county || '') === normal(ciudad.nombre);
      return { titulo, detalle, lat, lng, km, enLaCiudad, ciudad: ciudadMasCercana({ lat, lng })?.id || '' };
    })
    .filter((s) => {
      const clave = `${s.titulo}|${s.detalle}`;
      if (vistos.has(clave)) return false;
      vistos.add(clave);
      return true;
    });
  // Primero las del mismo municipio, luego las cercanas; las lejanas solo si no hay nada cerca
  const cerca = lista.filter((s) => s.km <= RADIO_CIUDAD_KM).sort((a, b) => b.enLaCiudad - a.enLaCiudad || a.km - b.km);
  return (cerca.length ? cerca : lista).slice(0, 6);
}

/**
 * Busca una dirección escrita completa (cuando no se eligió una sugerencia).
 * Devuelve { lat, lng, exacta } o null. `exacta` es false si solo encontró la calle o el barrio.
 */
export async function ubicarDireccion(texto, ciudadId) {
  const ciudad = ciudadPorId(ciudadId);
  const n = leerNomenclatura(texto);
  if (n) {
    try {
      const cuadra = await buscarCuadra(n, ciudad);
      if (cuadra) return { lat: cuadra.lat, lng: cuadra.lng, exacta: true, cuadra: true };
    } catch {
      /* se intenta con el otro buscador */
    }
  }
  const q = conCiudad(limpiarDireccion(texto), ciudad);
  const parametros = new URLSearchParams({ format: 'jsonv2', countrycodes: 'co', limit: '3', addressdetails: '0', q });
  if (ciudad) {
    // Se busca solo dentro de la zona de la ciudad
    const d = 0.3;
    parametros.set('viewbox', `${ciudad.lng - d},${ciudad.lat + d},${ciudad.lng + d},${ciudad.lat - d}`);
    parametros.set('bounded', '1');
  }
  try {
    const r = await fetch(`${NOMINATIM}/search?${parametros}`, { headers: { 'Accept-Language': 'es' } });
    if (!r.ok) return null;
    const [mejor] = await r.json();
    if (!mejor) return null;
    const punto = { lat: Number(mejor.lat), lng: Number(mejor.lon) };
    if (ciudad && distanciaKm(ciudad, punto) > RADIO_CIUDAD_KM) return null;
    const exacta = ['house', 'building', 'amenity', 'shop', 'office', 'tourism', 'leisure'].includes(mejor.category) || mejor.type === 'house';
    return { ...punto, exacta };
  } catch {
    return null;
  }
}

/** De un punto a una dirección legible ("Calle 16 # 100-20, Ciudad Jardín"). */
export async function direccionDe(punto) {
  try {
    const r = await fetch(`${PHOTON}/reverse?lat=${punto.lat}&lon=${punto.lng}&limit=1`);
    if (!r.ok) return '';
    const [f] = (await r.json()).features || [];
    if (!f) return '';
    const p = f.properties;
    const calle = [p.street, p.housenumber].filter(Boolean).join(' ');
    return [calle || p.name, p.district || p.locality].filter(Boolean).join(', ');
  } catch {
    return '';
  }
}
