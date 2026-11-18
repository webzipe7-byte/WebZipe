/**
 * Billetera: métodos de pago, cupones y pagos realizados.
 */
import { billetera, tarjetaValida, vencimientoValido, franquicia, ICONO_METODO } from '../services/billetera.js';
import { cupones } from '../services/cupones.js';
import { pedidos } from '../services/pedidos.js';
import { categoriaPorId } from '../data/categorias.js';
import { sesion } from '../estado.js';
import { ir, atras } from '../router.js';
import { navInferior, barra, campo, marcarError, cargando, aviso } from '../ui/componentes.js';
import { icono } from '../ui/iconos.js';
import { esc, dinero, fechaHora } from '../ui/formato.js';
import { validarTelefono } from '../services/validar.js';

export async function pantallaBilletera(raiz) {
  const u = sesion.usuario;
  const misCupones = cupones.disponibles(u, { tienePedidos: (await pedidos.delUsuario(u.id)).length > 0 });

  raiz.innerHTML = `
    <main class="contenido con-nav">
      <header class="seccion-cabeza"><h1 tabindex="-1">Billetera</h1></header>

      <section class="bloque primero">
        <h2>Métodos de pago</h2>
        <ul class="lista" id="metodos"></ul>
        <p class="tenue pequeno">${icono('candado', { tamano: 14 })} Le pagas directamente al maestro cuando termina. Por ahora Camello no cobra dentro de la app, así que nunca te pediremos datos de tu tarjeta.</p>
      </section>

      <a class="promo" href="#/cupones">
        <span class="promo-ico">${icono('cupon', { tamano: 26 })}</span>
        <span><b>Cupones</b><small>${misCupones.length ? `${misCupones.length} disponible${misCupones.length > 1 ? 's' : ''} para tu próximo camello` : 'Agrega un código de descuento'}</small></span>
        ${icono('derecha', { tamano: 18 })}
      </a>

      <section class="bloque">
        <h2>Pagos realizados</h2>
        <ul class="lista" id="pagos"><li class="tarjeta esqueleto"><span class="sk" style="width:70%"></span></li></ul>
      </section>
    </main>
    ${navInferior('billetera')}`;

  const pintarMetodos = () => {
    const ul = raiz.querySelector('#metodos');
    ul.innerHTML = sesion.usuario.metodos
      .map(
        (m) => `
      <li class="tarjeta metodo">
        <span class="metodo-ico">${icono(ICONO_METODO[m.tipo], { tamano: 22 })}</span>
        <span class="fila-texto"><b>${esc(m.nombre)}</b>${m.id === sesion.usuario.metodoPreferido ? '<small class="ok">Predeterminado</small>' : `<button class="enlace pequeno" data-preferir="${m.id}">Usar por defecto</button>`}</span>

      </li>`
      )
      .join('');
    ul.querySelectorAll('[data-preferir]').forEach((b) =>
      b.addEventListener('click', () => {
        sesion.set(billetera.preferir(sesion.usuario.id, b.dataset.preferir));
        pintarMetodos();
      })
    );
    ul.querySelectorAll('[data-quitar]').forEach((b) =>
      b.addEventListener('click', () => {
        sesion.set(billetera.eliminar(sesion.usuario.id, b.dataset.quitar));
        aviso('Método de pago eliminado.');
        pintarMetodos();
      })
    );
  };
  pintarMetodos();

  const lista = (await pedidos.delUsuario(u.id)).filter((p) => p.pago);
  const ulPagos = raiz.querySelector('#pagos');
  if (!ulPagos) return;
  ulPagos.innerHTML = lista.length
    ? lista
        .map((p) => {
          const c = categoriaPorId(p.categoria);
          return `<li><a class="tarjeta fila-opcion" href="#/recibo/${p.id}">
            <span class="metodo-ico">${icono('recibo', { tamano: 20 })}</span>
            <span class="fila-texto"><b>${esc(c.nombreCorto || c.nombre)} · ${dinero(p.pago.total)}</b><small>${esc(fechaHora(p.pago.fecha))} · ${esc(p.pago.metodoNombre)}</small></span>
            ${icono('derecha', { tamano: 18 })}</a></li>`;
        })
        .join('')
    : '<li class="panel-vacio tenue">Aquí verás los recibos de tus servicios.</li>';
}

export function pantallaAgregarMetodo(raiz) {
  // Sin pasarela de pagos no se guardan tarjetas: se vuelve a la billetera
  return ir('/billetera', { reemplazar: true });

  let tipo = 'tarjeta';

  const pintar = () => {
    raiz.innerHTML = `
      ${barra('Agregar método de pago')}
      <main class="contenido">
        <h1 class="oculto" tabindex="-1">Agregar método de pago</h1>
        <div class="segmentado" role="tablist">
          <button role="tab" aria-selected="${tipo === 'tarjeta'}" data-tipo="tarjeta">${icono('tarjeta', { tamano: 18 })} Tarjeta</button>
          <button role="tab" aria-selected="${tipo === 'nequi'}" data-tipo="nequi">${icono('celular', { tamano: 18 })} Nequi</button>
        </div>
        <form class="formulario" novalidate>
          ${
            tipo === 'tarjeta'
              ? `${campo({ id: 'numero', etiqueta: 'Número de la tarjeta', modo: 'numeric', auto: 'cc-number', max: '23', ayuda: 'Prueba con 4242 4242 4242 4242' })}
                 <div class="campo-doble">
                   ${campo({ id: 'vence', etiqueta: 'Vence (MM/AA)', modo: 'numeric', auto: 'cc-exp', max: '5' })}
                   ${campo({ id: 'cvv', etiqueta: 'CVV', tipo: 'password', modo: 'numeric', auto: 'cc-csc', max: '4' })}
                 </div>
                 ${campo({ id: 'titular', etiqueta: 'Nombre en la tarjeta', auto: 'cc-name', valor: sesion.usuario.nombre })}`
              : campo({ id: 'nequi', etiqueta: 'Celular registrado en Nequi', tipo: 'tel', modo: 'tel', valor: sesion.usuario.telefono })
          }
          <p class="tenue pequeno">${icono('candado', { tamano: 14 })} Demo: no se hacen cobros y solo se guardan los últimos 4 dígitos.</p>
          <button class="btn btn-primario btn-bloque" type="submit">Guardar</button>
        </form>
      </main>`;

    raiz.querySelector('[data-accion="atras"]').addEventListener('click', () => atras('/billetera'));
    raiz.querySelectorAll('[data-tipo]').forEach((b) =>
      b.addEventListener('click', () => {
        tipo = b.dataset.tipo;
        pintar();
      })
    );

    const form = raiz.querySelector('form');
    form.numero?.addEventListener('input', () => {
      const d = form.numero.value.replace(/\D/g, '').slice(0, 19);
      form.numero.value = d.replace(/(.{4})/g, '$1 ').trim();
    });
    form.vence?.addEventListener('input', () => {
      const d = form.vence.value.replace(/\D/g, '').slice(0, 4);
      form.vence.value = d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const boton = form.querySelector('[type="submit"]');
      if (tipo === 'tarjeta') {
        const errores = {
          numero: tarjetaValida(form.numero.value) ? '' : 'Revisa el número de la tarjeta.',
          vence: vencimientoValido(form.vence.value) ? '' : 'Fecha no válida o tarjeta vencida.',
          cvv: /^\d{3,4}$/.test(form.cvv.value) ? '' : 'Son los 3 o 4 números de atrás.',
          titular: form.titular.value.trim().length > 3 ? '' : 'Escribe el nombre como aparece en la tarjeta.',
        };
        Object.entries(errores).forEach(([k, v]) => marcarError(form, k, v));
        const malo = Object.keys(errores).find((k) => errores[k]);
        if (malo) return form[malo].focus();
        cargando(boton, true, `Verificando ${franquicia(form.numero.value)}…`);
        sesion.set(await billetera.agregarTarjeta(sesion.usuario.id, { numero: form.numero.value, nombre: form.titular.value }));
      } else {
        const error = validarTelefono(form.nequi.value);
        marcarError(form, 'nequi', error);
        if (error) return form.nequi.focus();
        cargando(boton, true, 'Conectando con Nequi…');
        sesion.set(await billetera.agregarNequi(sesion.usuario.id, form.nequi.value));
      }
      aviso('Método de pago agregado.', 'exito');
      atras('/billetera');
    });
  };
  pintar();
}
