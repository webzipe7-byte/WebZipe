/** Logo de Camello (el mismo ícono de la app). */
export function logo(tamano = 40) {
  return `<img class="logo" src="icons/camello.svg" width="${tamano}" height="${tamano}" alt="" style="border-radius:${Math.round(tamano * 0.22)}px">`;
}
