/**
 * Validaciones de formularios. Cada función devuelve un mensaje de error
 * listo para mostrar, o una cadena vacía si el valor es correcto.
 */

export function validarNombre(valor) {
  const v = valor.trim();
  if (!v) return 'Escribe tu nombre.';
  if (v.length < 3) return 'El nombre es muy corto.';
  if (!/^[\p{L} .'-]+$/u.test(v)) return 'Usa solo letras y espacios.';
  return '';
}

export function validarCorreo(valor) {
  const v = valor.trim();
  if (!v) return 'Escribe tu correo.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) return 'El correo no es válido. Ejemplo: nombre@correo.com';
  return '';
}

export function validarTelefono(valor) {
  const digitos = valor.replace(/\D/g, '');
  if (!digitos) return 'Escribe tu número de celular.';
  if (digitos.length < 10 || digitos.length > 12) return 'El celular debe tener 10 dígitos.';
  return '';
}

export function validarContrasena(valor) {
  if (!valor) return 'Crea una contraseña.';
  if (valor.length < 8) return 'Debe tener al menos 8 caracteres.';
  if (!/[A-Za-z]/.test(valor) || !/\d/.test(valor)) return 'Combina letras y números.';
  return '';
}

export function validarIgual(valor, original) {
  if (!valor) return 'Repite la contraseña.';
  if (valor !== original) return 'Las contraseñas no coinciden.';
  return '';
}

export function validarRequerido(valor, mensaje) {
  return valor && String(valor).trim() ? '' : mensaje;
}

/** Deja el celular en formato legible: 300 123 4567 */
export function formatearTelefono(valor) {
  const d = valor.replace(/\D/g, '').slice(-10);
  if (d.length !== 10) return valor.trim();
  return `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6)}`;
}
