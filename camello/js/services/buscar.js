/**
 * Buscador de la pantalla de inicio: convierte lo que escribe la persona
 * ("se me dañó la chapa") en la categoría correcta.
 */
import { CATEGORIAS } from '../data/categorias.js';

/** Quita tildes y mayúsculas para comparar sin problemas. */
export const normalizar = (texto) =>
  texto.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();

export function buscarCategorias(consulta) {
  const q = normalizar(consulta);
  if (q.length < 2) return [];

  const palabras = q.split(/\s+/);
  return CATEGORIAS.map((cat) => {
    let puntos = 0;
    const nombre = normalizar(cat.nombre);
    if (nombre.includes(q)) puntos += 10;
    cat.palabras.forEach((p) => {
      const pal = normalizar(p);
      if (q.includes(pal)) puntos += 6;
      palabras.forEach((w) => {
        if (w.length >= 3 && (pal.startsWith(w) || w.startsWith(pal))) puntos += 3;
      });
    });
    palabras.forEach((w) => {
      if (w.length >= 3 && nombre.split(' ').some((n) => n.startsWith(w))) puntos += 5;
    });
    return { cat, puntos };
  })
    .filter((r) => r.puntos > 0)
    .sort((a, b) => b.puntos - a.puntos)
    .map((r) => r.cat);
}
