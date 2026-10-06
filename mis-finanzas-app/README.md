# 💰 Mis Finanzas

Aplicación web instalable (PWA) para controlar tus **gastos e ingresos**, fijar un **límite mensual** con alertas, y llevar un **bloc de notas con recordatorios** por notificación.

## Funciones
- **Cuenta con contraseña** (registro e inicio de sesión; la contraseña se guarda con hash PBKDF2-SHA256 y sal aleatoria).
- **Gastos e ingresos**: alta, borrado, filtro por mes, resumen y gastos por categoría.
- **Límite de gasto**: al llegar al 80 % te avisa y, al pasarte, te manda una alerta (banner + notificación) con cada nuevo gasto.
- **Notas con recordatorio**: elige fecha y hora y recibirás una notificación.
- **Multi‑moneda**, modo oscuro automático, exportar/importar datos en JSON, funciona sin conexión.

## Recuperar contraseña por correo
Al crear la cuenta se piden **correo y teléfono**. "¿Olvidaste tu contraseña?" envía un código de 6 dígitos (válido 10 min, 5 intentos) al correo. Como no hay servidor propio, el envío usa [EmailJS](https://www.emailjs.com) (gratis):
1. Crea cuenta en EmailJS y añade un *Email Service* (Gmail, Outlook…).
2. Crea una *Email Template* con destinatario `{{to_email}}` y en el cuerpo, por ejemplo: `Hola {{username}}, tu código es {{code}} (válido {{minutes}} minutos).`
3. Copia *Service ID*, *Template ID* y *Public Key* en `config.js`.

Sin configurar, el botón avisa que el envío no está disponible (el código nunca se muestra en pantalla).

## Instalar en cualquier dispositivo
Publica el sitio (ver abajo) y abre la URL:
| Sistema | Cómo instalar |
|---|---|
| Windows / macOS / Linux / ChromeOS | Chrome o Edge → icono *Instalar* en la barra de direcciones (o botón **📲 Instalar** de la app) |
| Android | Chrome → menú ⋮ → *Instalar aplicación* |
| iPhone / iPad | Safari → Compartir → *Añadir a pantalla de inicio* (necesario para notificaciones en iOS 16.4+) |

## Publicar (GitHub Pages)
1. En el repositorio: **Settings → Pages → Source: GitHub Actions**.
2. Cada push a `main` despliega con `.github/workflows/pages.yml`.

## Probar en local
```bash
python3 -m http.server 8080   # y abre http://localhost:8080
```
(`localhost` o HTTPS son necesarios para cuentas seguras, service worker y notificaciones.)

## Limitaciones conocidas
- La recuperación por correo es **comodidad, no seguridad fuerte**: todo ocurre en el navegador, y quien tenga acceso al dispositivo puede manipular los datos locales. Para seguridad real se necesita un servidor (p. ej. Supabase Auth).
- El teléfono se guarda pero no se usa para verificar (SMS requiere un servicio de pago).
- Los datos y las cuentas viven **solo en el navegador/dispositivo** (localStorage); no hay sincronización entre dispositivos. Usa *Exportar/Importar* para moverlos.
- Los recordatorios se disparan cuando la app está abierta o en segundo plano del navegador/PWA. Para avisos con la app totalmente cerrada hace falta un servidor de Web Push (siguiente paso posible: Supabase/Firebase).
