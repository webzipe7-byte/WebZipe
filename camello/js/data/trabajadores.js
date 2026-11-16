/**
 * Trabajadores de ejemplo para el demo.
 * Son datos inventados: nombres, calificaciones y reseñas no corresponden a personas reales.
 * Cuando exista la cuenta de trabajador, esta lista vendrá del servidor.
 */

const PERSONAS = {
  cerrajero: [
    ['Carlos', 'Mejía', 14], ['Andrés', 'Rojas', 9], ['Luz Marina', 'Ortiz', 6], ['Jhon', 'Quintero', 11], ['Fabio', 'Lozano', 3],
  ],
  plomero: [
    ['Hernán', 'Cárdenas', 18], ['Wilson', 'Arango', 7], ['Diego', 'Salazar', 12], ['Yamileth', 'Rivas', 5], ['Óscar', 'Bermúdez', 9],
  ],
  electricista: [
    ['Julián', 'Castaño', 10], ['Rubén', 'Gómez', 22], ['Paola', 'Henao', 6], ['Edwin', 'Murillo', 8], ['Alexander', 'Vélez', 4],
  ],
  pintor: [
    ['Gustavo', 'Ramírez', 16], ['Mauricio', 'Peña', 9], ['Sandra', 'Llanos', 7], ['Freddy', 'Ocampo', 12], ['Camilo', 'Torres', 3],
  ],
  carpintero: [
    ['Álvaro', 'Restrepo', 25], ['Jairo', 'Muñoz', 13], ['Nelson', 'Cifuentes', 8], ['Liliana', 'Zapata', 6], ['Brayan', 'Mosquera', 4],
  ],
  limpieza: [
    ['Gloria', 'Patiño', 11], ['Marleny', 'Caicedo', 8], ['Diana', 'Valencia', 5], ['Rosa', 'Angulo', 14], ['Esteban', 'Díaz', 3],
  ],
  electrodomesticos: [
    ['Ricardo', 'Montoya', 15], ['Fernando', 'Ospina', 10], ['Johana', 'Marín', 7], ['Héctor', 'Sánchez', 20], ['Kevin', 'Londoño', 4],
  ],
};

/** Maestras (para el filtro "Solo maestras"). */
const MUJERES = new Set(['Luz Marina', 'Yamileth', 'Paola', 'Sandra', 'Liliana', 'Gloria', 'Marleny', 'Diana', 'Rosa', 'Johana']);

const ESPECIALIDADES = {
  cerrajero: ['Apertura de puertas', 'Cambio de guardas', 'Chapas de seguridad', 'Cajas fuertes'],
  plomero: ['Fugas', 'Destapes', 'Calentadores', 'Instalación de griferías'],
  electricista: ['Cortos circuitos', 'Tableros', 'Iluminación', 'Instalaciones nuevas'],
  pintor: ['Interiores', 'Fachadas', 'Humedades', 'Estuco y drywall'],
  carpintero: ['Puertas', 'Closets', 'Cocinas integrales', 'Muebles a medida'],
  limpieza: ['Aseo general', 'Post obra', 'Muebles y tapetes', 'Desinfección'],
  electrodomesticos: ['Neveras', 'Lavadoras', 'Estufas y hornos', 'Mantenimiento preventivo'],
};

const COMENTARIOS = [
  ['Llegó rápido y resolvió el problema en poco tiempo.', 5],
  ['Muy amable y ordenado. Dejó todo limpio.', 5],
  ['Explicó todo antes de empezar y cumplió con el precio.', 5],
  ['Buen trabajo, aunque llegó un poco después de lo indicado.', 4],
  ['Excelente, lo vuelvo a llamar sin duda.', 5],
  ['Muy profesional. Trajo todas las herramientas.', 5],
  ['Cumplió, pero el repuesto costó más de lo esperado.', 4],
  ['Puntual y con muy buena actitud.', 5],
];

const CLIENTES = ['Valentina G.', 'Juan P.', 'Mariana C.', 'Sebastián R.', 'Laura M.', 'Felipe A.', 'Natalia O.', 'David H.'];

/** Colores para la foto de cada maestro (mientras no haya fotos reales). */
const COLORES = ['#2445E8', '#0F766E', '#B45309', '#7C3AED', '#BE123C', '#0369A1', '#4D7C0F', '#C2410C'];

/** Generador pseudoaleatorio con semilla (mulberry32), para que los datos sean siempre los mismos. */
function aleatorio(semilla) {
  let a = semilla >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function crearTrabajadores() {
  const lista = [];
  let semilla = 7;

  Object.entries(PERSONAS).forEach(([categoria, personas]) => {
    personas.forEach(([nombre, apellido, anios], i) => {
      const r = aleatorio(semilla++ * 7919);
      const calificacion = Math.round((4.3 + r() * 0.7) * 10) / 10;
      const resenas = Array.from({ length: 3 }, (_, k) => {
        const [texto, estrellas] = COMENTARIOS[Math.floor(r() * COMENTARIOS.length)];
        return {
          cliente: CLIENTES[(i + k * 3) % CLIENTES.length],
          estrellas,
          texto,
          hace: ['hace 2 días', 'hace 1 semana', 'hace 3 semanas'][k],
        };
      });

      lista.push({
        id: `${categoria}-${i + 1}`,
        categoria,
        nombre,
        apellido,
        anios,
        calificacion,
        trabajos: Math.round(anios * 18 + r() * 60),
        distanciaKm: Math.round((0.6 + r() * 5.4) * 10) / 10,
        // factor de precio: los más experimentados cobran un poco más
        factorPrecio: Math.round((0.85 + anios / 60 + r() * 0.15) * 100) / 100,
        especialidades: ESPECIALIDADES[categoria],
        verificado: r() > 0.25,
        mujer: MUJERES.has(nombre),
        color: COLORES[(lista.length * 3) % COLORES.length],
        resenas,
      });
    });
  });

  return lista;
}

export const TRABAJADORES = crearTrabajadores();
