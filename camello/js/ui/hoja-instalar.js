/**
 * Hoja con el botón de instalar o, si el navegador no lo permite por código,
 * los pasos para instalar la app según el equipo de quien la abre.
 */
import { instalacion } from '../instalar.js';
import { icono } from './iconos.js';
import { esc } from './formato.js';
import { aviso } from './componentes.js';

export async function abrirInstalar() {
  if (instalacion.instalada()) {
    aviso('La app ya está instalada en este equipo.', 'exito');
    return;
  }
  // Chrome y Edge permiten mostrar su ventana de instalación directamente
  if (instalacion.disponible()) {
    const ok = await instalacion.pedir();
    if (ok) aviso('¡Listo! Camello quedó instalada.', 'exito');
    return;
  }

  const { titulo, pasos } = instalacion.pasos();
  const fondo = document.createElement('div');
  fondo.className = 'dialogo';
  fondo.innerHTML = `
    <div class="dialogo-caja" role="dialog" aria-modal="true" aria-labelledby="inst-t">
      <span class="cat-ico" style="--cat:var(--marca);width:52px;height:52px">${icono('descargar', { tamano: 26 })}</span>
      <h2 id="inst-t">${esc(titulo)}</h2>
      <ol class="pasos-instalar">${pasos.map((p) => `<li>${esc(p)}</li>`).join('')}</ol>
      <p class="tenue pequeno">Queda con su propio ícono y se abre en su propia ventana, como cualquier app.</p>
      <button class="btn btn-primario btn-bloque" data-cerrar>Entendido</button>
    </div>`;
  document.body.appendChild(fondo);
  const cerrar = () => fondo.remove();
  fondo.addEventListener('click', (e) => {
    if (e.target === fondo || e.target.closest('[data-cerrar]')) cerrar();
  });
  fondo.querySelector('[data-cerrar]').focus();
}
