# Maestro Ya · demo

App de servicios a domicilio bajo demanda: la persona pide un cerrajero, plomero,
electricista, pintor, carpintero, limpieza o técnico de electrodomésticos, ve los
maestros disponibles cerca con su precio y sigue el servicio hasta pagar y calificar.

Este demo muestra solo la parte del **consumidor**. Los maestros, precios y reseñas
son datos de ejemplo y el pago es simulado.

**Demo en línea:** https://webzipe7-byte.github.io/WebZipe/maestro-ya/

---

## Tecnología

- **PWA** (aplicación web instalable): una sola base de código para Android, iOS,
  Windows, macOS y Linux.
- JavaScript moderno (módulos ES), HTML y CSS. **Sin dependencias ni compilación**:
  se sube tal cual a cualquier hosting estático.
- Service worker para abrir rápido y funcionar sin conexión.
- Los datos se guardan en el navegador (`localStorage`) mientras no haya servidor.

## Cómo ejecutarlo en tu computador

La app necesita servirse desde un servidor (no funciona abriendo el `index.html`
con doble clic, porque los módulos y el service worker lo exigen).

1. Descarga o clona el repositorio.
2. Abre una terminal en la carpeta del repositorio.
3. Inicia un servidor local con cualquiera de estas opciones:
   - Python: `python -m http.server 8080`
   - Node: `npx serve .`
   - VS Code: extensión **Live Server** → clic derecho en `index.html` → *Open with Live Server*.
4. Abre `http://localhost:8080/maestro-ya/` en el navegador.

Para verla como celular en el computador: `F12` → ícono de dispositivo móvil.

## Cómo instalarla

La app debe estar publicada con **https** (GitHub Pages ya lo tiene) o abierta en `localhost`.

| Plataforma | Navegador | Pasos |
|---|---|---|
| **Android** | Chrome | Abre el enlace → menú ⋮ → **Instalar app** (o el aviso "Agregar a la pantalla principal"). |
| **iPhone / iPad** | Safari | Abre el enlace → botón **Compartir** → **Agregar a inicio** → **Agregar**. |
| **Windows** | Chrome o Edge | Abre el enlace → ícono de instalar en la barra de direcciones (o menú → **Instalar Maestro Ya**). Queda en el menú Inicio. |
| **macOS** | Chrome o Edge | Igual que en Windows; queda en Aplicaciones y el Dock. En Safari 17+: **Archivo → Agregar al Dock**. |
| **Linux** | Chrome, Chromium o Edge | Ícono de instalar en la barra de direcciones; queda en el menú de aplicaciones. |

Dentro de la app, en **Perfil**, aparece el botón **Instalar** cuando el navegador lo permite.

### Publicarla en las tiendas (más adelante)

- **Google Play**: empaquetar la PWA como TWA con [PWABuilder](https://www.pwabuilder.com) o Bubblewrap.
- **App Store**: envolverla con [Capacitor](https://capacitorjs.com) y compilar en Xcode.
- **Microsoft Store**: PWABuilder genera el paquete directamente.

No hace falta reescribir el código para ninguna de las tres.

## Cómo probar el demo

1. **Crear cuenta** con cualquier correo (los datos solo quedan en ese navegador).
2. Elegir un servicio o escribir en el buscador, por ejemplo "se dañó la chapa".
3. Seguir los 3 pasos: qué pasó, dirección y cuándo.
4. Elegir un maestro, revisar el precio y **Confirmar solicitud**.
5. El pedido avanza solo: buscando → aceptado → en camino → en proceso → finalizado
   (unos 45 segundos en total).
6. Pagar (simulado) y calificar.

Si programas el servicio para otro día, en el seguimiento aparece el enlace
*"simular que ya es la hora"* para no tener que esperar.

Para empezar de cero: herramientas del navegador → *Application* → *Storage* → *Clear site data*.

## Estructura

```
maestro-ya/
├── index.html              Punto de entrada
├── manifest.webmanifest    Datos de instalación (nombre, íconos, colores)
├── sw.js                   Service worker (caché y modo sin conexión)
├── icons/                  Íconos de la app
├── css/app.css             Estilos
└── js/
    ├── main.js             Rutas y arranque
    ├── config.js           Ciudad, moneda, recargo, tiempos de la simulación, métodos de pago
    ├── router.js           Navegación por #/ruta
    ├── estado.js           Sesión y borrador de la solicitud
    ├── instalar.js         Botón de instalar la PWA
    ├── data/               Datos de ejemplo (categorías y maestros)
    ├── services/           Lógica y acceso a datos (auth, pedidos, pagos, trabajadores…)
    ├── ui/                 Componentes reutilizables (íconos, mapa, tarjetas, formatos)
    └── screens/            Una pantalla por archivo
```

## Preparado para crecer

Las pantallas nunca leen datos directamente: todo pasa por `js/services/`.
Para la versión real se cambian esos archivos y las pantallas siguen iguales.

| Funcionalidad futura | Dónde se conecta |
|---|---|
| **Servidor y base de datos** | `services/auth.js`, `services/pedidos.js`, `services/trabajadores.js` (mismas funciones, ahora con `fetch` a la API). `config.js → FUENTE_DATOS`. |
| **Cuenta de trabajador** | `services/pedidos.js → estadoDe()`: hoy calcula el estado con temporizadores; mañana lo devuelve el servidor cuando el maestro lo cambia desde su app. Los estados ya están definidos en `ESTADOS`. |
| **Pagos reales** | `services/pagos.js → pagar()`: conectar Wompi, Mercado Pago o Stripe y devolver el mismo objeto `pago`. |
| **Mapa en tiempo real** | `ui/mapa.js`: reemplazar el dibujo por Leaflet, Mapbox o Google Maps manteniendo `mapaSimulado()` y `actualizarMapa()`. |
| **Chat y llamadas** | Botones ya ubicados en `screens/seguimiento.js` (`data-accion="chat"` y `"llamar"`). |
| **Fotos de maestros** | `ui/componentes.js → avatar()`: hoy usa iniciales; agregar `foto` al trabajador y pintarla ahí. |

## Notas de seguridad del demo

- Las contraseñas se guardan como hash SHA-256 en el navegador, nunca en texto plano.
  En producción la autenticación debe hacerse en el servidor (hash con sal, tokens, etc.).
- Todo texto que escribe el usuario se escapa antes de mostrarse.

## Al publicar cambios

Sube el número de `VERSION` en `sw.js` (por ejemplo `maestroya-v2`) para que quienes
ya la instalaron reciban la versión nueva.
