/**
 * Confirmación del pedido: todo lo que se va a pedir y cuánto cuesta,
 * antes de que el usuario toque "Confirmar".
 * Incluye cupón de descuento, "Ofrece tu precio" y método de pago de la billetera.
 */
import { trabajadores, cotizar, minutosLlegada } from '../services/trabajadores.js';
import { pedidos } from '../services/pedidos.js';
import { auth } from '../services/auth.js';
import { cupones, descuentoDe } from '../services/cupones.js';
import { billetera, ICONO_METODO } from '../services/billetera.js';
import { oficioDe } from '../data/categorias.js';
import { borrador, sesion } from '../estado.js';
import { ir, atras } from '../router.js';
import { barra, avatar, calificacion, cargando, aviso } from '../ui/componentes.js';
import { icono } from '../ui/iconos.js';
import { esc, dinero, fechaHora } from '../ui/formato.js';
import { OFERTA_MINIMA } from '../config.js';

const aMiles = (n) => Math.round(n / 1000) * 1000;

export async function pantallaConfirmar(raiz) {
  const b = borrador.leer();
  const t = b?.trabajadorId && trabajadores.buscarLocal(b.trabajadorId);
  if (!t || !b.direccion || !b.cuando) return ir('/inicio', { reemplazar: true });

  const u = sesion.usuario;
  const urgente = b.cuando.tipo === 'urgente';
  const cotizacion = cotizar(t, { urgente });
  const minimo = aMiles(cotizacion.total * OFERTA_MINIMA);
  const tienePedidos = (await pedidos.delUsuario(u.id)).length > 0;
  const misCupones = cupones.disponibles(u, { tienePedidos });
  const cuando = urgente ? `Lo antes posible · llega en ~${minutosLlegada(t.distanciaKm)} min` : fechaHora(b.cuando.fecha);

  // Si hay cupones y el usuario no ha decidido, se aplica el que más descuenta
  if (b.cupon === undefined && misCupones.length) {
    const mejor = [...misCupones].sort((x, y) => descuentoDe(y.codigo, cotizacion.total) - descuentoDe(x.codigo, cotizacion.total))[0];
    if (descuentoDe(mejor.codigo, cotizacion.total) > 0) b.cupon = mejor.codigo;
  }

  function calcular() {
    // El borrador vive en el navegador: se revalida todo antes de usarlo
    const ofertaValida = Number.isInteger(b.oferta) && b.oferta >= minimo && b.oferta < cotizacion.total;
    if (!ofertaValida) b.oferta = null;
    if (b.cupon && !misCupones.some((c) => c.codigo === b.cupon)) b.cupon = null;
    const subtotal = b.oferta || cotizacion.total;
    const descuento = b.cupon ? descuentoDe(b.cupon, subtotal) : 0;
    return { ...cotizacion, sugerido: cotizacion.total, oferta: b.oferta || null, cupon: descuento ? b.cupon : null, descuento, total: subtotal - descuento };
  }

  function pintar() {
    const precio = calcular();
    const metodo = billetera.metodo(sesion.usuario, b.metodoPago || sesion.usuario.metodoPreferido);

    raiz.innerHTML = `
      ${barra('Confirma tu pedido')}
      <main class="contenido con-pie">
        <h1 class="oculto" tabindex="-1">Confirma tu pedido</h1>

        <section class="tarjeta fila-maestro">
          ${avatar(t, 52)}
          <span><b>${esc(t.nombre)} ${esc(t.apellido)}</b><small class="tenue">${esc(oficioDe(t))}</small></span>
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
            ${precio.oferta
              ? `<div><dt>Precio sugerido</dt><dd class="tachado">${dinero(precio.sugerido)}</dd></div>
                 <div><dt>Tu oferta</dt><dd>${dinero(precio.oferta)}</dd></div>`
              : `${precio.visita ? `<div><dt>Visita</dt><dd>${dinero(precio.visita)}</dd></div>` : ''}
                 <div><dt>Mano de obra estimada</dt><dd>${dinero(precio.manoObra)}</dd></div>
                 ${precio.recargo ? `<div><dt>Recargo por urgencia</dt><dd>${dinero(precio.recargo)}</dd></div>` : ''}`}
            ${precio.descuento ? `<div class="verde"><dt>Cupón ${esc(precio.cupon)}</dt><dd>−${dinero(precio.descuento)}</dd></div>` : ''}
            <div class="total"><dt>Total estimado</dt><dd>${dinero(precio.total)}</dd></div>
          </dl>

          <div class="acciones-precio">
            <button class="fila-accion" data-accion="oferta">
              ${icono('precio', { tamano: 20 })}<span><b>${precio.oferta ? 'Cambiar tu oferta' : 'Ofrece tu precio'}</b><small>Propón cuánto quieres pagar</small></span>${icono('derecha', { tamano: 18 })}
            </button>
            <button class="fila-accion" data-accion="cupon">
              ${icono('cupon', { tamano: 20 })}<span><b>${precio.cupon ? `Cupón ${esc(precio.cupon)}` : 'Agregar cupón'}</b><small>${misCupones.length ? `${misCupones.length} disponible${misCupones.length > 1 ? 's' : ''}` : 'Tienes un código de descuento'}</small></span>${icono('derecha', { tamano: 18 })}
            </button>
          </div>
          <p class="tenue pequeno">Pagas cuando el trabajo termine. Si hacen falta repuestos, se cotizan aparte y tú decides.</p>
        </section>

        <section class="bloque">
          <h2>Pago</h2>
          <button class="tarjeta fila-accion" data-accion="metodo">
            ${icono(ICONO_METODO[metodo.tipo], { tamano: 20 })}<span><b>${esc(metodo.nombre)}</b><small>Cambiar método de pago</small></span>${icono('derecha', { tamano: 18 })}
          </button>
        </section>
      </main>
      <div class="pie-fijo">
        <button class="btn btn-primario btn-bloque" data-accion="confirmar">${precio.oferta ? 'Enviar oferta' : 'Confirmar solicitud'} · ${dinero(precio.total)}</button>
      </div>
      <div id="hoja"></div>`;

    raiz.querySelector('[data-accion="atras"]').addEventListener('click', () => atras(`/trabajador/${t.id}`));
    raiz.querySelectorAll('[data-paso]').forEach((a) => a.addEventListener('click', () => borrador.guardar({ paso: Number(a.dataset.paso) })));
    raiz.querySelector('[data-accion="oferta"]').addEventListener('click', hojaOferta);
    raiz.querySelector('[data-accion="cupon"]').addEventListener('click', hojaCupon);
    raiz.querySelector('[data-accion="metodo"]').addEventListener('click', hojaMetodo);
    raiz.querySelector('[data-accion="confirmar"]').addEventListener('click', (e) => confirmar(e.currentTarget, precio, metodo));
  }

  /* ---------- Hojas inferiores ---------- */
  function abrirHoja(html, alMontar) {
    const caja = raiz.querySelector('#hoja');
    caja.innerHTML = `<div class="dialogo"><div class="dialogo-caja" role="dialog" aria-modal="true">${html}</div></div>`;
    const fondo = caja.firstElementChild;
    const cerrar = () => (caja.innerHTML = '');
    fondo.addEventListener('click', (e) => (e.target === fondo || e.target.closest('[data-cerrar]')) && cerrar());
    alMontar(fondo, cerrar);
  }

  function hojaOferta() {
    abrirHoja(
      `<h2>Ofrece tu precio</h2>
       <p>El precio sugerido es ${dinero(cotizacion.total)}. ${esc(t.nombre)} acepta ofertas desde ${dinero(minimo)}.</p>
       <div class="campo" data-campo="oferta">
         <label for="f-oferta">Tu oferta</label>
         <div class="campo-caja con-prefijo"><span>$</span><input id="f-oferta" inputmode="numeric" value="${b.oferta ? b.oferta.toLocaleString('es-CO') : ''}" placeholder="${minimo.toLocaleString('es-CO')}"></div>
         <p class="campo-error" role="alert"></p>
       </div>
       <button class="btn btn-primario btn-bloque" data-ok>Usar esta oferta</button>
       ${b.oferta ? '<button class="btn btn-texto btn-bloque" data-quitar>Volver al precio sugerido</button>' : '<button class="btn btn-texto btn-bloque" data-cerrar>Cancelar</button>'}`,
      (fondo, cerrar) => {
        const input = fondo.querySelector('input');
        input.addEventListener('input', () => {
          const d = input.value.replace(/\D/g, '');
          input.value = d ? Number(d).toLocaleString('es-CO') : '';
        });
        input.focus();
        fondo.querySelector('[data-ok]').addEventListener('click', () => {
          const valor = Number(input.value.replace(/\D/g, ''));
          const error = fondo.querySelector('.campo-error');
          if (!valor) return (error.textContent = 'Escribe cuánto quieres pagar.');
          if (valor < minimo) return (error.textContent = `Muy bajo. El mínimo es ${dinero(minimo)}.`);
          if (valor >= cotizacion.total) b.oferta = null;
          else b.oferta = aMiles(valor);
          borrador.guardar({ oferta: b.oferta });
          cerrar();
          pintar();
        });
        fondo.querySelector('[data-quitar]')?.addEventListener('click', () => {
          b.oferta = null;
          borrador.guardar({ oferta: null });
          cerrar();
          pintar();
        });
      }
    );
  }

  function hojaCupon() {
    const subtotal = b.oferta || cotizacion.total;
    abrirHoja(
      `<h2>Cupones</h2>
       <div class="opciones">
         ${misCupones
           .map((c) => {
             const d = descuentoDe(c.codigo, subtotal);
             return `<label class="opcion"><input type="radio" name="cupon" value="${c.codigo}" ${b.cupon === c.codigo ? 'checked' : ''} ${d ? '' : 'disabled'}>
               <span class="opcion-caja">${icono('cupon')}<span><b>${esc(c.titulo)}</b><small>${esc(c.codigo)} · ${d ? `ahorras ${dinero(d)}` : 'no aplica a este valor'}</small></span></span></label>`;
           })
           .join('')}
         <label class="opcion"><input type="radio" name="cupon" value="" ${!b.cupon ? 'checked' : ''}><span class="opcion-caja">${icono('cerrar')}<span><b>No usar cupón</b></span></span></label>
       </div>
       <div class="campo agregar-cupon" data-campo="codigo">
         <label for="f-codigo">¿Tienes un código?</label>
         <div class="fila-codigo"><input id="f-codigo" placeholder="Ej: CAMELLO10" autocapitalize="characters"><button class="btn btn-secundario" data-agregar>Agregar</button></div>
         <p class="campo-error" role="alert"></p>
       </div>
       <button class="btn btn-primario btn-bloque" data-ok>Listo</button>`,
      (fondo, cerrar) => {
        fondo.querySelector('[data-agregar]').addEventListener('click', async (e) => {
          const error = fondo.querySelector('.agregar-cupon .campo-error');
          cargando(e.currentTarget, true, '');
          try {
            const nuevo = await cupones.agregar(sesion.usuario.id, fondo.querySelector('#f-codigo').value);
            sesion.set(nuevo);
            const codigo = fondo.querySelector('#f-codigo').value.trim().toUpperCase();
            misCupones.splice(0, misCupones.length, ...cupones.disponibles(nuevo, { tienePedidos }));
            b.cupon = descuentoDe(codigo, subtotal) ? codigo : b.cupon;
            borrador.guardar({ cupon: b.cupon });
            aviso('Cupón agregado.', 'exito');
            cerrar();
            pintar();
          } catch (err) {
            cargando(e.currentTarget, false);
            error.textContent = err.message;
          }
        });
        fondo.querySelector('[data-ok]').addEventListener('click', () => {
          b.cupon = fondo.querySelector('[name="cupon"]:checked')?.value || null;
          borrador.guardar({ cupon: b.cupon });
          cerrar();
          pintar();
        });
      }
    );
  }

  function hojaMetodo() {
    const actual = b.metodoPago || sesion.usuario.metodoPreferido;
    abrirHoja(
      `<h2>¿Cómo vas a pagar?</h2>
       <div class="opciones">
         ${sesion.usuario.metodos
           .map((m) => `<label class="opcion"><input type="radio" name="metodo" value="${m.id}" ${m.id === actual ? 'checked' : ''}><span class="opcion-caja">${icono(ICONO_METODO[m.tipo])}<span><b>${esc(m.nombre)}</b></span></span></label>`)
           .join('')}
       </div>
       <p class="tenue pequeno">Le pagas directamente al maestro cuando termine el trabajo.</p>
       <button class="btn btn-primario btn-bloque" data-ok>Listo</button>`,
      (fondo, cerrar) => {
        fondo.querySelector('[data-ok]').addEventListener('click', () => {
          b.metodoPago = fondo.querySelector('[name="metodo"]:checked').value;
          borrador.guardar({ metodoPago: b.metodoPago });
          cerrar();
          pintar();
        });
      }
    );
  }

  async function confirmar(boton, precio, metodo) {
    cargando(boton, true, precio.oferta ? 'Enviando oferta…' : 'Enviando solicitud…');
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
        metodoPago: metodo.id,
        metodoNombre: metodo.nombre,
        metodoTipo: metodo.tipo,
      });
      if (precio.cupon) cupones.marcarUsado(sesion.usuario.id, precio.cupon, pedido.id);
      auth.recordarDireccion(sesion.usuario.id, b.direccion);
      sesion.refrescar();
      borrador.limpiar();
      ir(`/pedido/${pedido.id}`, { reemplazar: true });
    } catch (err) {
      cargando(boton, false);
      aviso(err.message || 'No pudimos enviar tu solicitud. Revisa tu conexión e intenta de nuevo.', 'error');
    }
  }

  pintar();
}
