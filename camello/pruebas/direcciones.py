"""
Prueba de direcciones: sugerencias reales, confirmar en el mapa, GPS y Casa.
Simula Supabase (servidor_simulado.py), Photon y Nominatim.
"""
import asyncio, json, os, sys
from urllib.parse import urlparse, parse_qs
sys.path.insert(0, os.path.dirname(__file__))
from playwright.async_api import async_playwright
from servidor_simulado import Servidor

B = "http://localhost:8765/camello/"
APP = """const mm=window.matchMedia.bind(window);window.matchMedia=(q)=>q.includes('display-mode: standalone')?{matches:true,media:q,addEventListener(){},removeEventListener(){}}:mm(q);"""
CORS = {"Access-Control-Allow-Origin": "*", "Content-Type": "application/json"}
FALLAS, CONSULTAS = [], []
JARDIN = (3.3687, -76.5278)


def revisar(c, t):
    print(("  ok   " if c else "  FALLA ") + t)
    if not c:
        FALLAS.append(t)


async def photon(route):
    u = urlparse(route.request.url)
    q = parse_qs(u.query)
    CONSULTAS.append(("photon", q.get("q", [""])[0]))
    if u.path == "/reverse":
        f = {"properties": {"street": "Calle 16", "housenumber": "100-20", "district": "Ciudad Jardín", "countrycode": "CO"}, "geometry": {"coordinates": [-76.53, 3.36]}}
        return await route.fulfill(headers=CORS, body=json.dumps({"features": [f]}))
    texto = q["q"][0].lower()
    feats = []
    if "jard" in texto:
        feats = [
            {"properties": {"name": "Jardín Plaza", "street": "Avenida Carrera 100", "city": "Cali", "district": "Ciudad Jardín", "countrycode": "CO"}, "geometry": {"coordinates": [JARDIN[1], JARDIN[0]]}},
            {"properties": {"name": "Jardín Plaza Cúcuta", "city": "Cúcuta", "countrycode": "CO"}, "geometry": {"coordinates": [-72.49, 7.9]}},
        ]
    await route.fulfill(headers=CORS, body=json.dumps({"features": feats}))


modo_nominatim = {"r": "calle"}


async def nominatim(route):
    q = parse_qs(urlparse(route.request.url).query)
    CONSULTAS.append(("nominatim", q.get("q", [""])[0]))
    if modo_nominatim["r"] == "calle":
        body = [{"lat": "3.4408", "lon": "-76.5363", "category": "highway", "type": "residential"}]
    else:
        body = []
    await route.fulfill(headers=CORS, body=json.dumps(body))


async def main():
    srv = Servidor()
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path="/usr/bin/google-chrome", args=["--no-sandbox"])
        ctx = await b.new_context(viewport={"width": 390, "height": 844}, geolocation={"latitude": 3.36, "longitude": -76.53}, permissions=["geolocation"])
        await ctx.add_init_script(APP)
        await srv.conectar(ctx)
        await ctx.route("https://photon.komoot.io/**", photon)
        await ctx.route("https://nominatim.openstreetmap.org/**", nominatim)
        pg = await ctx.new_page()
        errores = []
        pg.on("pageerror", lambda e: errores.append(str(e)))

        # Cuenta de cliente en Cali
        await pg.goto(B + "#/registro")
        await pg.fill("#f-nombre", "Ana Gómez")
        await pg.click("[data-selector-ciudad=f-ciudad]")
        await pg.fill(".selector-buscar input", "Cali")
        await pg.press(".selector-buscar input", "Enter")
        await pg.fill("#f-correo", "ana@correo.com")
        await pg.fill("#f-telefono", "3001234567")
        await pg.fill("#f-clave", "Sol-desierto7")
        await pg.fill("#f-clave2", "Sol-desierto7")
        await pg.click("button[type=submit]")
        await pg.wait_for_timeout(1500)

        async def ir_a_direccion():
            await pg.goto(B + "#/inicio")
            await pg.wait_for_selector("[data-cat=cerrajero]")
            await pg.click("[data-cat=cerrajero]")
            await pg.fill("textarea", "Se dañó la chapa")
            await pg.click("[data-accion=continuar]")
            await pg.wait_for_timeout(300)
            if await pg.locator("[name=dir][value=nueva]").count():
                await pg.check("[name=dir][value=nueva]", force=True)

        print("1. Escribe 'jardin plaza' y elige la sugerencia")
        await ir_a_direccion()
        await pg.fill("#f-direccion", "")
        await pg.type("#f-direccion", "jardin plaza", delay=30)
        await pg.wait_for_selector(".dir-op", timeout=4000)
        ops = await pg.locator(".dir-op b").all_inner_texts()
        revisar(ops == ["Jardín Plaza"], f"solo sugiere el de Cali ({ops})")
        revisar(any(c[0] == "photon" and "Cali" in c[1] for c in CONSULTAS), "la búsqueda incluye la ciudad")
        await pg.screenshot(path="/home/claude/dir_sugerencias.png")
        await pg.locator(".dir-op").first.dispatch_event("pointerdown")
        await pg.wait_for_timeout(200)
        revisar((await pg.input_value("#f-direccion")).startswith("Jardín Plaza"), "pone el nombre en el campo")
        revisar("Ubicada" in await pg.inner_text(".dir-punto"), "muestra que quedó ubicada")
        await pg.click("[data-accion=continuar]")
        await pg.wait_for_timeout(500)
        d = await pg.evaluate("JSON.parse(localStorage.getItem(Object.keys(localStorage).find(k=>k.endsWith(':borrador'))||'null')||sessionStorage.getItem('camello:borrador')||'null')")
        coords = (d or {}).get("direccion", {}).get("coords", {})
        revisar(abs(coords.get("lat", 0) - JARDIN[0]) < 1e-4 and abs(coords.get("lng", 0) - JARDIN[1]) < 1e-4, f"el pedido queda en el punto exacto de Jardín Plaza ({coords})")

        print("2. Escribe una dirección sin elegir: se busca y se confirma en el mapa")
        await ir_a_direccion()
        await pg.fill("#f-direccion", "Calle 5 # 38-20")
        await pg.click("[data-accion=continuar]")
        await pg.wait_for_selector(".elegir-pantalla", timeout=5000)
        revisar(any(c[0] == "nominatim" and c[1].startswith("Calle 5 38-20") for c in CONSULTAS), "limpia la dirección para buscarla (sin '#')")
        revisar("Encontramos la zona" in await pg.inner_text(".elegir-hoja h2"), "pide mover el pin a la puerta")
        await pg.wait_for_timeout(900)
        revisar("Calle 16" in await pg.inner_text(".elegir-cerca"), "muestra la dirección cerca del pin")
        await pg.screenshot(path="/home/claude/dir_mapa.png")
        caja = await pg.locator(".elegir-mapa").bounding_box()
        cx, cy = caja["x"] + caja["width"] / 2, caja["y"] + caja["height"] / 2
        await pg.mouse.move(cx, cy)
        await pg.mouse.down()
        await pg.mouse.move(cx - 80, cy - 40, steps=8)
        await pg.mouse.up()
        await pg.click("[data-confirmar]")
        await pg.wait_for_timeout(500)
        d = await pg.evaluate("JSON.parse(localStorage.getItem(Object.keys(localStorage).find(k=>k.endsWith(':borrador'))))")
        c2 = d["direccion"]["coords"]
        revisar(c2["fuente"] == "mapa" and c2["lng"] > -76.5363 and c2["lat"] < 3.4408, f"queda el punto que la persona movió ({c2})")
        revisar("cuándo" in (await pg.inner_text("main")).lower(), "pasa al siguiente paso")

        print("3. Dirección que no existe: se marca en el mapa desde el centro de la ciudad")
        modo_nominatim["r"] = "nada"
        await ir_a_direccion()
        await pg.fill("#f-direccion", "Manzana 99 casa 100 barrio inventado")
        await pg.click("[data-accion=continuar]")
        await pg.wait_for_selector(".elegir-pantalla", timeout=5000)
        revisar("Marca el lugar" in await pg.inner_text(".elegir-hoja h2"), "dice que no la encontró y pide marcarla")
        await pg.click("[data-cancelar]")
        await pg.wait_for_timeout(300)
        revisar(await pg.locator("#f-direccion").count() == 1, "si cancela, se queda en el paso de dirección")

        print("4. GPS: escribe la dirección real")
        await pg.click("[data-accion=gps]")
        await pg.wait_for_timeout(900)
        revisar((await pg.input_value("#f-direccion")).startswith("Calle 16 100-20"), f"llena la dirección ({await pg.input_value('#f-direccion')})")
        revisar("con tu GPS" in await pg.inner_text(".dir-punto"), "queda ubicada con el GPS")

        print("5. Casa guardada con su punto")
        await pg.goto(B + "#/lugares/casa")
        await pg.wait_for_selector("#f-direccion")
        await pg.type("#f-direccion", "jardin", delay=30)
        await pg.wait_for_selector(".dir-op")
        await pg.locator(".dir-op").first.dispatch_event("pointerdown")
        await pg.click("button[type=submit]")
        await pg.wait_for_timeout(1200)
        casa = next((x["datos"].get("lugares", {}).get("casa") for x in srv.t["privado"]), None)
        revisar(bool(casa and casa.get("coords", {}).get("fuente") == "busqueda"), f"Casa se guarda con el punto real ({casa})")

        print("Errores:", errores, srv.errores)
        await b.close()
    print("\nRESULTADO:", "TODO BIEN" if not FALLAS else f"{len(FALLAS)} fallas")


asyncio.run(main())
