/**
 * Categorías de servicio.
 * - plural: cómo se nombra el grupo en la lista de disponibles.
 * - precioBase: mano de obra estimada para un trabajo típico (COP).
 * - visita: valor de la visita.
 * - palabras: términos que la gente escribe en el buscador.
 * - sugerencias: problemas frecuentes para llenar la descripción con un toque.
 */
export const CATEGORIAS = [
  {
    id: 'cerrajero',
    plural: 'Cerrajeros',
    nombre: 'Cerrajero',
    icono: 'llave',
    color: '#F59E0B',
    visita: 25000,
    precioBase: 60000,
    palabras: ['chapa', 'cerradura', 'llave', 'puerta', 'candado', 'encerrado', 'afuera', 'cerrajeria', 'guarda'],
    sugerencias: ['Me quedé afuera', 'La chapa está dañada', 'Perdí las llaves', 'Cambiar guarda'],
  },
  {
    id: 'plomero',
    plural: 'Plomeros',
    nombre: 'Plomero',
    icono: 'gota',
    color: '#0EA5E9',
    visita: 25000,
    precioBase: 70000,
    palabras: ['fuga', 'agua', 'tuberia', 'tubo', 'baño', 'sanitario', 'llave de agua', 'lavamanos', 'ducha', 'desague', 'taponado', 'goteo'],
    sugerencias: ['Hay una fuga de agua', 'Sanitario tapado', 'La ducha no sirve', 'Cambiar una llave'],
  },
  {
    id: 'electricista',
    plural: 'Electricistas',
    nombre: 'Electricista',
    icono: 'rayo',
    color: '#EAB308',
    visita: 30000,
    precioBase: 75000,
    palabras: ['luz', 'corto', 'enchufe', 'toma', 'tomacorriente', 'breaker', 'taco', 'cable', 'bombillo', 'lampara', 'electrico', 'electricidad'],
    sugerencias: ['Se fue la luz', 'Un enchufe no funciona', 'Instalar una lámpara', 'Saltan los tacos'],
  },
  {
    id: 'pintor',
    plural: 'Pintores',
    nombre: 'Pintor',
    icono: 'rodillo',
    color: '#EC4899',
    visita: 20000,
    precioBase: 120000,
    palabras: ['pintura', 'pintar', 'pared', 'humedad', 'estuco', 'fachada', 'habitacion'],
    sugerencias: ['Pintar una habitación', 'Arreglar humedad', 'Pintar la fachada', 'Retocar paredes'],
  },
  {
    id: 'carpintero',
    plural: 'Carpinteros',
    nombre: 'Carpintero',
    icono: 'martillo',
    color: '#A16207',
    visita: 25000,
    precioBase: 90000,
    palabras: ['madera', 'mueble', 'closet', 'puerta', 'cajon', 'bisagra', 'repisa', 'cocina integral', 'carpinteria'],
    sugerencias: ['Arreglar una puerta', 'Armar un mueble', 'Ajustar el closet', 'Instalar repisas'],
  },
  {
    id: 'limpieza',
    plural: 'Personal de limpieza',
    nombre: 'Limpieza',
    icono: 'brillo',
    color: '#10B981',
    visita: 0,
    precioBase: 80000,
    palabras: ['aseo', 'limpiar', 'limpieza', 'trapear', 'desinfectar', 'muebles', 'mudanza', 'ventanas'],
    sugerencias: ['Aseo general', 'Limpieza después de obra', 'Limpiar muebles', 'Limpieza de ventanas'],
  },
  {
    id: 'electrodomesticos',
    plural: 'Técnicos',
    nombre: 'Técnico de electrodomésticos',
    nombreCorto: 'Electrodomésticos',
    icono: 'lavadora',
    color: '#6366F1',
    visita: 30000,
    precioBase: 85000,
    palabras: ['nevera', 'lavadora', 'secadora', 'estufa', 'horno', 'microondas', 'televisor', 'tv', 'aire acondicionado', 'nevecon', 'refrigerador'],
    sugerencias: ['La nevera no enfría', 'La lavadora no centrifuga', 'La estufa no prende', 'Mantenimiento'],
  },
];

export const categoriaPorId = (id) => CATEGORIAS.find((c) => c.id === id);

/** Nombre del oficio según el maestro o la maestra: "Cerrajero" / "Cerrajera". */
export function oficioDe(t) {
  const nombre = categoriaPorId(t.categoria).nombre;
  if (!t.mujer) return nombre;
  return nombre.replace('Técnico', 'Técnica').replace(/^(\S*?)o(\s|$)/, '$1a$2').replace(/^Pintor$/, 'Pintora');
}
