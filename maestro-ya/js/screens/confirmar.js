/**
 * Confirmación del pedido: todo lo que se va a pedir y cuánto cuesta,
 * antes de que el usuario toque "Confirmar".
 */
import { trabajadores, cotizar, minutosLlegada } from '../services/trabajadores.js';
import { pedidos } from '../services/pedidos.js';
import { auth } from '../services/auth.js';
import { categoriaPorId } from '../data/categorias.js';
import { borrador, sesion } from '../estado.js';
import { ir, atras } from '../router.js';
import { barra, avatar, calificacion, cargando, aviso } from '../ui/componentes.js';
import { icono } from '../ui/iconos.js';
import { esc, dinero, fechaHora } from '../ui/formato.js';
import { METODOS_PAGO } from '../config.js';

export function pantallaConfirmar(raiz) {
  const b = borrador.leer();
  const t = b?.trabajadorId && trabajadores.buscarLocal(b.trabajadorId);
  if (!t || !b.direccion || !b.cuando) return ir('/inicio', { reemplazar: true });

  const cat = categoriaPorId(b.categoria);
  const urgente = b.cuando.tipo === 'urgente';
  const precio = cotizar(t, { urgente });
  const metodo = b.metodoPago || METODOS_PAGO[0].id;
  const cuando = urgente ? `Lo antes posible · llega en ~${minutosLlegada(t.distanciaKm)} min` : fechaHora(b.cuando.fecha);

  raiz.innerHTML = `
    ${barra('Confirma tu pedido')}
    <main class="contenido con-pie">
      <h1 class="oculto" tabindex="-1">Confirma tu pedido</h1>

      <section class="tarjeta fila-maestro">
        ${avatar(t, 52)}
        <span><b>${esc(t.nombre)} ${esc(t.apellido)}</b><small class="tenue">${esc(cat.nombre)}</small></span>
        ${calificacion(t.calificacion)}
      </section>

      <ul class="detalle-lista tarjeta">
        <li>${icono('pedidos', { tamano: 20 })}<span><small>Problema</small>${esc(b.descripcion)}</span><a href="#/solicitud/${b.categoria}" data-paso="1">Cambiar</a></li>
        <li>${icono('ubicacion', { tamano: 20 })}<span><small>Dirección</small>${esc(b.direccion.texto)}${b.direccion.detalle ? ` · ${esc(b.direccion.detalle)}` : ''}</span><a href="#/solicitud/${b.categoria}" data-paso="2">Cambiar</a></li>
        <li>${icono(urgente ? 'urgente' : 'calendario', { tamano: 20 })}<span><small>Cuándo</small>${esc(cuando)}</span><a href="#/solicitud/${b.categoria}" data-paso="3">Cambiar</a></li>
      </ul>

      <section class="bloque">
        <h2>Precio</h2>
        <dl class="desglose tarjeta">
          ${precio.visita ? `<div><dt>Visita</dt><dd>${dinero(precio.visita)}</dd></div>` : ''}
          <div><dt>Mano de obra estimada</dt><dd>${dinero(precio.manoObra)}</dd></div>
          ${precio.recargo ? `<div><dt>Recargo por urgencia</dt><dd>${dinero(precio.recargo)}</dd></div>` : ''}
          <div class="total"><dt>Total estimado</dt><dd>${dinero(precio.total)}</dd></div>
        </dl>
        <p class="tenue pequeno">Pagas cuando el trabajo termine. Si hacen falta repuestos, se cotizan aparte y tú decides.</p>
      </section>

      <section class="bloque">
        <h2>¿Cómo vas a pagar?</h2>
        <div class="opciones" role="radiogroup" aria-label="Método de pago">
          ${METODOS_PAGO.map(
            (m) => `
            <label class="opcion">
              <input type="radio" name="metodo" value="${m.id}" ${m.id === metodo ? 'checked' : ''}>
              <span class="opcion-caja">${icono(m.icono)}<span><b>${esc(m.nombre)}</b></span></span>
            </label>`
          ).join('')}
        </div>
        <p class="tenue pequeno">Pago simulado: en este demo no se cobra nada.</p>
      </section>
    </main>
    <div class="pie-fijo">
      <button class="btn btn-primario btn-bloque" data-accion="confirmar">Confirmar solicitud · ${dinero(precio.total)}</button>
    </div>`;

  raiz.querySelector('[data-accion="atras"]').addEventListener('click', () => atras(`/trabajador/${t.id}`));
  raiz.querySelectorAll('[data-paso]').forEach((a) => a.addEventListener('click', () => borrador.guardar({ paso: Number(a.dataset.paso) })));
  raiz.querySelectorAll('[name="metodo"]').forEach((r) => r.addEventListener('change', () => borrador.guardar({ metodoPago: r.value })));

  raiz.querySelector('[data-accion="confirmar"]').addEventListener('click', async (e) => {
    const boton = e.currentTarget;
    cargando(boton, true, 'Enviando solicitud…');
    try {
      const pedido = await pedidos.crear({
        usuarioId: sesion.usuario.id,
        categoria: b.categoria,
        descripcion: b.descripcion,
        direccion: b.direccion,
        cuando: b.cuando,
        trabajadorId: t.id,
        minutosLlegada: minutosLlegada(t.distanciaKm),
        precio,
        metodoPago: raiz.querySelector('[name="metodo"]:checked').value,
      });
      auth.recordarDireccion(sesion.usuario.id, b.direccion);
      sesion.set(auth.usuarioActual());
      borrador.limpiar();
      ir(`/pedido/${pedido.id}`, { reemplazar: true });
    } catch {
      cargando(boton, false);
      aviso('No pudimos enviar tu solicitud. Revisa tu conexión e intenta de nuevo.', 'error');
    }
  });
}
