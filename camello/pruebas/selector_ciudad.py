import asyncio, json
from playwright.async_api import async_playwright
B="http://localhost:8765/camello/"
SIM="""const mm=window.matchMedia.bind(window);window.matchMedia=(q)=>q.includes('display-mode: standalone')?{matches:true,media:q,addEventListener(){},removeEventListener(){}}:mm(q);"""
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(executable_path="/usr/bin/google-chrome",args=["--no-sandbox"])
    ctx=await b.new_context(viewport={"width":390,"height":844},geolocation={"latitude":3.41,"longitude":-76.35},permissions=["geolocation"]); await ctx.add_init_script(SIM)
    pg=await ctx.new_page(); errs=[]; pg.on("pageerror",lambda e:errs.append(str(e)))
    await pg.goto(B+"#/registro"); await pg.wait_for_selector("[data-selector-ciudad]")
    print("campo:", (await pg.inner_text("[data-selector-ciudad]")).strip())
    await pg.click("button[type=submit]"); await pg.wait_for_timeout(300)
    print("sin elegir ->", await pg.inner_text("#e-ciudad"), "| enfocado:", await pg.evaluate("document.activeElement.dataset.selectorCiudad"))
    await pg.click("[data-selector-ciudad]"); await pg.wait_for_selector(".selector-pantalla")
    print("abre buscador, teclado en el buscador:", await pg.evaluate("document.activeElement.type"), "| ciudades en lista:", await pg.locator(".selector-opcion").count())
    await pg.screenshot(path="/home/claude/sel1.png")
    async def buscar(t):
        await pg.fill(".selector-buscar input", t); await pg.wait_for_timeout(100)
        r=[x.split("\n")[0] for x in await pg.locator(".selector-opcion").all_inner_texts()]
        v=await pg.locator(".selector-vacio").count()
        return r[:5] if r else ("VACÍO" if v else [])
    for t in ["bogo","medellin","MEDELLÍN","valle","candela","san","santa marta","zzz"]:
        print(f"  '{t}' ->", await buscar(t))
    await pg.fill(".selector-buscar input","candela"); await pg.wait_for_timeout(100)
    await pg.screenshot(path="/home/claude/sel2.png")
    await pg.press(".selector-buscar input","Enter"); await pg.wait_for_timeout(300)
    print("Enter elige ->", (await pg.inner_text("[data-selector-ciudad]")).strip().replace("\n"," "), "| valor:", await pg.input_value("#f-ciudad"), "| error borrado:", repr(await pg.inner_text("#e-ciudad")))
    await pg.click("[data-selector-ciudad]"); await pg.wait_for_timeout(200)
    print("marcada la actual:", await pg.locator(".selector-opcion.actual").inner_text())
    await pg.keyboard.press("Escape"); await pg.wait_for_timeout(200)
    print("Escape cierra sin cambiar:", await pg.locator(".selector-pantalla").count()==0, await pg.input_value("#f-ciudad"))
    await pg.click("[data-selector-ciudad]"); await pg.wait_for_timeout(200)
    await pg.click(".selector-opcion >> text=Pasto"); await pg.wait_for_timeout(200)
    print("toque elige ->", await pg.input_value("#f-ciudad"))
    await pg.click("[data-selector-ciudad]"); await pg.wait_for_timeout(200)
    await pg.click(".selector-gps"); await pg.wait_for_timeout(800)
    print("GPS en Candelaria ->", await pg.input_value("#f-ciudad"))
    await pg.screenshot(path="/home/claude/sel3.png")
    print("ERRORES:",errs)
    await b.close()
asyncio.run(main())
