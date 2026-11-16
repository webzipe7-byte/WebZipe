# Camello · demo

**Camello** (*"te hacemos el camello"*) es una app de servicios a domicilio bajo demanda:
la persona pide un cerrajero, plomero, electricista, pintor, carpintero, limpieza o técnico
de electrodomésticos, ve los maestros disponibles cerca con su precio y sigue el servicio
hasta pagar y calificar.

Toma como referencia las funciones de las apps de movilidad bajo demanda (inicio con mapa,
billetera, cupones, ofrece tu precio, centro de seguridad, chat, propina, invitar amigos),
con marca, diseño y textos propios.

Este demo muestra solo la parte del **consumidor**. Los maestros, precios y reseñas
son datos de ejemplo y el pago es simulado.

**Demo en línea:** https://webzipe7-byte.github.io/WebZipe/camello/

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
4. Abre `http://localhost:8080/camello/` en el navegador.

Para verla como celular en el computador: `F12` → ícono de dispositivo móvil.

## Cómo instalarla

La app debe estar publicada con **https** (GitHub Pages ya lo tiene) o abierta en `localhost`.

| Plataforma | Navegador | Pasos |
|---|---|---|
| **Android** | Chrome | Abre el enlace → menú ⋮ → **Instalar app** (o el aviso "Agregar a la pantalla principal"). |
| **iPhone / iPad** | Safari | Abre el enlace → botón **Compartir** → **Agregar a inicio** → **Agregar**. |
| **Windows** | Chrome o Edge | Abre el enlace → ícono de instalar en la barra de direcciones (o menú → **Instalar Camello**). Queda en el menú Inicio. |
| **macOS** | Chrome o Edge | Igual que en Windows; queda en Aplicaciones y el Dock. En Safari 17+: **Archivo → Agregar al Dock**. |
| **Linux** | Chrome, Chromium o Edge | Ícono de instalar en la barra de direcciones; queda en el menú de aplicaciones. |

Dentro de la app, en **Perfil**, aparece el botón **Instalar** cuando el navegador lo permite.

### Publicarla en las tiendas (más adelante)

- **Google Play**: empaquetar la PWA como TWA con [PWABuilder](https://www.pwabuilder.com) o Bubblewrap.
- **App Store**: envolverla con [Capacitor](https://capacitorjs.com) y compilar en Xcode.
- **Microsoft Store**: PWABuilder genera el paquete directamente.

No hace falta reescribir el código para ninguna de las tres.

## Funciones

| Sección | Qué incluye |
|---|---|
| **Inicio** | Mapa con tu ubicación, buscador ("se dañó la chapa"), Casa y Trabajo, 7 servicios, Programar, promoción y "Volver a pedir". |
| **Solicitud** | 3 pasos (qué pasó, dónde, cuándo), urgente o programado. |
| **Maestros** | Lista con calificación, trabajos, distancia, llegada y precio; orden por cercanía, calificación o precio; filtro **Solo maestras**. |
| **Confirmar** | Desglose del precio, **Ofrece tu precio**, cupón que se aplica solo y método de pago de la billetera. |
| **Seguimiento** | 5 estados, mapa ilustrado, **código de seguridad**, chat con el maestro, compartir seguimiento y **centro de seguridad** (emergencias 123, contactos de confianza, reportar). |
| **Cierre** | Pago con **propina**, recibo y calificación con opción de **no volver a asignarme** a ese maestro. |
| **Pedidos** | Historial con estado y detalle de cada servicio. |
| **Billetera** | Tarjetas (validadas con Luhn), Nequi, efectivo, método predeterminado, cupones y pagos realizados. |
| **Cuenta** | Perfil, Seguridad, Cupones, Invita y gana, Mis lugares, Ayuda, Configuración, Trabaja con Camello, Descargar la app. |

Códigos de cupón para probar: `BIENVENIDO` (viene con la cuenta), `CAMELLO10`, `HOGAR5000`.
Tarjeta de prueba: `4242 4242 4242 4242`, cualquier fecha futura y CVV de 3 números.

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
camello/
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
| **Pagos reales** | `services/pagos.js → pagar()` y `services/billetera.js` (registrar la tarjeta en la pasarela y guardar solo el token): Wompi, Mercado Pago o Stripe. |
| **Cupones y referidos** | `services/cupones.js`: hoy el catálogo está en el código; en producción lo administra el servidor. |
| **Mapa en tiempo real** | `ui/mapa.js`: reemplazar el dibujo por Leaflet, Mapbox o Google Maps manteniendo `mapaSimulado()` y `actualizarMapa()`. |
| **Chat y llamadas** | `services/chat.js` (hoy responde con mensajes automáticos) y el botón de llamar en `screens/seguimiento.js`. |
| **Fotos de maestros** | `ui/componentes.js → avatar()`: hoy usa iniciales; agregar `foto` al trabajador y pintarla ahí. |

## Seguridad

| Protección | Cómo funciona |
|---|---|
| **Contraseñas** | Nunca se guardan. Se guarda una clave derivada con PBKDF2-SHA256 (210.000 iteraciones) y una sal única por usuario. Las cuentas con el formato viejo se actualizan solas al entrar. |
| **Contraseñas débiles** | Mínimo 8 caracteres con letras y números; se rechazan las más comunes, las secuencias (1234, abcd) y las que contienen el nombre o el correo. |
| **Intentos fallidos** | Tras 5 intentos de inicio de sesión o de cupón incorrectos, se bloquea 5 minutos. El mensaje es el mismo exista o no la cuenta, para no revelar qué correos están registrados. |
| **Sesión** | Vence a los 30 días sin uso. Si se cierra en una pestaña, se cierra en todas. |
| **Acciones delicadas** | Eliminar la cuenta pide la contraseña. |
| **XSS** | Todo texto escrito por el usuario se escapa antes de mostrarse; los avisos usan `textContent`. |
| **Política de contenido (CSP)** | Solo se ejecuta código del propio sitio: sin scripts externos ni en línea, sin `object`, sin cambiar `base` ni enviar formularios a otros sitios. |
| **Clickjacking** | La app se niega a abrirse dentro de un marco de otra página. |
| **Pagos** | De una tarjeta solo se guardan la franquicia y los últimos 4 números; el CVV nunca se guarda. |
| **Chat y llamadas** | Pensados para que el maestro no vea el número del cliente. |
| **Service worker** | Solo guarda en caché respuestas correctas del propio sitio. |
| **Seguridad física** | Código de 4 números por servicio, contactos de confianza, botón de emergencia (123) y reporte de problemas. |

**Límites de un demo sin servidor:** los datos viven en el navegador del usuario, así que
quien tenga acceso al teléfono desbloqueado podría verlos. En la versión real:

- Autenticación en el servidor (hash con Argon2 o bcrypt, tokens de corta duración, verificación del correo y del celular).
- Encabezados HTTP de seguridad desde el servidor (`Strict-Transport-Security`, `X-Frame-Options`/`frame-ancestors`, `X-Content-Type-Options`), que GitHub Pages no permite configurar.
- Pagos solo a través de la pasarela (tokenización, sin datos de tarjeta en nuestros servidores).
- Límite de intentos y registro de actividad sospechosa en el servidor.
- Verificación de identidad y antecedentes de los maestros.

## Al publicar cambios

Sube el número de `VERSION` en `sw.js` (por ejemplo `camello-v2`) para que quienes
ya la instalaron reciban la versión nueva.

## Prueba de carga (40 millones de personas)

Camello no tiene servidor propio: cada teléfono ejecuta la app y guarda sus datos.
Por eso lo único que recibe a todos a la vez es el hosting de los archivos.

- Primera visita: 46 archivos, ~97 KB comprimidos por persona.
- 40 millones de primeras visitas: ~3,6 TB y ~2.000 millones de solicitudes.
- Visitas siguientes: 0 solicitudes, la app abre desde la copia guardada en el teléfono
  (antes volvía a pedir los 46 archivos cada vez).
- 20 navegadores entrando a la vez en local: 20/20 sin errores.
- Teléfono con el almacenamiento lleno (6.500 pedidos): la app libera lo viejo,
  guarda máximo 200 pedidos y el historial carga de a 20 (0,8 s).

GitHub Pages tiene un límite suave de 100 GB al mes, así que a esta escala hay que
pasar el hosting a Cloudflare Pages (ancho de banda y solicitudes estáticas sin límite
en el plan gratis). Los archivos se suben tal cual, no hay que cambiar código.
