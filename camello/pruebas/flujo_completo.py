"""
Prueba de punta a punta: un cliente y un maestro en dos "celulares" distintos
(contextos separados, sin datos compartidos) contra el servidor simulado.
Uso: servir la carpeta del repositorio en el puerto 8765 y ejecutar este archivo.
"""
import asyncio, sys, os
sys.path.insert(0, os.path.dirname(__file__))
from playwright.async_api import async_playwright
from servidor_simulado import Servidor, iso, ahora_ms

B = "http://localhost:8765/camello/"
APP = """const mm=window.matchMedia.bind(window);window.matchMedia=(q)=>q.includes('display-mode: standalone')?{matches:true,media:q,addEventListener(){},removeEventListener(){}}:mm(q);"""
FALLAS = []


def revisar(cond, texto):
    print(("  ok   " if cond else "  FALLA ") + texto)
    if not cond:
        FALLAS.append(texto)


async def celular(b, srv, lat, lng):
    ctx = await b.new_context(viewport={"width": 390, "height": 844}, geolocation={"latitude": lat, "longitude": lng}, permissions=["geolocation"])
    await ctx.add_init_script(APP)
    await srv.conectar(ctx)
    pg = await ctx.new_page()
    pg.errores = []
    pg.on("pageerror", lambda e: pg.errores.append(str(e)))
    pg.on("console", lambda m: pg.errores.append(m.text) if m.type == "error" and "tile.openstreetmap" not in m.text and "ERR_TUNNEL" not in m.text and "Failed to load resource" not in m.text else None)
    return pg


async def registrar(pg, nombre, correo, maestro=False):
    await pg.goto(B + "#/registro")
    await pg.wait_for_selector("#f-nombre")
    if maestro:
        await pg.check("[name=rol][value=trabajador]", force=True)
        await pg.select_option("#f-oficio", "cerrajero")
        await pg.fill("#f-anios", "8")
    await pg.fill("#f-nombre", nombre)
    await pg.click("[data-selector-ciudad=f-ciudad]")
    await pg.fill(".selector-buscar input", "Cali")
    await pg.press(".selector-buscar input", "Enter")
    await pg.fill("#f-correo", correo)
    await pg.fill("#f-telefono", "3001234567")
    await pg.fill("#f-clave", "Sol-desierto7")
    await pg.fill("#f-clave2", "Sol-desierto7")
    await pg.click("button[type=submit]")
    await pg.wait_for_timeout(1500)


async def pedir(c):
    await c.goto(B + "#/inicio")
    await c.wait_for_selector("[data-cat=cerrajero]")
    await c.click("[data-cat=cerrajero]")
    await c.fill("textarea", "Se dañó la chapa de la puerta principal")
    await c.click("[data-accion=continuar]")
    await c.wait_for_timeout(300)
    if await c.locator("[name=dir][value=nueva]").count():
        await c.check("[name=dir][value=nueva]", force=True)
    await c.fill("#f-direccion", "Carrera 39 # 5-30, San Fernando")
    await c.click("[data-accion=continuar]")
    # Sin sugerencia elegida se confirma el punto en el mapa
    await c.wait_for_selector(".elegir-pantalla")
    await c.click("[data-confirmar]")
    await c.wait_for_timeout(300)
    await c.click("[data-accion=continuar]")
    await c.wait_for_timeout(1500)


async def main():
    srv = Servidor()
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path="/usr/bin/google-chrome", args=["--no-sandbox"])
        M = await celular(b, srv, 3.4372, -76.5225)
        C = await celular(b, srv, 3.43, -76.54)

        print("1. Maestro crea su cuenta y se conecta")
        await registrar(M, "Carlos Rendón", "carlos@maestro.com", maestro=True)
        revisar("/maestro" in M.url, f"entra al panel del maestro ({M.url.split('#')[-1]})")
        await M.click(".conexion .interruptor")
        await M.wait_for_timeout(1200)
        perfilM = next(x for x in srv.t["perfiles"] if x["nombre"] == "Carlos Rendón")
        revisar(perfilM["conectado"] and perfilM["ciudad"] == "cali", "queda conectado en Cali en el servidor")
        revisar(any(u["maestro_id"] == perfilM["id"] for u in srv.t["ubicaciones"]), "comparte su ubicación con el servidor")

        print("2. Cliente crea su cuenta y pide un cerrajero")
        await registrar(C, "Ana Gómez", "ana@correo.com")
        revisar("/inicio" in C.url, "entra al inicio del cliente")
        await pedir(C)
        tarjetas = await C.locator(".trabajador").all_inner_texts()
        revisar(len(tarjetas) == 1 and "Carlos" in tarjetas[0] and "En línea" in tarjetas[0], f"ve al maestro en línea ({len(tarjetas)} tarjeta)")
        await C.locator(".trabajador").first.click()
        await C.wait_for_timeout(500)
        await C.click("[data-accion=elegir]")
        await C.wait_for_timeout(800)
        revisar("Le pagas directamente" in await C.inner_text("main") or "Efectivo" in await C.inner_text("main"), "el pago es directo al maestro")
        await C.click("[data-accion=confirmar]")
        await C.wait_for_timeout(2000)
        revisar("/pedido/" in C.url, "el pedido queda creado")
        revisar("Esperando que Carlos" in await C.inner_text("#cuerpo h1"), "espera que el maestro acepte")

        print("3. Al maestro le llega la solicitud al instante")
        await M.wait_for_timeout(800)
        revisar(await M.locator(".solicitud-nueva").count() == 1, "aparece la solicitud nueva")
        txt = await M.inner_text(".solicitud-nueva") if await M.locator(".solicitud-nueva").count() else ""
        revisar("Ana" in txt, f"con el nombre del cliente ({txt.splitlines()[0] if txt else '—'})")
        await M.click("[data-aceptar]")
        await M.wait_for_timeout(1200)
        revisar("Aceptaste" in await M.inner_text("#cuerpo h1"), "el maestro ve que aceptó")
        await C.wait_for_timeout(800)
        revisar("Aceptó" in await C.inner_text("#cuerpo h1"), "el cliente ve que aceptó")
        revisar(await C.locator("#pie [data-accion=cancelar]").is_visible(), "el cliente ve el botón de cancelar")
        revisar(await C.locator("[data-accion=llamar]").count() == 0, "ya no está el botón falso de llamar")

        print("4. Chat entre los dos")
        await M.click("[data-accion=chat]")
        await M.fill("#texto", "Hola Ana, ya salgo")
        await M.press("#texto", "Enter")
        await M.wait_for_timeout(700)
        revisar(await C.locator(".burbuja-num").count() == 1, "al cliente le aparece 1 mensaje sin leer")
        await C.click("[data-accion=chat]")
        await C.wait_for_timeout(400)
        revisar("Hola Ana, ya salgo" in await C.inner_text("#mensajes"), "el cliente lee el mensaje")
        await C.fill("#texto", "Es el apto 302")
        await C.press("#texto", "Enter")
        await M.wait_for_timeout(800)
        revisar("Es el apto 302" in await M.inner_text("#mensajes"), "el maestro lee la respuesta")
        revisar(await M.locator(".msg.mio").count() == 1 and await M.locator(".msg.suyo").count() == 1, "cada uno ve sus mensajes a su lado")
        await M.click("[data-accion=atras]")
        await C.click("[data-accion=atras]")
        await M.wait_for_timeout(500)

        print("5. Va en camino, código de llegada y fin del trabajo")
        await M.click("[data-paso=salir]")
        await M.wait_for_timeout(1200)
        await C.wait_for_timeout(1000)
        revisar(await C.locator("#pie [data-accion=cancelar]").count() == 0, "ya no se puede cancelar cuando va en camino")
        revisar(await C.locator(".mapa-real .marca").count() == 2, "el cliente ve el mapa con los dos puntos")
        pin = (await C.inner_text(".pin-caja strong")).strip()
        await M.fill("#f-pin", "0000" if pin != "0000" else "1111")
        await M.click(".pin-entrada button")
        await M.wait_for_timeout(700)
        revisar("no es el código" in await M.inner_text("#e-pin"), "código malo: lo rechaza")
        await M.fill("#f-pin", pin)
        await M.click(".pin-entrada button")
        await M.wait_for_timeout(1000)
        revisar("Trabajando" in await M.inner_text("#cuerpo h1"), "código bueno: empieza a trabajar")
        await M.click("[data-paso=terminar]")
        await M.wait_for_timeout(1000)
        await C.wait_for_timeout(800)
        revisar(await C.locator("#pie a[href*=pagar]").count() == 1, "al cliente le aparece pagar")

        print("6. Pago y calificación")
        await C.click("#pie a[href*=pagar]")
        await C.wait_for_timeout(600)
        main_txt = await C.inner_text("main")
        revisar("simulado" not in main_txt and "demo" not in main_txt.lower(), "sin textos de demo en el pago")
        await C.check("[name=metodo][value=transferencia]", force=True)
        await C.click("[data-accion=pagar]")
        await C.wait_for_timeout(1500)
        revisar("Pago registrado" in await C.inner_text("main"), "pago registrado")
        await M.wait_for_timeout(800)
        revisar("Servicio pagado" in await M.inner_text("#cuerpo h1"), "el maestro ve que le pagaron")
        await C.click("a[href*=calificar]")
        await C.wait_for_timeout(500)
        await C.locator("[role=radiogroup] button, .estrellas-grandes button").nth(4).click()
        await C.wait_for_timeout(200)
        await C.click(".pie-fijo button")
        await C.wait_for_timeout(1500)
        revisar(perfilM["calificaciones"] == 1 and perfilM["calificacion_suma"] == 5, "la calificación llega al perfil del maestro")

        print("7. Reportar un problema y escribir a soporte")
        pid = srv.t["pedidos"][0]["id"]
        await C.goto(B + "#/ayuda")
        await C.wait_for_timeout(600)
        await C.click("[data-accion=soporte]")
        await C.fill("#f-reporte", "No me llegó el correo de confirmación")
        await C.click(".dialogo [type=submit]")
        await C.wait_for_timeout(800)
        revisar(len(srv.t["reportes"]) == 1 and srv.t["reportes"][0]["tipo"] == "soporte", "el mensaje a soporte se guarda en la base de datos")

        print("8. Maestro rechaza y maestro que cerró la app")
        await pedir(C)
        await C.locator(".trabajador").first.click()
        await C.wait_for_timeout(500)
        await C.click("[data-accion=elegir]")
        await C.wait_for_timeout(800)
        await C.click("[data-accion=confirmar]")
        await C.wait_for_timeout(1800)
        await M.goto(B + "#/maestro")
        await M.wait_for_timeout(1500)
        await M.click("[data-rechazar]")
        await M.wait_for_timeout(1200)
        await C.wait_for_timeout(800)
        revisar("cancelado" in (await C.inner_text("#cuerpo h1")).lower(), "el cliente ve que el maestro no pudo")
        # El maestro cierra la app: deja de dar señal
        perfilM["actualizado"] = iso(ahora_ms() - 10 * 60000)
        await pedir(C)
        revisar(await C.locator(".trabajador").count() == 0, "un maestro sin señal ya no aparece")

        print("Errores en la consola:", M.errores + C.errores, "| del simulador:", srv.errores)
        await b.close()
    print("\nRESULTADO:", "TODO BIEN" if not FALLAS and not srv.errores else f"{len(FALLAS)} fallas")


asyncio.run(main())
