import { CATEGORIAS } from '../data/categorias.js';
import { iconoCategoria } from '../ui/componentes.js';
import { logo } from '../ui/logo.js';

export function pantallaBienvenida(raiz) {
  // Los íconos de las categorías giran alrededor del logo como "órbita"
  const orbita = CATEGORIAS.map((c, i) => {
    const ang = (i / CATEGORIAS.length) * Math.PI * 2 - Math.PI / 2;
    const x = 50 + Math.cos(ang) * 40;
    const y = 50 + Math.sin(ang) * 40;
    return `<span class="orbita-item" style="left:${x}%;top:${y}%;animation-delay:${i * 90}ms">${iconoCategoria(c, 52)}</span>`;
  }).join('');

  raiz.innerHTML = `
    <section class="bienvenida">
      <div class="orbita" aria-hidden="true">
        ${orbita}
        <span class="orbita-centro">${logo(64)}</span>
      </div>
      <div class="bienvenida-texto">
        <h1 tabindex="-1">Un maestro en tu puerta en minutos</h1>
        <p>Cerrajeros, plomeros, electricistas y más. Ves el precio antes de pedir y sigues cada paso desde tu celular.</p>
      </div>
      <div class="pie-acciones">
        <a class="btn btn-primario btn-bloque" href="#/registro">Crear cuenta</a>
        <a class="btn btn-texto btn-bloque" href="#/entrar">Ya tengo cuenta</a>
      </div>
    </section>`;
}
