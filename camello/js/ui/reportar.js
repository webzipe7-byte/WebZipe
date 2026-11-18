/**
 * Formulario para reportar un problema de un servicio o escribirle a soporte.
 * El mensaje queda guardado en la tabla `reportes` de la base de datos.
 */
import { db } from '../services/nube.js';
import { aviso, cargando } from './componentes.js';
import { icono } from './iconos.js';
import { APP } from '../config.js';

const TEXTOS = {
  problema: {
    titulo: 'Reportar un problema',
    ayuda: 'Cuéntanos qué pasó con este servicio.',
    gracias: 'Guardamos tu reporte. El equipo de Camello lo va a revisar.',
  },
  soporte: {
    titulo: 'Escríbenos',
    ayuda: '¿En qué te podemos ayudar? Cuéntanos con detalle.',
    gracias: 'Recibimos tu mensaje. Lo vamos a revisar.',
  },
};

export function abrirReporte({ tipo = 'soporte', pedidoId = null } = {}) {
  const t = TEXTOS[tipo];
  const fondo = document.createElement('div');
  fondo.className = 'dialogo';
  fondo.innerHTML = `
    <form class="dialogo-caja" role="dialog" aria-modal="true" aria-labelledby="rep-t" novalidate>
      <h2 id="rep-t">${icono(tipo === 'problema' ? 'alerta' : 'chat', { tamano: 22 })} ${t.titulo}</h2>
      ${tipo === 'problema' ? `<p class="tenue pequeno">Si estás en peligro, llama ya al <a href="tel:${APP.lineaEmergencia}">${APP.lineaEmergencia}</a>.</p>` : ''}
      <div class="campo" data-campo="texto">
        <label for="f-reporte">${t.ayuda}</label>
        <textarea id="f-reporte" rows="5" maxlength="1000" aria-describedby="e-reporte"></textarea>
        <p class="campo-error" id="e-reporte" role="alert"></p>
      </div>
      <button class="btn btn-primario btn-bloque" type="submit">Enviar</button>
      <button class="btn btn-texto btn-bloque" type="button" data-cerrar>Cancelar</button>
    </form>`;
  document.body.appendChild(fondo);
  const form = fondo.querySelector('form');
  const area = form.querySelector('textarea');
  const cerrar = () => fondo.remove();
  fondo.addEventListener('click', (e) => (e.target === fondo || e.target.closest('[data-cerrar]')) && cerrar());

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const texto = area.value.trim();
    if (texto.length < 5) {
      form.querySelector('#e-reporte').textContent = 'Escribe un poco más para poder ayudarte.';
      area.focus();
      return;
    }
    const boton = form.querySelector('[type="submit"]');
    cargando(boton, true, 'Enviando…');
    try {
      await db.crear('reportes', { tipo, texto, pedido_id: pedidoId });
      cerrar();
      aviso(t.gracias, 'exito');
    } catch (err) {
      cargando(boton, false);
      form.querySelector('#e-reporte').textContent = /row-level|policy/i.test(err.message)
        ? 'Ya enviaste muchos mensajes en la última hora. Intenta más tarde.'
        : err.message;
    }
  });
  area.focus();
}
