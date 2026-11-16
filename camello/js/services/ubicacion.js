/**
 * Ubicación: GPS del teléfono, distancias y posición de los maestros.
 */
import { almacen } from './almacen.js';
import { subirPosicion } from './sincronizar.js';

/** Centro de Cali, por si el teléfono no da la ubicación. */
export const CENTRO = { lat: 3.4516, lng: -76.532 };

/** Una posición vieja (más de 2 minutos) ya no se toma como en vivo. */
const VIGENCIA_MS = 2 * 60 * 1000;

const rad = (g) => (g * Math.PI) / 180;

/** Distancia en km entre dos puntos (fórmula del haversine). */
export function distanciaKm(a, b) {
  if (!a || !b) return null;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
}

/**
 * Punto aproximado para una dirección escrita, dentro de Cali.
 * Siempre da el mismo punto para la misma dirección.
 */
export function puntoAproximado(texto = '') {
  let h = 2166136261;
  for (const c of texto.toLowerCase()) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0;
  const a = ((h & 0xffff) / 0xffff - 0.5) * 0.06;
  const b = (((h >>> 16) & 0xffff) / 0xffff - 0.5) * 0.06;
  return { lat: +(CENTRO.lat + a).toFixed(5), lng: +(CENTRO.lng + b).toFixed(5), aproximada: true };
}

const valido = (p) =>
  p && Number.isFinite(p.lat) && Number.isFinite(p.lng) && Math.abs(p.lat) <= 90 && Math.abs(p.lng) <= 180;

/** Pide la ubicación actual al teléfono. Rechaza con un mensaje claro si no se puede. */
export function miUbicacion() {
  return new Promise((resolver, rechazar) => {
    if (!navigator.geolocation) return rechazar(new Error('Este teléfono no permite compartir la ubicación.'));
    navigator.geolocation.getCurrentPosition(
      (pos) => resolver({ lat: +pos.coords.latitude.toFixed(6), lng: +pos.coords.longitude.toFixed(6), precision: Math.round(pos.coords.accuracy) }),
      (err) =>
        rechazar(
          new Error(err.code === 1 ? 'No diste permiso para usar tu ubicación. Actívalo en los ajustes del navegador.' : 'No pudimos encontrar tu ubicación. Escribe la dirección.')
        ),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    );
  });
}

/** Sigue la posición del maestro mientras está conectado. Devuelve la función para parar. */
export function seguirMaestro(maestroId) {
  if (!navigator.geolocation) return () => {};
  const id = navigator.geolocation.watchPosition(
    (pos) => guardarPosicion(maestroId, { lat: pos.coords.latitude, lng: pos.coords.longitude }),
    () => {
      /* sin permiso: se usa la posición aproximada */
    },
    { enableHighAccuracy: true, maximumAge: 15000 }
  );
  return () => navigator.geolocation.clearWatch(id);
}

export function guardarPosicion(maestroId, punto) {
  if (!valido(punto)) return;
  const p = { lat: +punto.lat.toFixed(6), lng: +punto.lng.toFixed(6) };
  almacen.guardar(`ubicacion:${maestroId}`, { ...p, fecha: Date.now() });
  subirPosicion(p);
}

/** Posición en vivo del maestro, o null si no la ha compartido hace poco. */
export function posicionEnVivo(maestroId) {
  const p = almacen.leer(`ubicacion:${maestroId}`, null);
  return valido(p) && Date.now() - p.fecha < VIGENCIA_MS ? p : null;
}

/** Punto entre a y b según el avance (0 = en a, 1 = en b). */
export const interpolar = (a, b, t) => ({ lat: a.lat + (b.lat - a.lat) * t, lng: a.lng + (b.lng - a.lng) * t });

/** Punto de partida simulado del maestro: a cierta distancia del cliente. */
export function puntoDeSalida(destino, km = 2, semilla = 'x') {
  let h = 7;
  for (const c of semilla) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const ang = (h % 360) * (Math.PI / 180);
  const grados = km / 111;
  return { lat: destino.lat + Math.sin(ang) * grados, lng: destino.lng + Math.cos(ang) * grados };
}

export const enlaceMapas = (p) => `https://www.google.com/maps/search/?api=1&query=${p.lat},${p.lng}`;
export const enlaceRuta = (p) => `https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}`;
