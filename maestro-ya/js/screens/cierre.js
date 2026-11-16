/**
 * Cierre del servicio: pago simulado y calificación.
 */
import { pedidos, etapaDe } from '../services/pedidos.js';
import { pagos } from '../services/pagos.js';
import { trabajadores } from '../services/trabajadores.js';
import { categoriaPorId } from '../data/categorias.js';
import { ir, atras } from '../router.js';
import { barra, avatar, cargando, aviso } from '../ui/componentes.js';
import { icono } from '../ui/iconos.js';
import { esc, dinero } from '../ui/formato.js';
import { METODOS_PAGO } from '../config.js';

const ETIQUETAS = ['Puntual', 'Amable', 'Buen trabajo', 'Ordenado', 'Precio justo', 'Explicó todo'];
const TEXTO_ESTRELLAS = ['', 'Muy mal', 'Mal', 'Regular', 'Bien', '¡Excelente!'];

export function pantallaPagar(raiz, { id }) {
  const pedido = pedidos.obtener(id);
  if (!pedido) return ir('/pedidos', { reemplazar: true });
  const etapa = etapaDe(pedido);
  if (etapa === 'activo') return ir(`/pedido/${id}`, { reemplazar: true });
  if (etapa !== 'por_pagar') return ir(`/calificar/${id}`, { reemplazar: true });

  const t = trabajadores.buscarLocal(pedido.trabajadorId);
  const cat = categoriaPorId(pedido.categoria);
  let metodo = pedido.metodoPago;

  raiz.innerHTML = `
    ${barra('Pagar servicio')}
    <main class="contenido con-pie">
      <section class="pago-cabeza">
        <p class="tenue">${esc(cat.nombre)} · ${esc(t.nombre)} ${esc(t.apellido)}</p>
        <h1 tabindex="-1" class="monto">${dinero(pedido.precio.total)}</h1>
        <p class="ok">${icono('check', { tamano: 16 })} Servicio terminado</p>
      </section>

      <dl class="desglose tarjeta">
        ${pedido.precio.visita ? `<div><dt>Visita</dt><dd>${dinero(pedido.precio.visita)}</dd></div>` : ''}
        <div><dt>Mano de obra</dt><dd>${dinero(pedido.precio.manoObra)}</dd></div>
        ${pedido.precio.recargo ? `<div><dt>Recargo por urgencia</dt><dd>${dinero(pedido.precio.recargo)}</dd></div>` : ''}
        <div class="total"><dt>Total a pagar</dt><dd>${dinero(pedido.precio.total)}</dd></div>
      </dl>

      <section class="bloque">
        <h2>Método de pago</h2>
        <div class="opciones" role="radiogroup" aria-label="Método de pago">
          ${METODOS_PAGO.map(
            (m) => `
            <label class="opcion">
              <input type="radio" name="metodo" value="${m.id}" ${m.id === metodo ? 'checked' : ''}>
              <span class="opcion-caja">${icono(m.icono)}<span><b>${esc(m.nombre)}</b></span></span>
            </label>`
          ).join('')}
        </div>
        <p class="tenue pequeno">${icono('candado', { tamano: 14 })} Pago simulado: en este demo no se cobra nada.</p>
      </section>
    </main>
    <div class="pie-fijo"><button class="btn btn-primario btn-bloque" data-accion="pagar"></button></div>`;

  const boton = raiz.querySelector('[data-accion="pagar"]');
  const textoBoton = () => {
    boton.textContent = metodo === 'efectivo' ? `Ya pagué en efectivo · ${dinero(pedido.precio.total)}` : `Pagar ${dinero(pedido.precio.total)}`;
  };
  textoBoton();

  raiz.querySelector('[data-accion="atras"]').addEventListener('click', () => atras(`/pedido/${id}`));
  raiz.querySelectorAll('[name="metodo"]').forEach((r) =>
    r.addEventListener('change', () => {
      metodo = r.value;
      textoBoton();
    })
  );

  boton.addEventListener('click', async () => {
    cargando(boton, true, metodo === 'efectivo' ? 'Registrando…' : 'Procesando pago…');
    try {
      await pagos.pagar(pedido, metodo);
      raiz.innerHTML = `
        <main class="contenido centro-total">
          <span class="exito-ico">${icono('check', { tamano: 44 })}</span>
          <h1 tabindex="-1">${metodo === 'efectivo' ? 'Pago registrado' : 'Pago aprobado'}</h1>
          <p class="tenue">${dinero(pedido.precio.total)} · ${esc(METODOS_PAGO.find((m) => m.id === metodo).nombre)}</p>
          <p>Último paso: cuéntanos cómo te fue con ${esc(t.nombre)}.</p>
        </main>
        <div class="pie-fijo"><a class="btn btn-primario btn-bloque" href="#/calificar/${id}">Calificar a ${esc(t.nombre)}</a></div>`;
    } catch {
      cargando(boton, false);
      aviso('El pago no se pudo procesar. Intenta de nuevo o elige otro método.', 'error');
    }
  });
}

export function pantallaCalificar(raiz, { id }) {
  const pedido = pedidos.obtener(id);
  if (!pedido) return ir('/pedidos', { reemplazar: true });
  const etapa = etapaDe(pedido);
  if (etapa === 'por_pagar') return ir(`/pagar/${id}`, { reemplazar: true });
  if (etapa !== 'por_calificar') return ir(`/pedido/${id}`, { reemplazar: true });

  const t = trabajadores.buscarLocal(pedido.trabajadorId);
  let estrellas = 0;
  const elegidas = new Set();

  raiz.innerHTML = `
    ${barra('Calificar')}
    <main class="contenido con-pie">
      <section class="calificar-cabeza">
        ${avatar(t, 80)}
        <h1 tabindex="-1">¿Cómo te fue con ${esc(t.nombre)}?</h1>
      </section>
      <div class="estrellas-grandes" role="radiogroup" aria-label="Calificación">
        ${[1, 2, 3, 4, 5].map((n) => `<button type="button" role="radio" aria-checked="false" aria-label="${n} estrella${n > 1 ? 's' : ''}" data-n="${n}">${icono('estrella', { tamano: 40 })}</button>`).join('')}
      </div>
      <p class="estrellas-texto" id="textoEstrellas" aria-live="polite">Toca las estrellas</p>
      <div class="chips centro" role="group" aria-label="¿Qué te gustó?" hidden id="etiquetas">
        ${ETIQUETAS.map((e) => `<button type="button" class="chip" data-etq="${esc(e)}" aria-pressed="false">${esc(e)}</button>`).join('')}
      </div>
      <div class="campo" hidden id="comentarioCampo">
        <label for="f-comentario">Comentario (opcional)</label>
        <textarea id="f-comentario" rows="3" maxlength="300" placeholder="Cuéntale a otros cómo fue el servicio"></textarea>
      </div>
    </main>
    <div class="pie-fijo">
      <button class="btn btn-primario btn-bloque" data-accion="enviar" disabled>Enviar calificación</button>
    </div>`;

  const botones = raiz.querySelectorAll('[data-n]');
  const enviar = raiz.querySelector('[data-accion="enviar"]');
  raiz.querySelector('[data-accion="atras"]').addEventListener('click', () => atras(`/pedido/${id}`));

  botones.forEach((b) =>
    b.addEventListener('click', () => {
      estrellas = Number(b.dataset.n);
      botones.forEach((x) => {
        const on = Number(x.dataset.n) <= estrellas;
        x.classList.toggle('on', on);
        x.setAttribute('aria-checked', String(Number(x.dataset.n) === estrellas));
        x.innerHTML = icono('estrella', { tamano: 40, relleno: on });
      });
      raiz.querySelector('#textoEstrellas').textContent = TEXTO_ESTRELLAS[estrellas];
      raiz.querySelector('#etiquetas').hidden = false;
      raiz.querySelector('#comentarioCampo').hidden = false;
      enviar.disabled = false;
    })
  );

  raiz.querySelectorAll('[data-etq]').forEach((c) =>
    c.addEventListener('click', () => {
      const v = c.dataset.etq;
      if (elegidas.has(v)) elegidas.delete(v);
      else elegidas.add(v);
      c.classList.toggle('activo', elegidas.has(v));
      c.setAttribute('aria-pressed', String(elegidas.has(v)));
    })
  );

  enviar.addEventListener('click', async () => {
    cargando(enviar, true, 'Enviando…');
    try {
      await pedidos.calificar(id, {
        estrellas,
        etiquetas: [...elegidas],
        comentario: raiz.querySelector('#f-comentario').value.trim(),
      });
      raiz.innerHTML = `
        <main class="contenido centro-total">
          <span class="exito-ico">${icono('estrella', { tamano: 44, relleno: true })}</span>
          <h1 tabindex="-1">¡Gracias!</h1>
          <p>Tu calificación ayuda a otras personas a elegir bien y a ${esc(t.nombre)} a seguir mejorando.</p>
        </main>
        <div class="pie-fijo"><a class="btn btn-primario btn-bloque" href="#/inicio">Volver al inicio</a></div>`;
    } catch {
      cargando(enviar, false);
      aviso('No pudimos enviar tu calificación. Intenta de nuevo.', 'error');
    }
  });
}
