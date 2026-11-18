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
      return { titulo, detalle, lat, lng, km, ciudad: ciudadMasCercana({ lat, lng })?.id || '' };
    })
    .filter((s) => {
      const clave = `${s.titulo}|${s.detalle}`;
      if (vistos.has(clave)) return false;
      vistos.add(clave);
      return true;
    });
  // Las de la ciudad elegida van primero; las lejanas solo si no hay de la ciudad
  const cerca = lista.filter((s) => s.km <= RADIO_CIUDAD_KM);
  return (cerca.length ? cerca : lista).slice(0, 6);
}

/**
 * Busca una dirección escrita completa (cuando no se eligió una sugerencia).
 * Devuelve { lat, lng, exacta } o null. `exacta` es false si solo encontró la calle o el barrio.
 */
export async function ubicarDireccion(texto, ciudadId) {
  const ciudad = ciudadPorId(ciudadId);
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
