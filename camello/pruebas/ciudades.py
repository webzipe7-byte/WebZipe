import asyncio, json, re, time
from urllib.parse import unquote
from playwright.async_api import async_playwright
B="http://localhost:8765/camello/"
SIM="""const mm=window.matchMedia.bind(window);window.matchMedia=(q)=>q.includes('display-mode: standalone')?{matches:true,media:q,addEventListener(){},removeEventListener(){}}:mm(q);"""
U="11111111-2222-3333-4444-555555555555"
MB="99999999-2222-3333-4444-00000000000b"; MM="99999999-2222-3333-4444-00000000000d"
base={"conectado":True,"calificaciones":0,"calificacion_suma":0,"trabajos":0,"rol":"trabajador","categoria":"cerrajero","anios":5}
db={"perfiles":[{**base,"id":MB,"nombre":"Luis Bogotano","ciudad":"bogota"},{**base,"id":MM,"nombre":"Juan Paisa","ciudad":"medellin"}],"privado":[]}
consultas=[]; creados=[]
def filtra(rows,q):
    for k,v in re.findall(r"(\w+)=(eq|in)\.([^&]+)",q) if False else []: pass
    for m in re.finditer(r"(?:^|&)(\w+)=eq\.([^&]+)",q):
        k,v=m.group(1),unquote(m.group(2))
        if k in ("select","order","limit","or"): continue
        rows=[r for r in rows if str(r.get(k)).lower()==v.lower()]
    return rows
async def ruta(route):
    r=route.request; u=r.url; h={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"*","Access-Control-Allow-Methods":"*","Content-Type":"application/json"}
    if r.method=="OPTIONS": return await route.fulfill(status=200,headers=h,body="")
    if "/auth/v1/signup" in u:
        meta=json.loads(r.post_data)["data"]; creados.append(meta)
        return await route.fulfill(status=200,headers=h,body=json.dumps({"access_token":"a","refresh_token":"r","expires_in":3600,"user":{"id":U,"email":"ana@correo.com","user_metadata":meta}}))
    m=re.search(r"/rest/v1/(\w+)\??(.*)",u)
    if m:
        t,q=m.group(1),m.group(2)
        if r.method=="GET":
            if t=="perfiles": consultas.append(unquote(q))
            rows=db.get(t,[])
            if t=="perfiles" and "or=" in q: rows=[x for x in rows if x["id"]==U]
            else: rows=filtra(rows,q)
            return await route.fulfill(status=200,headers=h,body=json.dumps(rows))
        if r.method=="POST":
            fila=json.loads(r.post_data)
            if t=="perfiles": fila={**{"calificaciones":0,"calificacion_suma":0,"trabajos":0,"conectado":False},**fila}
            db.setdefault(t,[]).append(fila); return await route.fulfill(status=201,headers=h,body=json.dumps([fila]))
        if r.method=="PATCH":
            cambios=json.loads(r.post_data)
            for x in db["perfiles"]:
                if x["id"]==U: x.update(cambios)
            return await route.fulfill(status=204,headers=h,body="")
    return await route.fulfill(status=200,headers=h,body="[]")
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(executable_path="/usr/bin/google-chrome",args=["--no-sandbox"])
    ctx=await b.new_context(viewport={"width":390,"height":844},geolocation={"latitude":6.25,"longitude":-75.57},permissions=["geolocation"]); await ctx.add_init_script(SIM)
    await ctx.route("https://sqjjxpxbqtwsejgjfojq.supabase.co/**",ruta)
    pg=await ctx.new_page(); errs=[]; pg.on("pageerror",lambda e:errs.append(str(e)))
    await pg.goto(B+"#/registro"); await pg.wait_for_timeout(500)
    await pg.fill("#f-nombre","Ana Gómez"); await pg.fill("#f-correo","ana@correo.com"); await pg.fill("#f-telefono","3001234567")
    await pg.fill("#f-clave","Sol-desierto7"); await pg.fill("#f-clave2","Sol-desierto7"); await pg.click("button[type=submit]"); await pg.wait_for_timeout(600)
    print("sin ciudad ->", await pg.inner_text("#e-ciudad"))
    print("opciones de ciudad:", await pg.locator("#f-ciudad option").count())
    await pg.select_option("#f-ciudad","bogota"); await pg.click("button[type=submit]"); await pg.wait_for_timeout(1500)
    print("registro meta:",creados[-1].get("ciudad"),"| perfil:",[x.get("ciudad") for x in db["perfiles"] if x["id"]==U], "| pantalla:", pg.url.split('#')[1])
    await pg.click("[data-cat=cerrajero]"); await pg.fill("textarea","Se dañó la chapa"); await pg.click("[data-accion=continuar]"); await pg.wait_for_timeout(500)
    print("ciudad propuesta:", await pg.input_value("#f-ciudad"))
    await pg.fill("#f-direccion","Carrera 7 # 72-10"); await pg.click("[data-accion=continuar]"); await pg.wait_for_timeout(400)
    await pg.click("[data-accion=continuar]"); await pg.wait_for_timeout(1800)
    print("Bogotá ->", [t.split("\n")[0] for t in await pg.locator(".trabajador b").all_inner_texts()])
    # cambiar a Medellín con GPS
    await pg.click("[data-accion=atras]"); await pg.wait_for_timeout(300); await pg.click("[data-accion=atras]"); await pg.wait_for_timeout(400)
    await pg.click("[data-accion=gps]"); await pg.wait_for_timeout(800)
    print("GPS en Medellín -> ciudad:", await pg.input_value("#f-ciudad"))
    await pg.click("[data-accion=continuar]"); await pg.wait_for_timeout(400); await pg.click("[data-accion=continuar]"); await pg.wait_for_timeout(1800)
    print("Medellín ->", [t.split("\n")[0] for t in await pg.locator(".trabajador b").all_inner_texts()], "| perfil ciudad ahora:",[x.get("ciudad") for x in db["perfiles"] if x["id"]==U])
    print("consulta al servidor:", [c for c in consultas if "categoria" in c][-1])
    await pg.screenshot(path="/home/claude/ciudad.png")
    print("ERRORES:",errs)
    await b.close()
asyncio.run(main())
