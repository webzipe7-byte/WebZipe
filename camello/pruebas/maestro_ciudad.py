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
    ctx=await b.new_context(viewport={"width":390,"height":844}); await ctx.add_init_script(SIM)
    await ctx.route("https://sqjjxpxbqtwsejgjfojq.supabase.co/**",ruta)
    db["perfiles"].append({"id":U,"nombre":"Pedro Ruiz","rol":"trabajador","categoria":"plomero","anios":4,"conectado":False,"calificaciones":0,"calificacion_suma":0,"trabajos":0,"ciudad":None})
    db["privado"].append({"id":U,"telefono":"300","datos":{}})
    pg=await ctx.new_page(); errs=[]; pg.on("pageerror",lambda e:errs.append(str(e)))
    await pg.goto("http://localhost:8765/")
    await pg.evaluate("s=>localStorage.setItem('camello:nube',s)", json.dumps({"access_token":"a","refresh_token":"r","expires_at":9999999999,"user":{"id":U,"email":"p@x.com","meta":{}}}))
    await pg.goto(B+"#/maestro"); await pg.wait_for_timeout(2000)
    print("pide ciudad:", await pg.locator(".pedir-ciudad").count(), "| botón conectar oculto:", await pg.locator(".conexion").is_hidden())
    await pg.click("[data-selector-ciudad=f-ciudad-maestro]"); await pg.fill(".selector-buscar input","Barranquilla"); await pg.press(".selector-buscar input","Enter"); await pg.wait_for_timeout(200); await pg.wait_for_timeout(800)
    print("después:", await pg.inner_text(".maestro-cabeza p"), "| conectar visible:", await pg.locator(".conexion").is_visible(), "| en servidor:", [x.get("ciudad") for x in db["perfiles"] if x["id"]==U])
    await pg.screenshot(path="/home/claude/maestro_ciudad.png")
    print("ERRORES:",errs)
    await b.close()
asyncio.run(main())
