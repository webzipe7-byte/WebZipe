# 💰 Mis Finanzas

Aplicación web instalable (PWA) para controlar tus **gastos e ingresos**, fijar un **límite mensual** con alertas, y llevar un **bloc de notas con recordatorios** por notificación.

## Funciones
- **Cuenta con contraseña** (registro e inicio de sesión; la contraseña se guarda con hash PBKDF2-SHA256 y sal aleatoria).
- **Gastos e ingresos**: alta, borrado, filtro por mes, resumen y gastos por categoría.
- **Límite de gasto**: al llegar al 80 % te avisa y, al pasarte, te manda una alerta (banner + notificación) con cada nuevo gasto.
- **Notas con recordatorio**: elige fecha y hora y recibirás una notificación.
- **Multi‑moneda**, modo oscuro automático, exportar/importar datos en JSON, funciona sin conexión.

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
- Los datos y las cuentas viven **solo en el navegador/dispositivo** (localStorage); no hay sincronización entre dispositivos. Usa *Exportar/Importar* para moverlos.
- Los recordatorios se disparan cuando la app está abierta o en segundo plano del navegador/PWA. Para avisos con la app totalmente cerrada hace falta un servidor de Web Push (siguiente paso posible: Supabase/Firebase).
